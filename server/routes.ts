import express, { type Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertBookingSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth } from "./auth";
import Stripe from "stripe";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

// Initialize Stripe with the secret key
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY environment variable not set");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia", // Use the latest API version available
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage for handling file uploads
const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with original extension
    const uniqueFilename = `${randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

// Only allow specific image file types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Expanded list of common image MIME types
  const allowedMimeTypes = [
    'image/jpeg', 
    'image/jpg',  // Some browsers/systems might use this variant
    'image/pjpeg', // Progressive JPEG
    'image/png', 
    'image/gif', 
    'image/webp',
    'image/svg+xml', // SVG images
    'image/bmp'     // BMP images
  ];
  
  console.log(`Receiving file upload: ${file.originalname}, MIME type: ${file.mimetype}`);
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, GIF, WebP, SVG and BMP images are allowed.`);
    console.error(`File upload rejected: ${error.message}`);
    cb(error);
  }
};

const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter
});

const clients = new Set<WebSocket>();

export async function registerRoutes(app: Express) {
  // Set up authentication
  setupAuth(app);

  const httpServer = createServer(app);

  // Create WebSocket server after HTTP server but before routes
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws',
    perMessageDeflate: false // Disable compression for faster startup
  });

  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
  });

  // Test database connection
  app.get("/api/health", async (_req, res) => {
    try {
      await storage.getUser(1);
      res.json({ status: "healthy", database: "connected" });
    } catch (error) {
      console.error("Database health check failed:", error);
      res.status(500).json({ 
        status: "unhealthy", 
        database: "disconnected",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Broadcast updates to all connected clients
  const broadcastAvailability = async (eventId: number) => {
    try {
      const event = await storage.getEvent(eventId);
      if (!event) return;

      const message = JSON.stringify({
        type: 'availability_update',
        eventId: event.id,
        availableSeats: event.availableSeats
      });

      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    } catch (error) {
      console.error("Error broadcasting availability:", error);
    }
  };

  // Add new CRUD endpoints for events
  app.post("/api/events", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role === "customer") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log("Creating event with data:", req.body);
      const event = await storage.createEvent({
        ...req.body,
        totalSeats: Number(req.body.totalSeats),
        venueId: 1, // For now, hardcode to venue 1
      });
      console.log("Event created successfully:", event);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ 
        message: "Failed to create event",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/events/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role === "customer") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      const event = await storage.updateEvent(id, req.body);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role === "customer") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteEvent(id);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  app.get("/api/events", async (_req, res) => {
    try {
      const events = await storage.getEvents();
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getEvent(id);
      if (!event) {
        res.status(404).json({ message: "Event not found" });
        return;
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.get("/api/tables", async (_req, res) => {
    try {
      const tables = await storage.getTables();
      res.json(tables);
    } catch (error) {
      console.error("Error fetching tables:", error);
      res.status(500).json({ message: "Failed to fetch tables" });
    }
  });

  app.get("/api/tables/:tableId/seats", async (req, res) => {
    try {
      const tableId = parseInt(req.params.tableId);
      const eventId = parseInt(req.query.eventId as string);

      if (!eventId) {
        return res.status(400).json({ message: "eventId query parameter is required" });
      }

      const seats = await storage.getTableSeats(tableId);
      const seatBookings = await storage.getTableSeatsAvailability(tableId, eventId);

      // Combine seat information with availability
      const seatsWithAvailability = seats.map(seat => {
        const booking = seatBookings.find(b => b.seatId === seat.id);
        return {
          ...seat,
          isAvailable: !booking?.isBooked
        };
      });

      res.json(seatsWithAvailability);
    } catch (error) {
      console.error("Error fetching seats:", error);
      res.status(500).json({ message: "Failed to fetch seats" });
    }
  });

  app.get("/api/food-options", async (_req, res) => {
    try {
      const options = await storage.getFoodOptions();
      res.json(options);
    } catch (error) {
      console.error("Error fetching food options:", error);
      res.status(500).json({ message: "Failed to fetch food options" });
    }
  });

  app.get("/api/bookings", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const bookings = await storage.getBookings();
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });
  
  // Serve uploaded images
  app.use('/uploads', express.static(uploadsDir));
  
  // Custom error handler for multer upload errors
  const handleMulterError = (err: any, req: any, res: any, next: any) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      console.error("Multer upload error:", err);
      return res.status(400).json({
        message: "Image upload failed",
        error: err.message,
        code: err.code
      });
    } else if (err) {
      // A file filter error or other non-multer error
      console.error("Upload error:", err);
      return res.status(400).json({
        message: "Image upload failed",
        error: err.message
      });
    }
    next();
  };
  
  // Handle food image uploads with improved error handling
  app.post("/api/upload/food-image", (req, res, next) => {
    // Explicitly wrap multer to catch and handle any errors
    console.log("Starting food image upload request");
    
    upload.single('image')(req, res, function(err) {
      if (err) {
        console.error("Multer upload error in food image:", err);
        return handleMulterError(err, req, res, next);
      }
      console.log("Multer processed food image request successfully");
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role === "customer") {
        console.log("Unauthorized access to food image upload");
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      if (!req.file) {
        console.log("No food image file was received in the request");
        return res.status(400).json({ message: "No image file provided" });
      }
      
      console.log("Food image uploaded successfully:", {
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        originalname: req.file.originalname
      });
      
      // Return the path to the uploaded file
      const filePath = `/uploads/${req.file.filename}`;
      
      // Set appropriate content-type header to ensure JSON response
      res.setHeader('Content-Type', 'application/json');
      
      // Send response
      res.status(201).json({ 
        path: filePath,
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        success: true 
      });
    } catch (error) {
      console.error("Error uploading food image:", error);
      
      // Set appropriate content-type header to ensure JSON response
      res.setHeader('Content-Type', 'application/json');
      
      res.status(500).json({ 
        message: "Failed to upload image",
        error: error instanceof Error ? error.message : String(error),
        success: false
      });
    }
  });
  
  // Handle event image uploads with improved error handling
  app.post("/api/upload/event-image", (req, res, next) => {
    // Explicitly wrap multer to catch and handle any errors
    console.log("Starting event image upload request");
    
    upload.single('image')(req, res, function(err) {
      if (err) {
        console.error("Multer upload error in event image:", err);
        return handleMulterError(err, req, res, next);
      }
      console.log("Multer processed request successfully");
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role === "customer") {
        console.log("Unauthorized access to event image upload");
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      if (!req.file) {
        console.log("No file was received in the request");
        return res.status(400).json({ message: "No image file provided" });
      }
      
      console.log("Event image uploaded successfully:", {
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        originalname: req.file.originalname
      });
      
      // Return the path to the uploaded file
      const filePath = `/uploads/${req.file.filename}`;
      
      // Set appropriate content-type header to ensure JSON response
      res.setHeader('Content-Type', 'application/json');
      
      // Send response
      res.status(201).json({ 
        path: filePath,
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        success: true 
      });
    } catch (error) {
      console.error("Error uploading event image:", error);
      
      // Set appropriate content-type header to ensure JSON response
      res.setHeader('Content-Type', 'application/json');
      
      res.status(500).json({ 
        message: "Failed to upload image",
        error: error instanceof Error ? error.message : String(error),
        success: false
      });
    }
  });

  app.get("/api/user/bookings", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const allBookings = await storage.getBookingDetails();
      const userBookings = allBookings.filter(booking => booking.userId === req.user?.id);
      res.json(userBookings);
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      res.status(500).json({ message: "Failed to fetch user bookings" });
    }
  });

  // Add this route after the existing /api/users route
  app.get("/api/users", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get users and their bookings
      const users = await storage.getUsers();
      const allBookings = await storage.getBookingDetails();

      // Attach bookings to each user
      const usersWithBookings = users.map(user => ({
        ...user,
        bookings: allBookings.filter(booking => booking.userId === user.id)
      }));

      res.json(usersWithBookings);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/user/:userId/bookings", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = parseInt(req.params.userId);
      const allBookings = await storage.getBookingDetails();
      const userBookings = allBookings.filter(booking => booking.userId === userId);
      res.json(userBookings);
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      res.status(500).json({ message: "Failed to fetch user bookings" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log("Creating booking with data:", req.body);
      const booking = insertBookingSchema.parse(req.body);

      // First check if the event has enough seats
      const event = await storage.getEvent(booking.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (event.availableSeats < booking.seatNumbers.length) {
        return res.status(400).json({ 
          message: "Not enough available seats for this booking" 
        });
      }

      // Then check if all selected seats are available
      const seats = await storage.getTableSeats(booking.tableId);
      const seatBookings = await storage.getTableSeatsAvailability(booking.tableId, booking.eventId);

      // Filter out seats that are already booked
      const selectedSeats = seats.filter(
        seat => booking.seatNumbers.includes(seat.seatNumber)
      );

      if (selectedSeats.length !== booking.seatNumbers.length) {
        return res.status(400).json({ 
          message: "One or more selected seats not found" 
        });
      }

      const bookedSeats = seatBookings.filter(sb => sb.isBooked);
      if (selectedSeats.some(seat => 
        bookedSeats.some(bs => bs.seatId === seat.id)
      )) {
        return res.status(400).json({ 
          message: "One or more selected seats are not available" 
        });
      }

      console.log("Creating booking in database...");
      const created = await storage.createBooking(booking);
      console.log("Booking created:", created);

      console.log("Updating event availability...");
      await storage.updateEventAvailability(
        booking.eventId,
        booking.seatNumbers.length
      );
      console.log("Event availability updated");

      // Broadcast the update to all clients
      await broadcastAvailability(booking.eventId);

      res.status(201).json(created);
    } catch (error) {
      console.error("Error creating booking:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Invalid booking data",
          errors: error.errors 
        });
        return;
      }
      res.status(500).json({ 
        message: "Failed to create booking",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Add new endpoint for event food totals
  app.get("/api/events/:id/food-totals", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      const totals = await storage.getEventFoodTotals(eventId);
      res.json(totals);
    } catch (error) {
      console.error("Error fetching event food totals:", error);
      res.status(500).json({ message: "Failed to fetch food totals" });
    }
  });

  // Add these routes after the existing event routes
  app.post("/api/food-options", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role === "customer") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log("Creating food option with data:", req.body);
      const foodOption = await storage.createFoodOption(req.body);
      console.log("Food option created successfully:", foodOption);
      res.status(201).json(foodOption);
    } catch (error) {
      console.error("Error creating food option:", error);
      res.status(500).json({ 
        message: "Failed to create food option",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/food-options/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role === "customer") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      const foodOption = await storage.updateFoodOption(id, req.body);
      if (!foodOption) {
        return res.status(404).json({ message: "Food option not found" });
      }
      res.json(foodOption);
    } catch (error) {
      console.error("Error updating food option:", error);
      res.status(500).json({ message: "Failed to update food option" });
    }
  });

  app.delete("/api/food-options/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role === "customer") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteFoodOption(id);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error deleting food option:", error);
      res.status(500).json({ message: "Failed to delete food option" });
    }
  });

  // Stripe payment integration
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // For testing, we'll use a fixed amount (like $19.99 for each seat)
      // In production, you would calculate this based on event prices, food choices, etc.
      const { seatCount } = req.body;
      const unitPrice = 1999; // $19.99 in cents (Stripe uses cents as the base unit)
      const amount = unitPrice * (seatCount || 1);
      
      // Add metadata for tracking
      const metadata = {
        userId: req.user!.id.toString(),
        seats: seatCount || 1,
        timestamp: new Date().toISOString()
      };
      
      console.log(`Creating payment intent for amount: ${amount} cents, user: ${req.user!.id}`);
      
      // Create the payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        metadata,
        // Use automatic payment methods for simplicity in testing
        automatic_payment_methods: {
          enabled: true,
        },
      });
      
      // Return only the client secret to the client to complete the payment
      res.status(200).json({ 
        clientSecret: paymentIntent.client_secret,
        amount
      });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to create payment"
      });
    }
  });

  // Test endpoint for Stripe - use this to verify Stripe is connected correctly
  app.get("/api/stripe-test", async (_req, res) => {
    try {
      // Try to fetch something simple from Stripe to verify the connection
      await stripe.customers.list({ limit: 1 });
      
      res.json({ 
        success: true, 
        message: "Stripe connection successful"
      });
    } catch (error) {
      console.error("Stripe test failed:", error);
      res.status(500).json({ 
        success: false,
        message: "Stripe connection failed", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return httpServer;
}