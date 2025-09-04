import { Express } from "express";
import { BookingValidation } from "./booking-validation.js";
import { storage } from "./storage.js";
import { z } from "zod";

const createSeatHoldSchema = z.object({
  eventId: z.number(),
  tableId: z.number(),
  seatNumbers: z.array(z.number()),
  sessionId: z.string().optional(),
});

const validateSeatHoldSchema = z.object({
  lockToken: z.string(),
  eventId: z.number(),
  tableId: z.number(),
});

export function registerSeatHoldRoutes(app: Express) {
  // Create a seat hold for table selection (20-minute timer)
  app.post("/api/seat-holds", async (req: any, res: any) => {
    try {
      const validationResult = createSeatHoldSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid request data",
          errors: validationResult.error.format()
        });
      }

      const { eventId, tableId, seatNumbers, sessionId } = validationResult.data;
      const userId = req.user?.id;

      // Check if user already has a booking for this event (duplicate prevention)
      if (userId) {
        const hasExistingBooking = await BookingValidation.validateNoDuplicateBooking(userId, eventId);
        if (!hasExistingBooking) {
          return res.status(409).json({
            success: false,
            message: "You already have a booking for this event",
            code: "DUPLICATE_BOOKING"
          });
        }
      }

      // Check table availability
      const isAvailable = await BookingValidation.validateTableAvailability(tableId, eventId);
      if (!isAvailable) {
        return res.status(409).json({
          success: false,
          message: "Table is no longer available",
          code: "TABLE_UNAVAILABLE"
        });
      }

      // Create the seat hold
      const lockToken = await BookingValidation.createSeatHold(
        eventId, 
        tableId, 
        seatNumbers, 
        userId, 
        sessionId
      );

      if (!lockToken) {
        return res.status(500).json({
          success: false,
          message: "Failed to create seat hold"
        });
      }

      res.json({
        success: true,
        lockToken,
        expiresIn: 20 * 60 * 1000, // 20 minutes in milliseconds
        message: "Seats held successfully"
      });

    } catch (error) {
      console.error("Error creating seat hold:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create seat hold"
      });
    }
  });

  // Validate an existing seat hold
  app.post("/api/seat-holds/validate", async (req: any, res: any) => {
    try {
      const validationResult = validateSeatHoldSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          valid: false,
          message: "Invalid request data"
        });
      }

      const { lockToken, eventId, tableId } = validationResult.data;

      const isValid = await BookingValidation.validateSeatHold(lockToken, eventId, tableId);

      if (!isValid) {
        return res.status(410).json({
          valid: false,
          message: "Seat hold has expired or is invalid",
          code: "HOLD_EXPIRED"
        });
      }

      res.json({
        valid: true,
        message: "Seat hold is still active"
      });

    } catch (error) {
      console.error("Error validating seat hold:", error);
      res.status(500).json({
        valid: false,
        message: "Failed to validate seat hold"
      });
    }
  });

  // Complete seat hold (called during successful payment)
  app.post("/api/seat-holds/complete", async (req: any, res: any) => {
    try {
      const { lockToken } = req.body;

      if (!lockToken) {
        return res.status(400).json({
          success: false,
          message: "Lock token is required"
        });
      }

      const completed = await BookingValidation.completeSeatHold(lockToken);

      if (!completed) {
        return res.status(404).json({
          success: false,
          message: "Seat hold not found or already completed"
        });
      }

      res.json({
        success: true,
        message: "Seat hold completed"
      });

    } catch (error) {
      console.error("Error completing seat hold:", error);
      res.status(500).json({
        success: false,
        message: "Failed to complete seat hold"
      });
    }
  });

  // Clean up expired holds (maintenance endpoint)
  app.post("/api/seat-holds/cleanup", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated() || !["admin", "venue_owner"].includes(req.user?.role || "")) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const cleanedUp = await storage.cleanupExpiredHolds();

      res.json({
        success: true,
        message: `Cleaned up ${cleanedUp} expired holds`
      });

    } catch (error) {
      console.error("Error cleaning up expired holds:", error);
      res.status(500).json({
        success: false,
        message: "Failed to cleanup expired holds"
      });
    }
  });
}