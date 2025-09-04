import { storage } from "./storage";
import { eq, and, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export class BookingValidation {
  // Check if table is still available (not double-booked) - ENHANCED FOR CONCURRENCY
  static async validateTableAvailability(tableId: number, eventId: number): Promise<boolean> {
    try {
      // Check for existing confirmed bookings first
      const existingBookings = await storage.getBookings();
      const conflictingBooking = existingBookings.find(booking => 
        booking.tableId === tableId && 
        booking.eventId === eventId && 
        booking.status !== "canceled" && 
        booking.status !== "refunded"
      );
      
      if (conflictingBooking) {
        return false;
      }

      // Check for active seat holds (prevent concurrent selections)
      const activeHolds = await storage.getActiveSeatHolds(eventId, tableId);
      if (activeHolds.length > 0) {
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error validating table availability:", error);
      return false;
    }
  }

  // Create a seat hold with lock token - PREVENTS CONCURRENT BOOKING
  static async createSeatHold(eventId: number, tableId: number, seatNumbers: number[], userId?: number, sessionId?: string): Promise<string | null> {
    try {
      const lockToken = uuidv4();
      const now = new Date();
      const expiry = new Date(now.getTime() + (20 * 60 * 1000)); // 20 minutes

      // Use database transaction to ensure atomicity
      const holdId = await storage.createSeatHold({
        eventId,
        tableId,
        seatNumbers,
        userId,
        sessionId: sessionId || lockToken,
        holdStartTime: now,
        holdExpiry: expiry,
        lockToken,
        status: 'active'
      });

      return holdId ? lockToken : null;
    } catch (error) {
      console.error("Error creating seat hold:", error);
      return null;
    }
  }

  // Validate seat hold is still active and belongs to user
  static async validateSeatHold(lockToken: string, eventId: number, tableId: number): Promise<boolean> {
    try {
      const hold = await storage.getSeatHoldByToken(lockToken);
      if (!hold) return false;

      // Check if hold is expired
      if (new Date() > hold.holdExpiry) {
        await storage.expireSeatHold(hold.id);
        return false;
      }

      // Check if hold matches the requested table
      return hold.eventId === eventId && hold.tableId === tableId && hold.status === 'active';
    } catch (error) {
      console.error("Error validating seat hold:", error);
      return false;
    }
  }

  // Complete seat hold (convert to booking)
  static async completeSeatHold(lockToken: string): Promise<boolean> {
    try {
      const hold = await storage.getSeatHoldByToken(lockToken);
      if (!hold) return false;

      await storage.completeSeatHold(hold.id);
      return true;
    } catch (error) {
      console.error("Error completing seat hold:", error);
      return false;
    }
  }

  // Check for duplicate bookings by the same user for the same event
  static async validateNoDuplicateBooking(userId: number, eventId: number): Promise<boolean> {
    try {
      const existingBookings = await storage.getBookings();
      const userBooking = existingBookings.find(booking => 
        booking.userId === userId && 
        booking.eventId === eventId && 
        booking.status !== "canceled" && 
        booking.status !== "refunded"
      );
      
      return !userBooking;
    } catch (error) {
      console.error("Error validating duplicate booking:", error);
      return false;
    }
  }

  // Check if booking hold has expired (20-minute timeout)
  static isBookingHoldExpired(holdStartTime: Date | string | null): boolean {
    if (!holdStartTime) return false;
    
    const startTime = new Date(holdStartTime);
    const now = new Date();
    const holdDurationMs = 20 * 60 * 1000; // 20 minutes
    
    return (now.getTime() - startTime.getTime()) > holdDurationMs;
  }

  // Validate ticket purchase cutoff (3 days before event)
  static isWithinTicketCutoff(eventDate: Date | string, cutoffDays: number = 3): boolean {
    const event = new Date(eventDate);
    const now = new Date();
    const cutoffTime = new Date(event.getTime() - (cutoffDays * 24 * 60 * 60 * 1000));
    
    return now <= cutoffTime;
  }

  // Prevent reassigning to already booked tables (admin protection) - ENHANCED
  static async validateTableReassignment(newTableId: number, eventId: number, excludeBookingId?: number): Promise<{ valid: boolean, reason?: string }> {
    try {
      // Check for existing confirmed bookings
      const existingBookings = await storage.getBookings();
      const conflictingBooking = existingBookings.find(booking => 
        booking.tableId === newTableId && 
        booking.eventId === eventId && 
        booking.status !== "canceled" && 
        booking.status !== "refunded" &&
        (excludeBookingId ? booking.id !== excludeBookingId : true)
      );
      
      if (conflictingBooking) {
        return {
          valid: false,
          reason: `Cannot modify seat ${newTableId} - currently SOLD to ${conflictingBooking.customerEmail}`
        };
      }

      // Check for active holds (seats currently being selected by other users)
      const activeHolds = await storage.getActiveSeatHolds(eventId, newTableId);
      if (activeHolds.length > 0) {
        const hold = activeHolds[0];
        const remainingTime = Math.ceil((hold.holdExpiry.getTime() - new Date().getTime()) / 60000);
        return {
          valid: false,
          reason: `Cannot modify seat ${newTableId} - currently ON HOLD (${remainingTime} minutes remaining)`
        };
      }

      return { valid: true };
    } catch (error) {
      console.error("Error validating table reassignment:", error);
      return { valid: false, reason: "Error validating table status" };
    }
  }

  // Admin-specific validation for seat modifications
  static async validateAdminSeatModification(tableId: number, eventId: number): Promise<{ canModify: boolean, alertMessage?: string }> {
    try {
      const reassignmentCheck = await this.validateTableReassignment(tableId, eventId);
      
      if (!reassignmentCheck.valid) {
        return {
          canModify: false,
          alertMessage: reassignmentCheck.reason
        };
      }

      return { canModify: true };
    } catch (error) {
      console.error("Error validating admin seat modification:", error);
      return {
        canModify: false,
        alertMessage: "Error checking seat status. Please try again."
      };
    }
  }

  // Check if event allows booking (not private without proper access)
  static async validateEventAccess(eventId: number, isPrivate: boolean, userHasAccess: boolean = false): Promise<boolean> {
    if (!isPrivate) return true;
    return userHasAccess;
  }

  // Validate wine selections format
  static validateWineSelections(wineSelections: any[]): boolean {
    if (!Array.isArray(wineSelections)) return false;
    
    return wineSelections.every(selection => 
      selection &&
      typeof selection.id === 'number' &&
      typeof selection.quantity === 'number' &&
      selection.quantity > 0 &&
      typeof selection.name === 'string' &&
      ['wine_glass', 'wine_bottle'].includes(selection.type)
    );
  }
}