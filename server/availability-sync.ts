import { storage } from "./storage";
import { db } from "./db";
import { events, bookings } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export class AvailabilitySync {
  /**
   * Synchronize event availability counters with actual booking data
   * This ensures the frontend gets accurate sold-out status
   */
  static async syncEventAvailability(eventId: number): Promise<void> {
    try {
      console.log(`🔄 Syncing availability for event ${eventId}`);
      
      // Get event details
      const event = await storage.getEventById(eventId);
      if (!event) {
        console.error(`Event ${eventId} not found`);
        return;
      }

      // Get all confirmed bookings for this event
      const eventBookings = await db
        .select()
        .from(bookings)
        .where(and(
          eq(bookings.eventId, eventId),
          sql`${bookings.status} NOT IN ('canceled', 'refunded')`
        ));

      // Calculate actual booked seats and tables
      const bookedSeats = eventBookings.reduce((total, booking) => total + (booking.partySize || 0), 0);
      const bookedTables = new Set(eventBookings.map(b => b.tableId)).size;

      // Calculate available seats and tables
      const availableSeats = Math.max(0, event.totalSeats - bookedSeats);
      const availableTables = Math.max(0, event.totalTables - bookedTables);

      // Update event with accurate availability
      await db
        .update(events)
        .set({
          availableSeats,
          availableTables
        })
        .where(eq(events.id, eventId));

      console.log(`✅ Event ${eventId} availability synced:`, {
        totalSeats: event.totalSeats,
        bookedSeats,
        availableSeats,
        totalTables: event.totalTables,
        bookedTables,
        availableTables
      });

    } catch (error) {
      console.error(`Error syncing availability for event ${eventId}:`, error);
    }
  }

  /**
   * Sync availability for all events
   * Run this periodically or after booking operations
   */
  static async syncAllEventsAvailability(): Promise<void> {
    try {
      console.log('🔄 Syncing availability for all events');
      
      const allEvents = await storage.getAllEvents();
      
      for (const event of allEvents) {
        await this.syncEventAvailability(event.id);
      }
      
      console.log(`✅ Availability sync completed for ${allEvents.length} events`);
    } catch (error) {
      console.error('Error syncing all events availability:', error);
    }
  }

  /**
   * Real-time availability check - always check actual bookings
   * Use this before allowing table selection to prevent overbooking
   */
  static async getRealTimeAvailability(eventId: number): Promise<{
    availableSeats: number;
    availableTables: number;
    totalSeats: number;
    totalTables: number;
    isSoldOut: boolean;
  }> {
    try {
      // Get event details
      const event = await storage.getEventById(eventId);
      if (!event) {
        throw new Error(`Event ${eventId} not found`);
      }

      // Get all confirmed bookings for this event
      const eventBookings = await db
        .select()
        .from(bookings)
        .where(and(
          eq(bookings.eventId, eventId),
          sql`${bookings.status} NOT IN ('canceled', 'refunded')`
        ));

      // Calculate actual booked seats and tables
      const bookedSeats = eventBookings.reduce((total, booking) => total + (booking.partySize || 0), 0);
      const bookedTables = new Set(eventBookings.map(b => b.tableId)).size;

      // Calculate available seats and tables
      const availableSeats = Math.max(0, event.totalSeats - bookedSeats);
      const availableTables = Math.max(0, event.totalTables - bookedTables);

      const isSoldOut = availableSeats === 0 || availableTables === 0;

      return {
        availableSeats,
        availableTables,
        totalSeats: event.totalSeats,
        totalTables: event.totalTables,
        isSoldOut
      };
    } catch (error) {
      console.error(`Error getting real-time availability for event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Check if specific table is available for booking
   */
  static async isTableAvailable(eventId: number, tableId: number): Promise<boolean> {
    try {
      // Check for existing bookings on this table
      const existingBooking = await db
        .select()
        .from(bookings)
        .where(and(
          eq(bookings.eventId, eventId),
          eq(bookings.tableId, tableId),
          sql`${bookings.status} NOT IN ('canceled', 'refunded')`
        ))
        .limit(1);

      return existingBooking.length === 0;
    } catch (error) {
      console.error(`Error checking table availability for event ${eventId}, table ${tableId}:`, error);
      return false;
    }
  }
}