import { storage } from "./storage";

export class BookingValidation {
  // Check if table is still available (not double-booked)
  static async validateTableAvailability(tableId: number, eventId: number): Promise<boolean> {
    try {
      const existingBookings = await storage.getBookings();
      const conflictingBooking = existingBookings.find(booking => 
        booking.tableId === tableId && 
        booking.eventId === eventId && 
        booking.status !== "canceled" && 
        booking.status !== "refunded"
      );
      
      return !conflictingBooking;
    } catch (error) {
      console.error("Error validating table availability:", error);
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

  // Prevent reassigning to already booked tables (admin protection)
  static async validateTableReassignment(newTableId: number, eventId: number): Promise<boolean> {
    return await this.validateTableAvailability(newTableId, eventId);
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