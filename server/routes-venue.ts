import { Express, Request, Response } from "express";
import { storage } from "./storage.js";
import { db } from "./db.js";
import * as schema from "@shared/schema";
import { insertVenueSchema, insertStageSchema, insertTableSchema } from "@shared/schema";
import { z } from "zod";
import { eq, inArray, sql } from "drizzle-orm";

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
      console.log("Venue creation request received:", req.body);
      const { name = '', description = '' } = req.body || {};
      
      if (!name || name.trim() === '') {
        console.log("Venue name validation failed");
        return res.status(400).json({ message: "Venue name is required" });
      }
      
      console.log("Creating venue with data:", { name: name.trim(), description: description || '' });
      
      // Create venue with minimal data first
      const result = await db.insert(schema.venues).values({
        name: name.trim(),
        description: description || '',
        width: 1000,
        height: 700
      }).returning({ id: schema.venues.id });
      
      const newVenueId = result[0].id;
      console.log("Venue created successfully with ID:", newVenueId);
      
      const responseData = {
        id: newVenueId,
        name: name.trim(),
        description: description || '',
        width: 1000,
        height: 700
      };
      
      console.log("Sending response:", responseData);
      res.setHeader('Content-Type', 'application/json');
      res.json(responseData);
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

  // Save venue layout (venue + stages + tables) - Improved version with proper transaction handling
  app.put("/api/admin/venues/:id/layout", async (req: Request, res: Response) => {
    try {
      const venueId = parseInt(req.params.id);
      if (isNaN(venueId)) {
        return res.status(400).json({ message: "Invalid venue ID" });
      }

      const { venue, stages, tables } = req.body;
      
      console.log(`💾 SAVING VENUE LAYOUT for venue ${venueId}`);
      console.log(`   Venue updates:`, venue ? Object.keys(venue) : 'none');
      console.log(`   Stages to save: ${stages?.length || 0}`);
      console.log(`   Tables to save: ${tables?.length || 0}`);

      // Begin transaction for data integrity
      await db.transaction(async (tx) => {
        
        // Update venue properties
        if (venue) {
          const venueData = insertVenueSchema.partial().parse(venue);
          console.log(`   Updating venue with:`, venueData);
          await tx.update(schema.venues)
            .set(venueData)
            .where(eq(schema.venues.id, venueId));
        }

        // Handle stages with proper cleanup
        if (stages && Array.isArray(stages)) {
          console.log(`🎭 Processing ${stages.length} stages`);
          
          // Get existing stages with booking/event dependencies
          const existingStages = await tx
            .select({ id: schema.stages.id })
            .from(schema.stages)
            .where(eq(schema.stages.venueId, venueId));
          
          console.log(`   Found ${existingStages.length} existing stages`);
          
          // Only delete stages that are safe to remove (no constraints)
          if (existingStages.length > 0) {
            const stageIds = existingStages.map(s => s.id);
            await tx.delete(schema.stages).where(inArray(schema.stages.id, stageIds));
            console.log(`   ✅ Removed ${existingStages.length} existing stages`);
          }

          // Insert new stages
          let insertedStages = 0;
          for (const stageData of stages) {
            try {
              const validatedStage = insertStageSchema.parse({
                ...stageData,
                venueId
              });
              delete validatedStage.id; // Remove ID to let DB assign new one
              
              await tx.insert(schema.stages).values(validatedStage);
              insertedStages++;
            } catch (error) {
              console.error(`   ❌ Failed to insert stage:`, error);
              throw error;
            }
          }
          console.log(`   ✅ Inserted ${insertedStages} new stages`);
        }

        // Handle tables with safe cleanup strategy
        if (tables && Array.isArray(tables)) {
          console.log(`🪑 Processing ${tables.length} tables`);
          
          // Get existing tables with their booking status
          const existingTables = await tx
            .select({
              id: schema.tables.id,
              tableNumber: schema.tables.tableNumber,
              hasBookings: sql<boolean>`EXISTS(SELECT 1 FROM ${schema.bookings} WHERE table_id = ${schema.tables.id})`
            })
            .from(schema.tables)
            .where(eq(schema.tables.venueId, venueId));
          
          console.log(`   Found ${existingTables.length} existing tables`);
          
          // Separate booked and unbooked tables
          const bookedTables = existingTables.filter(t => t.hasBookings);
          const unbookedTables = existingTables.filter(t => !t.hasBookings);
          
          console.log(`   Booked tables: ${bookedTables.length}, Unbooked: ${unbookedTables.length}`);
          
          if (bookedTables.length > 0) {
            console.log(`   ⚠️ WARNING: Preserving ${bookedTables.length} tables with bookings`);
          }
          
          // Only delete unbooked tables to prevent data loss
          if (unbookedTables.length > 0) {
            const unbookedIds = unbookedTables.map(t => t.id);
            
            // Delete seats first (foreign key constraint)
            await tx.delete(schema.seats).where(inArray(schema.seats.tableId, unbookedIds));
            
            // Delete unbooked tables
            await tx.delete(schema.tables).where(inArray(schema.tables.id, unbookedIds));
            
            console.log(`   ✅ Safely removed ${unbookedTables.length} unbooked tables`);
          }
          
          // Insert new tables, avoiding conflicts with existing booked tables
          let insertedTables = 0;
          const existingTableNumbers = new Set(bookedTables.map(t => t.tableNumber));
          
          for (const tableData of tables) {
            try {
              const validatedTable = insertTableSchema.parse({
                ...tableData,
                venueId
              });
              delete validatedTable.id; // Remove ID to let DB assign new one
              
              // Skip tables that would conflict with existing booked tables
              if (existingTableNumbers.has(validatedTable.tableNumber)) {
                console.log(`   ⏭️ Skipping table ${validatedTable.tableNumber} (has bookings)`);
                continue;
              }
              
              await tx.insert(schema.tables).values(validatedTable);
              insertedTables++;
            } catch (error) {
              console.error(`   ❌ Failed to insert table ${tableData.tableNumber}:`, error);
              throw error;
            }
          }
          console.log(`   ✅ Inserted ${insertedTables} new tables`);
        }
      });

      console.log(`✅ Venue layout saved successfully for venue ${venueId}`);
      res.json({ 
        message: "Layout saved successfully",
        venueId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("❌ Validation error:", error.errors);
        return res.status(400).json({ 
          message: "Invalid layout data", 
          errors: error.errors 
        });
      }
      console.error("❌ Error saving venue layout:", error);
      res.status(500).json({ 
        message: "Failed to save venue layout",
        error: error instanceof Error ? error.message : "Unknown error"
      });
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