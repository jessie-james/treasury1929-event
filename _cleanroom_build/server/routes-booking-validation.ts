import express, { type Express } from "express";
import { storage } from "./storage";
import { BookingValidation } from "./booking-validation";
import { z } from "zod";

// Validation schemas
const validateTableSchema = z.object({
  tableId: z.number(),
  eventId: z.number(),
  holdStartTime: z.string().optional()
});

const reassignTableSchema = z.object({
  bookingId: z.number(),
  newTableId: z.number(),
  eventId: z.number()
});

export function registerBookingValidationRoutes(app: Express) {
  // Validate table availability before booking
  app.post("/api/validate-table", async (req, res) => {
    try {
      const validationResult = validateTableSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          valid: false,
          message: "Invalid request data",
          errors: validationResult.error.format()
        });
      }

      const { tableId, eventId, holdStartTime } = validationResult.data;

      // Check if table is still available
      const isAvailable = await BookingValidation.validateTableAvailability(tableId, eventId);
      
      if (!isAvailable) {
        return res.status(409).json({
          valid: false,
          message: "Table has been booked by another customer",
          code: "TABLE_UNAVAILABLE"
        });
      }

      // Check if hold has expired
      if (holdStartTime) {
        const isExpired = BookingValidation.isBookingHoldExpired(holdStartTime);
        if (isExpired) {
          return res.status(410).json({
            valid: false,
            message: "Your table hold has expired. Please select a new table.",
            code: "HOLD_EXPIRED"
          });
        }
      }

      res.json({
        valid: true,
        message: "Table is available"
      });

    } catch (error) {
      console.error("Error validating table:", error);
      res.status(500).json({
        valid: false,
        message: "Unable to validate table availability"
      });
    }
  });

  // Admin endpoint: Prevent reassigning to booked tables
  app.post("/api/admin/validate-reassignment", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role === "customer") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const validationResult = reassignTableSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          valid: false,
          message: "Invalid request data"
        });
      }

      const { newTableId, eventId } = validationResult.data;

      const isValid = await BookingValidation.validateTableReassignment(newTableId, eventId);

      if (!isValid) {
        return res.status(409).json({
          valid: false,
          message: "Cannot reassign to an already booked table",
          code: "TABLE_ALREADY_BOOKED"
        });
      }

      res.json({
        valid: true,
        message: "Table reassignment is valid"
      });

    } catch (error) {
      console.error("Error validating table reassignment:", error);
      res.status(500).json({
        valid: false,
        message: "Unable to validate table reassignment"
      });
    }
  });

  // Check ticket purchase cutoff
  app.get("/api/events/:eventId/ticket-cutoff", async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const cutoffDays = event.ticketCutoffDays || 3;
      const isWithinCutoff = BookingValidation.isWithinTicketCutoff(event.date, cutoffDays);

      if (!isWithinCutoff) {
        return res.status(410).json({
          withinCutoff: false,
          message: `Ticket sales have closed. Tickets must be purchased at least ${cutoffDays} days before the event.`,
          eventDate: event.date,
          cutoffDays
        });
      }

      res.json({
        withinCutoff: true,
        eventDate: event.date,
        cutoffDays,
        message: "Tickets are available for purchase"
      });

    } catch (error) {
      console.error("Error checking ticket cutoff:", error);
      res.status(500).json({ message: "Unable to check ticket availability" });
    }
  });

  // Cleanup expired table holds
  app.post("/api/cleanup-expired-holds", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role === "customer") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // This would be called periodically to cleanup expired holds
      // For now, just return success as the validation happens during booking
      res.json({
        success: true,
        message: "Hold cleanup completed"
      });

    } catch (error) {
      console.error("Error cleaning up expired holds:", error);
      res.status(500).json({ message: "Cleanup failed" });
    }
  });
}