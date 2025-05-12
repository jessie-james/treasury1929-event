import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { insertTableSchema, insertSeatSchema } from "@shared/schema";

/**
 * Register admin routes for venue layout management
 * @param app Express application instance
 */
export function registerAdminRoutes(app: Express): void {
  // Verify admin or venue_owner role
  function requireAdminOrVenueOwner(req: Request, res: Response, next: Function) {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as any;
    if (!user || (user.role !== "admin" && user.role !== "venue_owner")) {
      return res.status(403).json({ message: "Forbidden: Requires admin or venue owner role" });
    }

    next();
  }

  // Get all tables for a venue with their seats
  app.get("/api/admin/tables", requireAdminOrVenueOwner, async (req, res) => {
    try {
      const venueId = parseInt(req.query.venueId as string);
      if (isNaN(venueId)) {
        return res.status(400).json({ message: "Invalid venue ID" });
      }

      const tables = await storage.getTablesWithSeats(venueId);
      res.json(tables);
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
      console.error(`Error fetching table ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch table" });
    }
  });

  // Create a new table
  app.post("/api/admin/tables", requireAdminOrVenueOwner, async (req, res) => {
    try {
      // Validate request body
      const validationResult = insertTableSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid table data", 
          errors: validationResult.error.errors 
        });
      }

      // Create the table in the database
      const table = await storage.createTable(req.body);

      // Create seats for the table
      const seats = await storage.createSeatsForTable(
        table.id, 
        req.body.capacity,
        req.body.tableType,
        req.body.rotation || 0
      );

      res.status(201).json({ ...table, seats });
    } catch (error) {
      console.error("Error creating table:", error);
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

      // Get the existing table to check if the capacity changed
      const existingTable = await storage.getTableWithSeats(tableId);
      if (!existingTable) {
        return res.status(404).json({ message: "Table not found" });
      }

      // Update the table in the database
      const updatedTable = await storage.updateTable(tableId, req.body);
      if (!updatedTable) {
        return res.status(404).json({ message: "Table not found" });
      }

      // If the capacity, table type, or rotation changed, recreate the seats
      if (
        req.body.capacity && req.body.capacity !== existingTable.capacity ||
        req.body.tableType && req.body.tableType !== existingTable.tableType ||
        req.body.rotation !== undefined && req.body.rotation !== existingTable.rotation
      ) {
        // Delete existing seats
        await storage.deleteSeatsForTable(tableId);

        // Create new seats
        const seats = await storage.createSeatsForTable(
          tableId,
          req.body.capacity || existingTable.capacity,
          req.body.tableType || existingTable.tableType,
          req.body.rotation !== undefined ? req.body.rotation : existingTable.rotation
        );

        return res.json({ ...updatedTable, seats });
      }

      // Get updated seats
      const seats = await storage.getTableSeats(tableId);
      res.json({ ...updatedTable, seats });
    } catch (error) {
      console.error(`Error updating table ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update table" });
    }
  });

  // Delete a table
  app.delete("/api/admin/tables/:id", requireAdminOrVenueOwner, async (req, res) => {
    try {
      const tableId = parseInt(req.params.id);
      if (isNaN(tableId)) {
        return res.status(400).json({ message: "Invalid table ID" });
      }

      await storage.deleteTable(tableId);
      res.json({ message: "Table deleted successfully" });
    } catch (error) {
      console.error(`Error deleting table ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to delete table" });
    }
  });

  // Get table availability for an event
  app.get("/api/admin/tables/:id/availability/:eventId", requireAdminOrVenueOwner, async (req, res) => {
    try {
      const tableId = parseInt(req.params.id);
      const eventId = parseInt(req.params.eventId);
      
      if (isNaN(tableId) || isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid table or event ID" });
      }

      const available = await storage.getTableAvailability(tableId, eventId);
      res.json({ available });
    } catch (error) {
      console.error(`Error checking table availability:`, error);
      res.status(500).json({ message: "Failed to check table availability" });
    }
  });

  // Get venue availability for an event
  app.get("/api/admin/venues/:venueId/availability/:eventId", requireAdminOrVenueOwner, async (req, res) => {
    try {
      const venueId = parseInt(req.params.venueId);
      const eventId = parseInt(req.params.eventId);
      
      if (isNaN(venueId) || isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid venue or event ID" });
      }

      const availability = await storage.getVenueAvailability(venueId, eventId);
      res.json(availability);
    } catch (error) {
      console.error(`Error checking venue availability:`, error);
      res.status(500).json({ message: "Failed to check venue availability" });
    }
  });
}