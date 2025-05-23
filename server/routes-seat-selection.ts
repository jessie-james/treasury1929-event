import { type Express } from "express";
import { PgStorage } from "./storage";

export function registerSeatSelectionRoutes(app: Express): void {
  const storage = new PgStorage();

  // Get venue layout by event ID for seat selection
  app.get("/api/venue-layout", async (req, res) => {
    try {
      console.log("[VENUE-LAYOUT] API called with eventId:", req.query.eventId);
      const eventId = req.query.eventId;
      if (!eventId) {
        return res.status(400).json({ message: "Event ID is required" });
      }

      const events = await storage.getAllEvents();
      const event = events.find((e: any) => e.id === parseInt(eventId as string));
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Get venue layout
      const venueId = event.venueId;
      const venues = await storage.getVenues();
      const venue = venues.find(v => v.id === venueId);
      
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }

      // Get tables and stages for this venue
      const tables = await storage.getTables();
      const venueTables = tables.filter((t: any) => t.venue_id === venueId || t.venueId === venueId);
      const stages = await storage.getStage(venueId);
      const venueStages = stages ? [stages] : [];

      console.log(`[SEAT-SELECTION] Event ${eventId}, Venue ${venueId}:`);
      console.log(`[SEAT-SELECTION] Total tables in DB: ${tables.length}`);
      console.log(`[SEAT-SELECTION] Tables for this venue: ${venueTables.length}`);
      if (venueTables.length > 0) {
        console.log(`[SEAT-SELECTION] Sample table:`, venueTables[0]);
      }
      
      // Transform tables to match expected frontend format
      const transformedTables = venueTables.map((table: any) => ({
        id: table.id,
        tableNumber: table.table_number,
        capacity: table.capacity,
        x: table.x,
        y: table.y,
        width: table.width,
        height: table.height,
        shape: table.shape,
        status: table.status || 'available',
        venueId: table.venue_id || table.venueId
      }));

      const venueLayout = {
        venue: venue,
        tables: transformedTables || [],
        stages: venueStages || []
      };

      res.json(venueLayout);
    } catch (error) {
      console.error("Error fetching venue layout:", error);
      res.status(500).json({ message: "Failed to fetch venue layout" });
    }
  });

  // Get event bookings to filter available tables
  app.get("/api/event-bookings", async (req, res) => {
    try {
      const eventId = req.query.eventId;
      if (!eventId) {
        return res.status(400).json({ message: "Event ID is required" });
      }

      const bookings = await storage.getBookingsByEventId(parseInt(eventId as string));
      res.json(bookings || []);
    } catch (error) {
      console.error("Error fetching event bookings:", error);
      res.status(500).json({ message: "Failed to fetch event bookings" });
    }
  });
}