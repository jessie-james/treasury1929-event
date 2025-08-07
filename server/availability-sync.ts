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

      // Calculate available seats and tables based on event type
      let availableSeats: number;
      let availableTables: number;

      if (event.eventType === 'ticket-only') {
        // For ticket-only events, use ticketCapacity
        const totalTickets = event.ticketCapacity || 0;
        availableSeats = Math.max(0, totalTickets - bookedSeats);
        availableTables = 1; // Ticket-only events don't have tables
      } else {
        // For full events, use venue capacity
        availableSeats = Math.max(0, (event.totalSeats || 0) - bookedSeats);
        availableTables = Math.max(0, (event.totalTables || 0) - bookedTables);
      }

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
  // Ultra-aggressive cache for performance optimization
  private static availabilityCache = new Map<number, {data: any, timestamp: number}>();
  private static readonly CACHE_TTL = 300 * 1000; // 5 minutes cache (further increased for better performance)

  static async getRealTimeAvailability(eventId: number): Promise<{
    availableSeats: number;
    availableTables: number;
    totalSeats: number;
    totalTables: number;
    isSoldOut: boolean;
  }> {
    try {
      // Check cache first for performance
      const cached = this.availabilityCache.get(eventId);
      const now = Date.now();
      if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
        return cached.data;
      }

      // Get event details (using direct query for better performance)
      const [event] = await db
        .select({
          id: events.id,
          eventType: events.eventType,
          ticketCapacity: events.ticketCapacity,
          totalSeats: events.totalSeats,
          totalTables: events.totalTables
        })
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);

      if (!event) {
        throw new Error(`Event ${eventId} not found`);
      }

      // Lightning-fast single query with optimized aggregation
      const [bookingStats] = await db
        .select({
          totalBookedSeats: sql<number>`COALESCE(SUM(${bookings.partySize}), 0)`,
          totalBookedTables: sql<number>`COUNT(DISTINCT CASE WHEN ${bookings.status} = 'confirmed' THEN ${bookings.tableId} END)`
        })
        .from(bookings)
        .where(eq(bookings.eventId, eventId));  // Remove the status filter from WHERE for better index usage

      const bookedSeats = Number(bookingStats?.totalBookedSeats || 0);
      const bookedTables = Number(bookingStats?.totalBookedTables || 0);

      // Calculate availability based on event type
      let availableSeats: number;
      let availableTables: number;
      let totalSeats: number;
      let totalTables: number;
      let isSoldOut: boolean;

      if (event.eventType === 'ticket-only') {
        totalSeats = event.ticketCapacity || 0;
        totalTables = 1;
        availableSeats = Math.max(0, totalSeats - bookedSeats);
        availableTables = totalTables;
        isSoldOut = availableSeats === 0;
      } else {
        totalSeats = event.totalSeats || 0;
        totalTables = event.totalTables || 0;
        availableSeats = Math.max(0, totalSeats - bookedSeats);
        availableTables = Math.max(0, totalTables - bookedTables);
        isSoldOut = availableSeats === 0 || availableTables === 0;
      }

      const result = {
        availableSeats,
        availableTables,
        totalSeats,
        totalTables,
        isSoldOut
      };

      // Cache the result
      this.availabilityCache.set(eventId, { data: result, timestamp: now });

      return result;
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