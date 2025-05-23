import { type Express } from "express";
import { PgStorage } from "./storage";

export function registerSeatSelectionRoutes(app: Express): void {
  const storage = new PgStorage();

  // Debug endpoint to test route registration
  app.get("/api/venue-layout-test", (req, res) => {
    res.json({ message: "Venue layout routes are working!", timestamp: new Date().toISOString() });
  });

  // Venue layout endpoint for seat selection
  app.get("/api/venues/:venueId/layout", async (req, res) => {
    try {
      const venueId = parseInt(req.params.venueId);
      
      if (isNaN(venueId)) {
        return res.status(400).json({ error: "Invalid venue ID" });
      }

      // Get venue details
      const venue = await storage.getVenueById(venueId);
      if (!venue) {
        return res.status(404).json({ error: "Venue not found" });
      }

      // Get tables for this venue
      const tables = await storage.getTablesByVenue(venueId);
      
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
          status: 'available' // Default status for seat selection
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