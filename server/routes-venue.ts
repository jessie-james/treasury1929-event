import { Express, Request, Response } from "express";
import { storage } from "./storage.js";
import { db } from "./db.js";
import * as schema from "@shared/schema";
import { insertVenueSchema, insertStageSchema, insertTableSchema } from "@shared/schema";
import { z } from "zod";

/**
 * Register venue management routes
 */
export function registerVenueRoutes(app: Express): void {
  
  /**
   * Middleware to verify user is admin or venue owner
   */
  function requireAdminOrVenueOwner(req: Request, res: Response, next: Function) {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as any;
    if (user.role !== 'admin' && user.role !== 'venue_owner') {
      return res.status(403).json({ message: "Not authorized" });
    }

    next();
  }
  
  // Get all venues
  app.get("/api/admin/venues", requireAdminOrVenueOwner, async (req: Request, res: Response) => {
    try {
      const venues = await storage.getAllVenues();
      res.json(venues);
    } catch (error) {
      console.error("Error fetching venues:", error);
      res.status(500).json({ message: "Failed to fetch venues" });
    }
  });

  // Get venue by ID
  app.get("/api/admin/venues/:id", async (req: Request, res: Response) => {
    try {
      const venueId = parseInt(req.params.id);
      if (isNaN(venueId)) {
        return res.status(400).json({ message: "Invalid venue ID" });
      }

      const venue = await storage.getVenueById(venueId);
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }

      res.json(venue);
    } catch (error) {
      console.error("Error fetching venue:", error);
      res.status(500).json({ message: "Failed to fetch venue" });
    }
  });

  // Get venue layout (venue + stages + tables)
  app.get("/api/admin/venues/:id/layout", async (req: Request, res: Response) => {
    try {
      const venueId = parseInt(req.params.id);
      if (isNaN(venueId)) {
        return res.status(400).json({ message: "Invalid venue ID" });
      }

      const venue = await storage.getVenueById(venueId);
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }

      const stages = await storage.getStagesByVenue(venueId);
      const tables = await storage.getTablesByVenue(venueId);

      res.json({
        venue,
        stages,
        tables
      });
    } catch (error) {
      console.error("Error fetching venue layout:", error);
      res.status(500).json({ message: "Failed to fetch venue layout" });
    }
  });

  // Create venue - simplified
  app.post("/api/admin/venues", requireAdminOrVenueOwner, async (req: Request, res: Response) => {
    try {
      const { name = '', description = '' } = req.body || {};
      
      if (!name || name.trim() === '') {
        return res.status(400).json({ message: "Venue name is required" });
      }
      
      // Create venue with minimal data first
      const result = await db.insert(schema.venues).values({
        name: name.trim(),
        description: description || '',
        width: 1000,
        height: 700
      }).returning({ id: schema.venues.id });
      
      const newVenueId = result[0].id;
      
      res.json({
        id: newVenueId,
        name: name.trim(),
        description: description || '',
        width: 1000,
        height: 700
      });
    } catch (error) {
      console.error("Venue creation error:", error);
      res.status(500).json({ message: "Failed to create venue" });
    }
  });

  // Update venue
  app.put("/api/admin/venues/:id", requireAdminOrVenueOwner, async (req: Request, res: Response) => {
    try {
      const venueId = parseInt(req.params.id);
      if (isNaN(venueId)) {
        return res.status(400).json({ message: "Invalid venue ID" });
      }

      const validatedData = insertVenueSchema.partial().parse(req.body);
      const updatedVenue = await storage.updateVenue(venueId, validatedData);
      
      if (!updatedVenue) {
        return res.status(404).json({ message: "Venue not found" });
      }

      res.json(updatedVenue);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid venue data", 
          errors: error.errors 
        });
      }
      console.error("Error updating venue:", error);
      res.status(500).json({ message: "Failed to update venue" });
    }
  });

  // Save venue layout (venue + stages + tables)
  app.put("/api/admin/venues/:id/layout", async (req: Request, res: Response) => {
    try {
      const venueId = parseInt(req.params.id);
      if (isNaN(venueId)) {
        return res.status(400).json({ message: "Invalid venue ID" });
      }

      const { venue, stages, tables } = req.body;

      // Update venue
      if (venue) {
        const venueData = insertVenueSchema.partial().parse(venue);
        await storage.updateVenue(venueId, venueData);
      }

      // Handle stages
      if (stages && Array.isArray(stages)) {
        // For simplicity, we'll replace all stages
        // In a production app, you'd want to handle updates more carefully
        const existingStages = await storage.getStagesByVenue(venueId);
        
        // Remove existing stages
        for (const stage of existingStages) {
          await storage.deleteStage(stage.id);
        }

        // Add new stages
        for (const stageData of stages) {
          const validatedStage = insertStageSchema.parse({
            ...stageData,
            venueId
          });
          await storage.createStage(validatedStage);
        }
      }

      // Handle tables
      if (tables && Array.isArray(tables)) {
        // For simplicity, we'll replace all tables
        const existingTables = await storage.getTablesByVenue(venueId);
        
        // Remove existing tables
        for (const table of existingTables) {
          await storage.deleteTable(table.id);
        }

        // Add new tables
        for (const tableData of tables) {
          const validatedTable = insertTableSchema.parse({
            ...tableData,
            venueId
          });
          await storage.createTable(validatedTable);
        }
      }

      res.json({ message: "Layout saved successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid layout data", 
          errors: error.errors 
        });
      }
      console.error("Error saving venue layout:", error);
      res.status(500).json({ message: "Failed to save venue layout" });
    }
  });

  // Delete venue
  app.delete("/api/admin/venues/:id", async (req: Request, res: Response) => {
    try {
      const venueId = parseInt(req.params.id);
      if (isNaN(venueId)) {
        return res.status(400).json({ message: "Invalid venue ID" });
      }

      const success = await storage.deleteVenue(venueId);
      if (!success) {
        return res.status(404).json({ message: "Venue not found" });
      }

      res.json({ message: "Venue deleted successfully" });
    } catch (error) {
      console.error("Error deleting venue:", error);
      res.status(500).json({ message: "Failed to delete venue" });
    }
  });
}