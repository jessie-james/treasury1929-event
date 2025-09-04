import { Express, Request, Response } from "express";
import { storage } from "./storage.js";
import { db } from "./db.js";
import * as schema from "@shared/schema";
import { insertVenueSchema, insertStageSchema, insertTableSchema } from "@shared/schema";
import { z } from "zod";
import { eq, inArray, count } from "drizzle-orm";

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
      // CRITICAL: Force real-time table status calculation for double-booking prevention
      const eventId = req.query.eventId ? parseInt(req.query.eventId as string) : undefined;
      console.log(`🔍 Venue layout request for venue ${venueId}, event ${eventId}`);
      const tables = await storage.getTablesByVenue(venueId, eventId);
      console.log(`📊 Tables loaded: ${tables.length}, sample statuses:`, tables.slice(0,3).map(t => ({num: t.tableNumber, status: t.status})));

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
      console.log(`   Venue data:`, venue);
      console.log(`   Stages to save: ${stages?.length || 0}`);
      console.log(`   Tables to save: ${tables?.length || 0}`);
      if (tables && tables.length > 0) {
        console.log(`   Sample table data:`, tables[0]);
      }

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
          
          // Get existing tables
          const existingTables = await tx
            .select({
              id: schema.tables.id,
              tableNumber: schema.tables.tableNumber
            })
            .from(schema.tables)
            .where(eq(schema.tables.venueId, venueId));
          
          console.log(`   Found ${existingTables.length} existing tables`);
          
          // Check for bookings using a separate query for each table
          const tablesWithBookings = [];
          for (const table of existingTables) {
            const bookingCount = await tx
              .select({ count: count() })
              .from(schema.bookings)
              .where(eq(schema.bookings.tableId, table.id));
            
            if (bookingCount[0]?.count > 0) {
              tablesWithBookings.push(table);
              console.log(`   Table ${table.tableNumber} (ID: ${table.id}) has ${bookingCount[0].count} bookings`);
            }
          }
          
          const bookedTables = tablesWithBookings;
          const unbookedTables = existingTables.filter(t => !bookedTables.some(bt => bt.id === t.id));
          
          console.log(`   Booked tables: ${bookedTables.length}, Unbooked: ${unbookedTables.length}`);
          
          if (bookedTables.length > 0) {
            console.log(`   ⚠️ WARNING: Preserving ${bookedTables.length} tables with bookings`);
            console.log(`   Booked table numbers:`, bookedTables.map(t => t.tableNumber));
          }
          
          // For venues with bookings, use UPDATE strategy instead of DELETE/INSERT
          if (bookedTables.length > 0) {
            console.log(`   🔄 Using UPDATE strategy for venue with bookings`);
            
            // Update each table individually
            for (const tableData of tables) {
              const existingTable = existingTables.find(t => t.tableNumber === tableData.tableNumber);
              
              if (existingTable) {
                // Update existing table
                const updateData = insertTableSchema.partial().parse({
                  x: tableData.x,
                  y: tableData.y,
                  width: tableData.width,
                  height: tableData.height,
                  rotation: tableData.rotation,
                  capacity: tableData.capacity,
                  shape: tableData.shape,
                  tableSize: tableData.tableSize
                });
                
                await tx.update(schema.tables)
                  .set(updateData)
                  .where(eq(schema.tables.id, existingTable.id));
                
                console.log(`   ✅ Updated table ${tableData.tableNumber}`);
              } else {
                // Insert new table
                const validatedTable = insertTableSchema.parse({
                  ...tableData,
                  venueId
                });
                delete validatedTable.id;
                
                await tx.insert(schema.tables).values(validatedTable);
                console.log(`   ✅ Inserted new table ${tableData.tableNumber}`);
              }
            }
          } else {
            // Use original DELETE/INSERT strategy for venues without bookings
            console.log(`   🔄 Using DELETE/INSERT strategy for venue without bookings`);
            
            // Delete seats first (foreign key constraint)
            if (unbookedTables.length > 0) {
              const unbookedIds = unbookedTables.map(t => t.id);
              await tx.delete(schema.seats).where(inArray(schema.seats.tableId, unbookedIds));
              await tx.delete(schema.tables).where(inArray(schema.tables.id, unbookedIds));
              console.log(`   ✅ Safely removed ${unbookedTables.length} unbooked tables`);
            }
            
            // Insert new tables
            let insertedTables = 0;
            for (const tableData of tables) {
              try {
                const validatedTable = insertTableSchema.parse({
                  ...tableData,
                  venueId
                });
                delete validatedTable.id;
                
                await tx.insert(schema.tables).values(validatedTable);
                insertedTables++;
              } catch (error) {
                console.error(`   ❌ Failed to insert table ${tableData.tableNumber}:`, error);
                throw error;
              }
            }
            console.log(`   ✅ Inserted ${insertedTables} new tables`);
          }
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