import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertBookingSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth } from "./auth";

const clients = new Set<WebSocket>();

export async function registerRoutes(app: Express) {
  // Set up authentication
  setupAuth(app);

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    clients.add(ws);

    ws.on('close', () => {
      clients.delete(ws);
    });
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

  return httpServer;
}