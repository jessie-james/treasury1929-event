import express, { type Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertBookingSchema, bookings, events } from "@shared/schema";
import { z } from "zod";
import { setupAuth } from "./auth";
import Stripe from "stripe";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "./db";

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

// Helper function to reset test data
async function clearAllBookings() {
  try {
    // Clear all bookings
    await db.delete(bookings);
    
    // Reset event available seats to total seats
    const allEvents = await db.select().from(events);
    for (const event of allEvents) {
      await db.update(events)
        .set({ availableSeats: event.totalSeats })
        .where(eq(events.id, event.id));
    }
    
    return { success: true, message: "All bookings cleared and event seats reset" };
  } catch (error) {
    console.error("Error clearing bookings:", error);
    return { success: false, message: "Failed to clear bookings" };
  }
}

// Validation schemas for reordering requests
const updateEventsOrderSchema = z.object({
  orderedIds: z.array(z.number())
});

const updateFoodOptionsOrderSchema = z.object({
  orderedIds: z.array(z.number())
});

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

      // Ensure date is properly formatted as a Date object
      let formattedDate;
      try {
        // Check if date is a string representation
        if (typeof req.body.date === 'string') {
          formattedDate = new Date(req.body.date);
          // Validate that the date was parsed correctly
          if (isNaN(formattedDate.getTime())) {
            throw new Error("Invalid date format");
          }
        } else {
          // If it's not a string, try to use it directly
          formattedDate = new Date(req.body.date);
        }
      } catch (dateError) {
        console.error("Date conversion error:", dateError);
        return res.status(400).json({
          message: "Invalid date format",
          error: String(dateError)
        });
      }

      console.log("Creating event with data:", {
        ...req.body,
        date: formattedDate.toISOString()
      });
      
      const event = await storage.createEvent({
        ...req.body,
        date: formattedDate,
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
      
      // Handle date formatting if it's being updated
      let updateData = { ...req.body };
      
      if (req.body.date) {
        try {
          // Convert string date to Date object
          const formattedDate = new Date(req.body.date);
          
          // Validate date
          if (isNaN(formattedDate.getTime())) {
            throw new Error("Invalid date format");
          }
          
          // Update with proper Date object
          updateData.date = formattedDate;
          
        } catch (dateError) {
          console.error("Date conversion error during update:", dateError);
          return res.status(400).json({
            message: "Invalid date format",
            error: String(dateError)
          });
        }
      }

      console.log("Updating event with data:", updateData);
      const event = await storage.updateEvent(id, updateData);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      console.log("Event updated successfully:", event);
      res.json(event);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ 
        message: "Failed to update event",
        error: error instanceof Error ? error.message : String(error)
      });
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
      // Get events ordered by display_order by default
      const events = await storage.getEventsByDisplayOrder();
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
      // Get food options ordered by display_order by default
      const options = await storage.getFoodOptionsByDisplayOrder();
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
  
  // Admin route to clear all bookings (for testing purposes)
  app.post("/api/clear-bookings", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(401).json({ message: "Unauthorized: Admin access required" });
      }
      
      const result = await clearAllBookings();
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error("Error clearing bookings:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to clear bookings",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Route to update the order of events
  app.post("/api/events/order", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role === "customer") {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const validationResult = updateEventsOrderSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: validationResult.error.format()
        });
      }
      
      const { orderedIds } = validationResult.data;
      await storage.updateEventsOrder(orderedIds);
      
      res.status(200).json({ success: true, message: "Events order updated successfully" });
    } catch (error) {
      console.error("Error updating events order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update events order",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Route to update the order of food options
  app.post("/api/food-options/order", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role === "customer") {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const validationResult = updateFoodOptionsOrderSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: validationResult.error.format()
        });
      }
      
      const { orderedIds } = validationResult.data;
      await storage.updateFoodOptionsOrder(orderedIds);
      
      res.status(200).json({ success: true, message: "Food options order updated successfully" });
    } catch (error) {
      console.error("Error updating food options order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update food options order",
        error: error instanceof Error ? error.message : String(error)
      });
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

      console.log("Creating booking with data:", JSON.stringify(req.body, null, 2));
      
      try {
        // Get the actual database fields to avoid trying to insert non-existent fields
        const bookingData = {
          eventId: req.body.eventId,
          userId: req.body.userId,
          tableId: req.body.tableId,
          seatNumbers: req.body.seatNumbers,
          foodSelections: req.body.foodSelections,
          guestNames: req.body.guestNames,
          customerEmail: req.body.customerEmail,
          stripePaymentId: req.body.stripePaymentId
        };
        
        var booking = insertBookingSchema.parse(bookingData);
      } catch (zodError) {
        if (zodError instanceof z.ZodError) {
          console.error("Validation error:", zodError.errors);
          return res.status(400).json({ 
            message: "Invalid booking data", 
            errors: zodError.errors
          });
        }
        throw zodError;
      }

      // First check if the event has enough seats
      const event = await storage.getEvent(booking.eventId);
      if (!event) {
        console.log(`Event not found: ${booking.eventId}`);
        return res.status(404).json({ message: "Event not found" });
      }

      console.log(`Event available seats: ${event.availableSeats}, requested: ${booking.seatNumbers.length}`);
      if (event.availableSeats < booking.seatNumbers.length) {
        return res.status(400).json({ 
          message: "Not enough available seats for this booking" 
        });
      }

      // Then check if all selected seats are available
      const seats = await storage.getTableSeats(booking.tableId);
      console.log(`Found ${seats.length} seats for table ${booking.tableId}`);
      
      const seatBookings = await storage.getTableSeatsAvailability(booking.tableId, booking.eventId);
      console.log(`Current seat bookings for table ${booking.tableId}, event ${booking.eventId}:`, 
        JSON.stringify(seatBookings, null, 2));

      // Filter out seats that are already booked
      const selectedSeats = seats.filter(
        seat => booking.seatNumbers.includes(seat.seatNumber)
      );

      console.log(`Selected seats found: ${selectedSeats.length}, requested: ${booking.seatNumbers.length}`);
      if (selectedSeats.length !== booking.seatNumbers.length) {
        return res.status(400).json({ 
          message: "One or more selected seats not found" 
        });
      }

      const bookedSeats = seatBookings.filter(sb => sb.isBooked);
      console.log(`Booked seats count: ${bookedSeats.length}`);
      
      const unavailableSeats = selectedSeats.filter(seat => 
        bookedSeats.some(bs => bs.seatId === seat.id)
      );
      
      if (unavailableSeats.length > 0) {
        console.log(`Found unavailable seats: ${unavailableSeats.map(s => s.seatNumber).join(', ')}`);
        return res.status(400).json({ 
          message: `These seats are not available: ${unavailableSeats.map(s => s.seatNumber).join(', ')}` 
        });
      }

      console.log("Creating booking in database...");
      try {
        const created = await storage.createBooking(booking);
        console.log("Booking created:", JSON.stringify(created, null, 2));

        console.log("Updating event availability...");
        await storage.updateEventAvailability(
          booking.eventId,
          booking.seatNumbers.length
        );
        console.log("Event availability updated");

        // Broadcast the update to all clients
        await broadcastAvailability(booking.eventId);

        res.status(201).json(created);
      } catch (dbError) {
        console.error("Database error during booking creation:", dbError);
        res.status(500).json({
          message: "Database error during booking creation",
          error: dbError instanceof Error ? dbError.message : String(dbError)
        });
      }
    } catch (error) {
      console.error("Unexpected error creating booking:", error);
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
  
  // BOOKING MANAGEMENT ENDPOINTS
  
  // Get detailed booking info
  app.get("/api/bookings/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !["admin", "venue_owner", "venue_manager"].includes(req.user?.role || "")) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }
      
      const booking = await storage.getBookingWithDetails(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      res.json(booking);
    } catch (error) {
      console.error("Error fetching booking details:", error);
      res.status(500).json({ 
        message: "Failed to fetch booking details",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Update booking (generic updates)
  app.patch("/api/bookings/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !["admin", "venue_owner", "venue_manager"].includes(req.user?.role || "")) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }
      
      const updates = req.body;
      const updatedBooking = await storage.updateBooking(bookingId, updates, req.user.id);
      
      if (!updatedBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      res.json(updatedBooking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ 
        message: "Failed to update booking",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Change booking seats
  app.post("/api/bookings/:id/change-seats", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !["admin", "venue_owner", "venue_manager"].includes(req.user?.role || "")) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }
      
      const { tableId, seatNumbers } = req.body;
      
      if (!tableId || !seatNumbers || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
        return res.status(400).json({ message: "Invalid request body. Required: tableId and seatNumbers array" });
      }
      
      // Check if the new seats are available
      const seats = await storage.getTableSeats(tableId);
      const seatBookings = await storage.getTableSeatsAvailability(tableId, req.body.eventId);
      
      // Filter out seats that are already booked
      const selectedSeats = seats.filter(seat => seatNumbers.includes(seat.seatNumber));
      
      if (selectedSeats.length !== seatNumbers.length) {
        return res.status(400).json({ message: "One or more selected seats not found" });
      }
      
      const bookedSeats = seatBookings.filter(sb => sb.isBooked);
      if (selectedSeats.some(seat => bookedSeats.some(bs => bs.seatId === seat.id))) {
        return res.status(400).json({ message: "One or more selected seats are not available" });
      }
      
      const updatedBooking = await storage.changeBookingSeats(
        bookingId,
        tableId,
        seatNumbers,
        req.user.id
      );
      
      if (!updatedBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      res.json(updatedBooking);
    } catch (error) {
      console.error("Error changing booking seats:", error);
      res.status(500).json({ 
        message: "Failed to change booking seats",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Update food selections
  app.post("/api/bookings/:id/change-food", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !["admin", "venue_owner", "venue_manager"].includes(req.user?.role || "")) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }
      
      const { foodSelections } = req.body;
      
      if (!foodSelections || typeof foodSelections !== 'object') {
        return res.status(400).json({ message: "Invalid request body. Required: foodSelections object" });
      }
      
      const updatedBooking = await storage.updateBookingFoodSelections(
        bookingId,
        foodSelections,
        req.user.id
      );
      
      if (!updatedBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      res.json(updatedBooking);
    } catch (error) {
      console.error("Error updating food selections:", error);
      res.status(500).json({ 
        message: "Failed to update food selections",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Add a note to a booking
  app.post("/api/bookings/:id/add-note", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !["admin", "venue_owner", "venue_manager"].includes(req.user?.role || "")) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }
      
      const { note } = req.body;
      
      if (!note || typeof note !== 'string' || note.trim() === '') {
        return res.status(400).json({ message: "Invalid request body. Required: non-empty note" });
      }
      
      const updatedBooking = await storage.addBookingNote(
        bookingId,
        note,
        req.user.id
      );
      
      if (!updatedBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      res.json(updatedBooking);
    } catch (error) {
      console.error("Error adding booking note:", error);
      res.status(500).json({ 
        message: "Failed to add booking note",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Process a refund
  app.post("/api/bookings/:id/refund", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !["admin", "venue_owner"].includes(req.user?.role || "")) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }
      
      const { amount } = req.body;
      
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: "Invalid request body. Required: positive amount" });
      }
      
      // Get the booking to process refund
      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Process the refund with Stripe
      try {
        const refund = await stripe.refunds.create({
          payment_intent: booking.stripePaymentId,
          amount: Math.round(amount * 100), // Convert to cents
        });
        
        // Update booking record with refund info
        const updatedBooking = await storage.processRefund(
          bookingId,
          amount,
          refund.id,
          req.user.id
        );
        
        res.json(updatedBooking);
      } catch (stripeError: any) {
        console.error("Stripe refund error:", stripeError);
        return res.status(400).json({
          message: "Failed to process refund with Stripe",
          error: stripeError.message
        });
      }
    } catch (error) {
      console.error("Error processing refund:", error);
      res.status(500).json({ 
        message: "Failed to process refund",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Cancel a booking
  app.post("/api/bookings/:id/cancel", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !["admin", "venue_owner", "venue_manager"].includes(req.user?.role || "")) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }
      
      const updatedBooking = await storage.cancelBooking(bookingId, req.user.id);
      
      if (!updatedBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      res.json(updatedBooking);
    } catch (error) {
      console.error("Error canceling booking:", error);
      res.status(500).json({ 
        message: "Failed to cancel booking",
        error: error instanceof Error ? error.message : String(error) 
      });
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