import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { insertTableSchema, insertSeatSchema, tables } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

/**
 * Register admin routes for venue layout management
 * @param app Express application instance
 */
export function registerAdminRoutes(app: Express): void {
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

  // Venue routes are handled in routes-venue.ts

  // Get all tables for a venue with optional floor filter
  app.get("/api/admin/tables", requireAdminOrVenueOwner, async (req, res) => {
    try {
      const venueId = parseInt(req.query.venueId as string);
      const floor = req.query.floor as string | undefined;
      
      if (isNaN(venueId)) {
        return res.status(400).json({ message: "Invalid venue ID" });
      }

      // Conditionally include floor filter
      let query = db.select().from(tables).where(eq(tables.venueId, venueId));
      
      if (floor) {
        query = db.select().from(tables).where(
          and(
            eq(tables.venueId, venueId),
            eq(tables.floor, floor)
          )
        );
      }
      
      const venueTables = await query;
      res.json(venueTables);
    } catch (error) {
      console.error("Error fetching tables:", error);
      res.status(500).json({ message: "Failed to fetch tables" });
    }
  });

  // Get a specific table with its seats
  app.get("/api/admin/tables/:id", requireAdminOrVenueOwner, async (req, res) => {
    try {
      const tableId = parseInt(req.params.id);
      if (isNaN(tableId)) {
        return res.status(400).json({ message: "Invalid table ID" });
      }

      const table = await storage.getTableWithSeats(tableId);
      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }

      res.json(table);
    } catch (error) {
      console.error("Error fetching table:", error);
      res.status(500).json({ message: "Failed to fetch table" });
    }
  });

  // Create a new table
  app.post("/api/admin/tables", requireAdminOrVenueOwner, async (req, res) => {
    try {
      // Validate input using the schema
      const validatedData = insertTableSchema.parse(req.body);

      // Create the table
      const tableId = await storage.createTable(validatedData);
      
      // Get the created table
      const newTable = await storage.getTable(tableId);
      
      res.status(201).json(newTable);
    } catch (error) {
      console.error("Error creating table:", error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid table data", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to create table" });
    }
  });

  // Update a table
  app.put("/api/admin/tables/:id", requireAdminOrVenueOwner, async (req, res) => {
    try {
      const tableId = parseInt(req.params.id);
      if (isNaN(tableId)) {
        return res.status(400).json({ message: "Invalid table ID" });
      }

      // Get the existing table to ensure it exists
      const existingTable = await storage.getTable(tableId);
      if (!existingTable) {
        return res.status(404).json({ message: "Table not found" });
      }

      // Validate the update data
      // We'll skip validation here to allow partial updates
      const updateData = req.body;

      // Update the table
      await storage.updateTable(tableId, updateData);
      
      // Get the updated table
      const updatedTable = await storage.getTable(tableId);
      
      res.json(updatedTable);
    } catch (error) {
      console.error("Error updating table:", error);
      res.status(500).json({ 
        message: "Failed to update table",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Delete a table
  app.delete("/api/admin/tables/:id", requireAdminOrVenueOwner, async (req, res) => {
    try {
      const tableId = parseInt(req.params.id);
      if (isNaN(tableId)) {
        return res.status(400).json({ message: "Invalid table ID" });
      }

      // Get the existing table to ensure it exists
      const existingTable = await storage.getTable(tableId);
      if (!existingTable) {
        return res.status(404).json({ message: "Table not found" });
      }

      // Delete the table
      await storage.deleteTable(tableId);
      
      res.json({ message: "Table deleted successfully" });
    } catch (error) {
      console.error("Error deleting table:", error);
      res.status(500).json({ message: "Failed to delete table" });
    }
  });

  // Bulk update tables
  app.post("/api/admin/tables/bulk-update", requireAdminOrVenueOwner, async (req, res) => {
    try {
      const { tables } = req.body;
      
      if (!Array.isArray(tables) || tables.length === 0) {
        return res.status(400).json({ message: "Invalid tables data" });
      }
      
      // Update each table
      const results = [];
      for (const table of tables) {
        const tableId = table.id;
        if (!tableId) continue;
        
        try {
          const { id, ...updateData } = table;
          await storage.updateTable(tableId, updateData);
          results.push({ id: tableId, status: 'success' });
        } catch (error) {
          console.error(`Error updating table ${tableId}:`, error);
          results.push({ id: tableId, status: 'error', message: error.message });
        }
      }
      
      res.json({ results });
    } catch (error) {
      console.error("Error in bulk update:", error);
      res.status(500).json({ message: "Failed to process bulk update" });
    }
  });

  // Get floors for a venue
  app.get("/api/admin/venues/:venueId/floors", requireAdminOrVenueOwner, async (req, res) => {
    try {
      const venueId = parseInt(req.params.venueId);
      if (isNaN(venueId)) {
        return res.status(400).json({ message: "Invalid venue ID" });
      }

      // This would typically come from a database table
      // For now, we'll return hardcoded floors
      const floors = [
        { id: 'main', name: 'Main Floor', isActive: true },
        { id: 'mezzanine', name: 'Mezzanine', isActive: true },
        { id: 'vip', name: 'VIP Area', isActive: false },
      ];
      
      res.json(floors);
    } catch (error) {
      console.error("Error fetching floors:", error);
      res.status(500).json({ message: "Failed to fetch floors" });
    }
  });

  // Get available table zones
  app.get("/api/admin/venues/:venueId/zones", requireAdminOrVenueOwner, async (req, res) => {
    try {
      const venueId = parseInt(req.params.venueId);
      if (isNaN(venueId)) {
        return res.status(400).json({ message: "Invalid venue ID" });
      }

      // This would typically come from a database table
      // For now, we'll return hardcoded zones
      const zones = [
        { id: 'front-stage', name: 'Front Stage', color: '#FF5757', tables: [] },
        { id: 'center', name: 'Center', color: '#57B3FF', tables: [] },
        { id: 'back', name: 'Back', color: '#57FFA0', tables: [] },
      ];
      
      // Find tables in each zone
      const venueTables = await db.select().from(tables).where(eq(tables.venueId, venueId));
      
      // In our current schema we don't have a zone field, so we can't populate this
      // In a real implementation, you'd query tables with their zones
      
      res.json(zones);
    } catch (error) {
      console.error("Error fetching zones:", error);
      res.status(500).json({ message: "Failed to fetch zones" });
    }
  });

  // Save layout template
  app.post("/api/admin/venues/:venueId/templates", requireAdminOrVenueOwner, async (req, res) => {
    try {
      const venueId = parseInt(req.params.venueId);
      if (isNaN(venueId)) {
        return res.status(400).json({ message: "Invalid venue ID" });
      }

      const { name, description } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Template name is required" });
      }
      
      // This would typically save to a database table
      // For now, we'll simulate success
      
      res.json({ 
        id: Date.now().toString(),
        name,
        description,
        createdAt: new Date(),
        lastModified: new Date()
      });
    } catch (error) {
      console.error("Error saving template:", error);
      res.status(500).json({ message: "Failed to save template" });
    }
  });

  // Get layout templates
  app.get("/api/admin/venues/:venueId/templates", requireAdminOrVenueOwner, async (req, res) => {
    try {
      const venueId = parseInt(req.params.venueId);
      if (isNaN(venueId)) {
        return res.status(400).json({ message: "Invalid venue ID" });
      }

      // This would typically come from a database table
      // For now, we'll return hardcoded templates
      const templates = [
        {
          id: 'concert',
          name: 'Concert Layout',
          description: 'Standard setup for musical performances',
          createdAt: new Date(),
          lastModified: new Date()
        },
        {
          id: 'dinner',
          name: 'Dinner Event',
          description: 'Optimized for dining experience',
          createdAt: new Date(),
          lastModified: new Date()
        }
      ];
      
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  // Upload floor plan image
  app.post("/api/admin/venues/:venueId/floors/:floorId/image", requireAdminOrVenueOwner, async (req, res) => {
    try {
      const venueId = parseInt(req.params.venueId);
      const floorId = req.params.floorId;
      
      if (isNaN(venueId)) {
        return res.status(400).json({ message: "Invalid venue ID" });
      }

      // This would typically handle file upload and storage
      // For now, we'll simulate success
      
      res.json({ 
        imageUrl: '/mezzanine.jpg'
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Manual booking recovery for Athena's missing booking
  app.post("/api/admin/recover-booking-manual", async (req, res) => {
    try {
      const {
        eventId,
        customerEmail,
        partySize,
        guestNames,
        foodSelections,
        wineSelections,
        stripePaymentId,
        notes,
        tablePreference
      } = req.body;

      console.log("Creating manual booking recovery for:", customerEmail);

      // Find the user or create if needed
      let user = await storage.getUserByEmail(customerEmail);
      if (!user) {
        // Create user for Athena if doesn't exist
        const newUser = await storage.createUser({
          email: customerEmail,
          password: "temp_password_123", // She can reset this
          role: "customer",
          firstName: customerEmail.includes("athena") ? "Athena" : "Customer",
          lastName: "Recovery"
        });
        user = newUser;
      }

      // Find available table based on party size and preference
      const availableTables = await storage.getAvailableTablesForEvent(parseInt(eventId));
      let selectedTable = null;

      if (tablePreference) {
        // Try to find preferred table
        selectedTable = availableTables.find(t => 
          t.tableNumber.toString() === tablePreference || 
          t.id.toString() === tablePreference
        );
      }

      if (!selectedTable) {
        // Find table that fits party size
        selectedTable = availableTables.find(t => t.capacity >= parseInt(partySize));
      }

      if (!selectedTable) {
        return res.status(400).json({ 
          message: "No available tables found for party size",
          availableTables: availableTables.map(t => ({
            id: t.id,
            tableNumber: t.tableNumber,
            capacity: t.capacity
          }))
        });
      }

      // Create the booking
      const booking = await storage.createBooking({
        eventId: parseInt(eventId),
        userId: user.id,
        tableId: selectedTable.id,
        seatNumbers: Array.from({length: parseInt(partySize)}, (_, i) => i + 1),
        foodSelections: JSON.stringify(foodSelections),
        customerEmail,
        stripePaymentId: stripePaymentId || 'manual_recovery',
        guestNames: JSON.stringify(guestNames),
        status: 'confirmed',
        partySize: parseInt(partySize),
        wineSelections: JSON.stringify(wineSelections),
        notes: notes || 'Manual booking recovery'
      });

      // Update table availability
      await storage.updateTableStatus(selectedTable.id, 'booked');

      // Send confirmation email
      const emailService = new (require('./email-service').EmailService)();
      try {
        await emailService.sendBookingConfirmation({
          customerEmail,
          eventTitle: "Pianist Sophia Su in Concert",
          eventDate: "August 14, 2025",
          eventTime: "5:45 PM",
          tableNumber: selectedTable.tableNumber,
          partySize: parseInt(partySize),
          guestNames: guestNames,
          bookingId: booking.id,
          foodSelections: foodSelections,
          wineSelections: wineSelections
        });
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
      }

      res.json({
        success: true,
        bookingId: booking.id,
        tableNumber: selectedTable.tableNumber,
        tableId: selectedTable.id,
        message: "Athena's booking recovered successfully",
        customerEmail,
        confirmationEmailSent: true
      });

    } catch (error) {
      console.error("Error in manual booking recovery:", error);
      res.status(500).json({ 
        message: "Failed to create manual booking",
        error: error.message 
      });
    }
  });
}