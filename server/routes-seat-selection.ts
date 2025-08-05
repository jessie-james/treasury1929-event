import { type Express } from "express";
import { PgStorage } from "./storage";

export function registerSeatSelectionRoutes(app: Express): void {
  const storage = new PgStorage();

  // Debug endpoint to test route registration
  app.get("/api/venue-layout-test", (req, res) => {
    res.json({ message: "Venue layout routes are working!", timestamp: new Date().toISOString() });
  });

  // CRITICAL: Venue layout endpoint with real-time booking status
  app.get("/api/venues/:venueId/layout", async (req, res) => {
    try {
      const venueId = parseInt(req.params.venueId);
      const eventId = req.query.eventId ? parseInt(req.query.eventId as string) : undefined;
      
      console.log(`🚨 CRITICAL VENUE LAYOUT REQUEST for venue ${venueId}, event ${eventId}`);
      
      if (isNaN(venueId)) {
        return res.status(400).json({ error: "Invalid venue ID" });
      }

      // Get venue details
      const venue = await storage.getVenueById(venueId);
      if (!venue) {
        return res.status(404).json({ error: "Venue not found" });
      }

      // CRITICAL FIX: Get tables with real-time booking status
      const tables = await storage.getTablesByVenue(venueId, eventId);
      
      console.log(`🔍 TABLE STATUS VERIFICATION - Event ${eventId}:`);
      tables.filter(t => [11, 16].includes(t.tableNumber)).forEach(t => {
        console.log(`   Table ${t.tableNumber}: ${t.status}`);
      });
      
      // Get stages for this venue (if any)
      const stages = await storage.getStagesByVenue(venueId);

      const layout = {
        venue: {
          id: venue.id,
          name: venue.name,
          width: venue.width || 800,
          height: venue.height || 600
        },
        tables: tables.map(table => ({
          id: table.id,
          tableNumber: table.tableNumber,
          x: table.x,
          y: table.y,
          width: table.width,
          height: table.height,
          capacity: table.capacity,
          shape: table.shape,
          rotation: table.rotation,
          status: table.status // CRITICAL: Use real-time calculated status, not hardcoded 'available'
        })),
        stages: stages.map(stage => ({
          id: stage.id,
          x: stage.x,
          y: stage.y,
          width: stage.width,
          height: stage.height,
          rotation: stage.rotation
        }))
      };

      res.json(layout);
    } catch (error) {
      console.error("Error fetching venue layout:", error);
      res.status(500).json({ error: "Failed to fetch venue layout" });
    }
  });

}