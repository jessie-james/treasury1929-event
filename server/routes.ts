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

  // Broadcast updates to all connected clients
  const broadcastAvailability = async (eventId: number) => {
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
  };

  app.get("/api/events", async (_req, res) => {
    const events = await storage.getEvents();
    res.json(events);
  });

  app.get("/api/events/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const event = await storage.getEvent(id);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }
    res.json(event);
  });

  app.get("/api/tables", async (_req, res) => {
    const tables = await storage.getTables();
    res.json(tables);
  });

  app.get("/api/tables/:tableId/seats", async (req, res) => {
    const tableId = parseInt(req.params.tableId);
    const seats = await storage.getTableSeats(tableId);
    res.json(seats);
  });

  app.get("/api/food-options", async (_req, res) => {
    const options = await storage.getFoodOptions();
    res.json(options);
  });

  app.get("/api/bookings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const bookings = await storage.getBookings();
    res.json(bookings);
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const booking = insertBookingSchema.parse(req.body);
      const created = await storage.createBooking(booking);
      await storage.updateEventAvailability(
        booking.eventId,
        booking.seatNumbers.length
      );
      // Broadcast the update to all clients
      await broadcastAvailability(booking.eventId);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid booking data" });
        return;
      }
      throw error;
    }
  });

  return httpServer;
}