import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import {
  type User, type Event, type Booking, type BookingWithDetails,
  type Table, type Seat, type TableWithSeats, type MenuItem, type VenueStaff,
  type InsertAdminLog, type AdminLog, type Venue, type Stage, type VenueWithTables
} from "@shared/schema";
import type { IStorage } from "./storage-base.js";
import { eq, and, desc, asc, gt, lt, sql } from "drizzle-orm";
import { hashPassword } from "./auth.js";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

export class PgStorage implements IStorage {
  
  // User methods
  async getAllUsers(): Promise<User[]> {
    const result = await db.select({
      id: schema.users.id,
      email: schema.users.email,
      password: schema.users.password,
      role: schema.users.role,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      phone: schema.users.phone,
      allergens: schema.users.allergens,
      dietaryRestrictions: schema.users.dietaryRestrictions,
      createdAt: schema.users.createdAt,
      stripeCustomerId: schema.users.stripeCustomerId,
      stripeSubscriptionId: schema.users.stripeSubscriptionId
    }).from(schema.users).orderBy(desc(schema.users.createdAt));
    
    // Remove password field for security before returning
    return result.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    });
  }

  async getUserById(id: number): Promise<User | null> {
    const result = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return result[0] || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return result[0] || null;
  }

  async createUser(userData: any): Promise<User> {
    if (userData.password) {
      userData.password = await hashPassword(userData.password);
    }
    const result = await db.insert(schema.users).values(userData).returning();
    return result[0];
  }

  async updateUserProfile(userId: number, profile: Partial<User>): Promise<User | null> {
    const result = await db.update(schema.users).set(profile).where(eq(schema.users.id, userId)).returning();
    return result[0] || null;
  }

  async updateUser(userId: number, updates: Partial<User>): Promise<User | null> {
    const result = await db.update(schema.users).set(updates).where(eq(schema.users.id, userId)).returning();
    return result[0] || null;
  }

  async deleteUser(userId: number): Promise<boolean> {
    try {
      await db.delete(schema.users).where(eq(schema.users.id, userId));
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<boolean> {
    // Password should already be hashed by the caller
    const result = await db.update(schema.users).set({ password: hashedPassword }).where(eq(schema.users.id, userId));
    return (result.rowCount ?? 0) > 0;
  }

  async updateUserDietaryPreferences(userId: number, allergens: string[], dietaryRestrictions: string[]): Promise<boolean> {
    const result = await db.update(schema.users)
      .set({ allergens, dietaryRestrictions })
      .where(eq(schema.users.id, userId));
    return (result.rowCount ?? 0) > 0;
  }

  async updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User | null> {
    const result = await db.update(schema.users)
      .set({ stripeCustomerId })
      .where(eq(schema.users.id, userId))
      .returning();
    return result[0] || null;
  }

  async updateUserStripeInfo(userId: number, stripeInfo: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<User | null> {
    const result = await db.update(schema.users)
      .set(stripeInfo)
      .where(eq(schema.users.id, userId))
      .returning();
    return result[0] || null;
  }

  // Venue methods
  async getAllVenues(): Promise<Venue[]> {
    return await db.select().from(schema.venues).where(eq(schema.venues.isActive, true));
  }

  async getVenueById(id: number): Promise<Venue | null> {
    const result = await db.select().from(schema.venues).where(eq(schema.venues.id, id));
    return result[0] || null;
  }

  async getVenueWithTables(id: number): Promise<VenueWithTables | null> {
    const venue = await this.getVenueById(id);
    if (!venue) return null;

    // Get tables with real-time booking status for current event
    const tables = await db.select({
      id: schema.tables.id,
      tableNumber: schema.tables.tableNumber,
      x: schema.tables.x,
      y: schema.tables.y,
      width: schema.tables.width,
      height: schema.tables.height,
      capacity: schema.tables.capacity,
      shape: schema.tables.shape,
      rotation: schema.tables.rotation,
      status: schema.tables.status,
      venueId: schema.tables.venueId,
      floor: schema.tables.floor,
      zone: schema.tables.zone,
      priceCategory: schema.tables.priceCategory,
      isLocked: schema.tables.isLocked,
      tableSize: schema.tables.tableSize
    })
    .from(schema.tables)
    .where(eq(schema.tables.venueId, id));

    const stages = await this.getStagesByVenue(id);

    return {
      ...venue,
      tables,
      stages,
    };
  }

  async createVenue(venueData: any): Promise<number> {
    const result = await db.insert(schema.venues).values(venueData).returning({ id: schema.venues.id });
    return result[0].id;
  }

  async updateVenue(id: number, venueData: Partial<Venue>): Promise<Venue | null> {
    const result = await db.update(schema.venues).set(venueData).where(eq(schema.venues.id, id)).returning();
    return result[0] || null;
  }

  async deleteVenue(id: number): Promise<boolean> {
    const result = await db.update(schema.venues).set({ isActive: false }).where(eq(schema.venues.id, id));
    return result.rowCount > 0;
  }

  // Stage methods
  async getStagesByVenue(venueId: number): Promise<Stage[]> {
    return await db.select().from(schema.stages).where(
      and(eq(schema.stages.venueId, venueId), eq(schema.stages.isActive, true))
    );
  }

  async getStage(id: number): Promise<Stage | null> {
    const result = await db.select().from(schema.stages).where(eq(schema.stages.id, id));
    return result[0] || null;
  }

  async createStage(stageData: any): Promise<number> {
    const result = await db.insert(schema.stages).values(stageData).returning({ id: schema.stages.id });
    return result[0].id;
  }

  async updateStage(id: number, stageData: Partial<Stage>): Promise<Stage | null> {
    const result = await db.update(schema.stages).set(stageData).where(eq(schema.stages.id, id)).returning();
    return result[0] || null;
  }

  async deleteStage(id: number): Promise<boolean> {
    const result = await db.update(schema.stages).set({ isActive: false }).where(eq(schema.stages.id, id));
    return result.rowCount > 0;
  }

  // Event methods
  async getAllEvents(): Promise<Event[]> {
    return await db.select().from(schema.events).orderBy(asc(schema.events.displayOrder), desc(schema.events.date));
  }

  async getActiveEvents(): Promise<Event[]> {
    return await db.select().from(schema.events)
      .where(eq(schema.events.isActive, true))
      .orderBy(asc(schema.events.date));
  }

  async getEventById(id: number): Promise<Event | null> {
    const result = await db.select().from(schema.events).where(eq(schema.events.id, id));
    return result[0] || null;
  }

  async createEvent(eventData: any): Promise<number> {
    const result = await db.insert(schema.events).values(eventData).returning({ id: schema.events.id });
    return result[0].id;
  }

  async updateEvent(id: number, eventData: Partial<any>): Promise<Event | null> {
    const result = await db.update(schema.events).set(eventData).where(eq(schema.events.id, id)).returning();
    return result[0] || null;
  }

  async deleteEvent(id: number): Promise<boolean> {
    const result = await db.update(schema.events).set({ isActive: false }).where(eq(schema.events.id, id));
    return result.rowCount > 0;
  }

  // Booking methods - Updated for table-based booking
  async getBookings(): Promise<BookingWithDetails[]> {
    const bookings = await db.select({
      booking: schema.bookings,
      event: schema.events,
      user: schema.users,
      table: schema.tables,
    })
    .from(schema.bookings)
    .leftJoin(schema.events, eq(schema.bookings.eventId, schema.events.id))
    .leftJoin(schema.users, eq(schema.bookings.userId, schema.users.id))
    .leftJoin(schema.tables, eq(schema.bookings.tableId, schema.tables.id))
    .orderBy(desc(schema.bookings.createdAt));

    return bookings.map(({ booking, event, user, table }) => ({
      ...booking,
      event: event!,
      user: user!,
      table: table!,
    }));
  }

  async getBookingsByUserId(userId: number): Promise<BookingWithDetails[]> {
    const bookings = await db.select({
      booking: schema.bookings,
      event: schema.events,
      user: schema.users,
      table: schema.tables,
    })
    .from(schema.bookings)
    .leftJoin(schema.events, eq(schema.bookings.eventId, schema.events.id))
    .leftJoin(schema.users, eq(schema.bookings.userId, schema.users.id))
    .leftJoin(schema.tables, eq(schema.bookings.tableId, schema.tables.id))
    .where(eq(schema.bookings.userId, userId))
    .orderBy(desc(schema.bookings.createdAt));

    return bookings.map(({ booking, event, user, table }) => ({
      ...booking,
      event: event!,
      user: user!,
      table: table!,
    }));
  }

  async getBookingsByEventId(eventId: number): Promise<BookingWithDetails[]> {
    const bookings = await db.select({
      booking: schema.bookings,
      event: schema.events,
      user: schema.users,
      table: schema.tables,
    })
    .from(schema.bookings)
    .leftJoin(schema.events, eq(schema.bookings.eventId, schema.events.id))
    .leftJoin(schema.users, eq(schema.bookings.userId, schema.users.id))
    .leftJoin(schema.tables, eq(schema.bookings.tableId, schema.tables.id))
    .where(eq(schema.bookings.eventId, eventId))
    .orderBy(desc(schema.bookings.createdAt));

    return bookings.map(({ booking, event, user, table }) => ({
      ...booking,
      event: event!,
      user: user!,
      table: table!,
    }));
  }

  async getBooking(id: number): Promise<Booking | null> {
    const result = await db.select().from(schema.bookings).where(eq(schema.bookings.id, id));
    return result[0] || null;
  }

  async getBookingWithDetails(id: number): Promise<BookingWithDetails | null> {
    const bookings = await db.select({
      booking: schema.bookings,
      event: schema.events,
      user: schema.users,
      table: schema.tables,
    })
    .from(schema.bookings)
    .leftJoin(schema.events, eq(schema.bookings.eventId, schema.events.id))
    .leftJoin(schema.users, eq(schema.bookings.userId, schema.users.id))
    .leftJoin(schema.tables, eq(schema.bookings.tableId, schema.tables.id))
    .where(eq(schema.bookings.id, id));

    const booking = bookings[0];
    if (!booking) return null;

    return {
      ...booking.booking,
      event: booking.event!,
      user: booking.user!,
      table: booking.table!,
    };
  }

  async getAllBookingsWithDetails(): Promise<BookingWithDetails[]> {
    const bookings = await db.select({
      booking: schema.bookings,
      event: schema.events,
      user: schema.users,
      table: schema.tables,
    })
    .from(schema.bookings)
    .leftJoin(schema.events, eq(schema.bookings.eventId, schema.events.id))
    .leftJoin(schema.users, eq(schema.bookings.userId, schema.users.id))
    .leftJoin(schema.tables, eq(schema.bookings.tableId, schema.tables.id))
    .orderBy(desc(schema.bookings.createdAt));

    return bookings.map(({ booking, event, user, table }) => ({
      ...booking,
      event: event!,
      user: user!,
      table: table!,
    }));
  }

  async getBookingByPaymentId(paymentId: string): Promise<Booking | null> {
    const result = await db.select().from(schema.bookings).where(eq(schema.bookings.stripePaymentId, paymentId));
    return result[0] || null;
  }

  async createBooking(bookingData: any): Promise<number> {
    console.log("🔍 STORAGE DEBUG: About to insert booking data:", JSON.stringify(bookingData, null, 2));
    try {
      const result = await db.insert(schema.bookings).values(bookingData).returning({ id: schema.bookings.id });
      console.log("✅ STORAGE SUCCESS: Insert completed:", result[0].id);
      return result[0].id;
    } catch (error) {
      console.log("❌ STORAGE ERROR:", error);
      throw error;
    }
  }

  async updateBooking(id: number, bookingData: Partial<Booking>): Promise<Booking | null> {
    const result = await db.update(schema.bookings).set(bookingData).where(eq(schema.bookings.id, id)).returning();
    return result[0] || null;
  }

  async deleteBooking(id: number): Promise<boolean> {
    const result = await db.delete(schema.bookings).where(eq(schema.bookings.id, id));
    return result.rowCount > 0;
  }

  async getTablesByEventId(eventId: number): Promise<Table[]> {
    const event = await this.getEventById(eventId);
    if (!event) return [];
    return await this.getTablesByVenue(event.venueId);
  }

  async getAvailableTablesByEventId(eventId: number): Promise<Table[]> {
    const allTables = await this.getTablesByEventId(eventId);
    const bookedTables = await db.select({ tableId: schema.bookings.tableId })
      .from(schema.bookings)
      .where(and(
        eq(schema.bookings.eventId, eventId),
        eq(schema.bookings.status, 'confirmed')
      ));
    
    const bookedTableIds = bookedTables.map(b => b.tableId);
    return allTables.filter(t => !bookedTableIds.includes(t.id));
  }

  async updateEventAvailability(eventId: number): Promise<boolean> {
    // This would recalculate available tables for the event
    return true;
  }

  async checkInBooking(bookingId: number, checkedInBy: number): Promise<Booking | null> {
    const result = await db.update(schema.bookings)
      .set({ 
        checkedIn: true, 
        checkedInAt: new Date(), 
        checkedInBy 
      })
      .where(eq(schema.bookings.id, bookingId))
      .returning();
    return result[0] || null;
  }

  async updateBookingStatus(id: number, status: string, modifiedBy?: number): Promise<Booking | null> {
    const result = await db.update(schema.bookings)
      .set({ 
        status, 
        lastModified: new Date(), 
        modifiedBy 
      })
      .where(eq(schema.bookings.id, id))
      .returning();
    return result[0] || null;
  }

  async processRefund(bookingId: number, refundAmount: number, refundId: string, modifiedBy: number): Promise<Booking | null> {
    const result = await db.update(schema.bookings)
      .set({ 
        refundAmount, 
        refundId, 
        status: 'refunded',
        lastModified: new Date(), 
        modifiedBy 
      })
      .where(eq(schema.bookings.id, bookingId))
      .returning();
    return result[0] || null;
  }

  async updateTableStatus(tableId: number, status: string): Promise<boolean> {
    const result = await db.update(schema.tables)
      .set({ status })
      .where(eq(schema.tables.id, tableId));
    return result.rowCount > 0;
  }

  async releaseTableManually(bookingId: number, modifiedBy: number, reason?: string): Promise<Booking | null> {
    // Release table without processing refund - for manual release only
    const booking = await this.getBooking(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    // Update booking to canceled status without refund processing
    const result = await db.update(schema.bookings)
      .set({ 
        status: 'canceled',
        lastModified: new Date(), 
        modifiedBy,
        notes: booking.notes ? `${booking.notes} | Manual release: ${reason || 'No reason provided'}` : `Manual release: ${reason || 'No reason provided'}`
      })
      .where(eq(schema.bookings.id, bookingId))
      .returning();

    return result[0] || null;
  }

  async cancelBooking(bookingId: number, modifiedBy: number): Promise<Booking | null> {
    // First get the booking to find the table ID
    const booking = await this.getBooking(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    // Update booking status to cancelled
    const result = await db.update(schema.bookings)
      .set({ 
        status: 'cancelled',
        lastModified: new Date(), 
        modifiedBy 
      })
      .where(eq(schema.bookings.id, bookingId))
      .returning();

    if (result[0]) {
      // Release the table by updating its status to available
      await this.updateTableStatus(booking.tableId, 'available');
      
      // Send cancellation email using the proper template
      try {
        const { EmailService } = require('./email-service');
        
        // Get event and table details for the email
        const event = await this.getEventById(booking.eventId);
        const table = await this.getTable(booking.tableId);
        const venue = await this.getVenueById(table?.venueId || 4); // Default to main venue
        
        // Prepare booking data in the correct format for the template
        const bookingEmailData = {
          booking: {
            id: booking.id.toString(),
            customerEmail: booking.customerEmail,
            partySize: booking.partySize,
            status: booking.status,
            notes: booking.notes || '',
            stripePaymentId: booking.stripePaymentId || '',
            createdAt: booking.createdAt,
            guestNames: booking.guestNames || []
          },
          event: {
            id: event?.id?.toString() || '',
            title: event?.title || 'Event',
            date: event?.date || new Date(),
            description: event?.description || ''
          },
          table: {
            id: table?.id?.toString() || '',
            tableNumber: table?.tableNumber || booking.tableId,
            floor: table?.floor || 'Main Floor',
            capacity: table?.capacity || booking.partySize
          },
          venue: {
            id: venue?.id?.toString() || '',
            name: venue?.name || 'The Treasury 1929',
            address: '2 E Congress St, Ste 100, Tucson, AZ'
          }
        };
        
        // Calculate 100% refund from booking total amount
        const refundAmountCents = booking.totalAmount || 0;
        
        await EmailService.sendCancellationEmail(bookingEmailData, refundAmountCents);
      } catch (emailError) {
        console.error("Failed to send cancellation email:", emailError);
        // Don't fail the cancellation if email fails
      }
    }

    return result[0] || null;
  }

  // Table methods
  async getVenues(): Promise<{ id: number, name: string }[]> {
    const venues = await db.select({ id: schema.venues.id, name: schema.venues.name })
      .from(schema.venues)
      .where(eq(schema.venues.isActive, true));
    return venues;
  }

  async getTables(): Promise<Table[]> {
    return await db.select().from(schema.tables);
  }

  async getTablesByVenue(venueId: number, eventId?: number): Promise<Table[]> {
    if (eventId) {
      console.log(`🚨 CRITICAL: Real-time table status for venue ${venueId}, event ${eventId}`);
      
      // Get base tables first
      const baseTables = await db.select().from(schema.tables).where(eq(schema.tables.venueId, venueId));
      console.log(`📊 Base tables loaded: ${baseTables.length}`);
      
      // Apply real-time status calculation for each table
      const tablesWithStatus = await Promise.all(baseTables.map(async (table) => {
        // Check for confirmed bookings
        const confirmedBooking = await db.select().from(schema.bookings)
          .where(and(
            eq(schema.bookings.tableId, table.id),
            eq(schema.bookings.eventId, eventId),
            eq(schema.bookings.status, 'confirmed')
          ))
          .limit(1);
        
        if (confirmedBooking.length > 0) {
          console.log(`🔴 Table ${table.tableNumber} is BOOKED (booking: ${confirmedBooking[0].id})`);
          return { ...table, status: 'booked' as const };
        }
        
        // Check for active seat holds
        const activeSeatHold = await db.select().from(schema.seatHolds)
          .where(and(
            eq(schema.seatHolds.tableId, table.id),
            eq(schema.seatHolds.eventId, eventId),
            eq(schema.seatHolds.status, 'active'),
            sql`${schema.seatHolds.holdExpiry} > NOW()`
          ))
          .limit(1);
        
        if (activeSeatHold.length > 0) {
          console.log(`🟠 Table ${table.tableNumber} is on HOLD (hold: ${activeSeatHold[0].id})`);
          return { ...table, status: 'hold' as const };
        }
        
        console.log(`🟢 Table ${table.tableNumber} is AVAILABLE`);
        return { ...table, status: 'available' as const };
      }));
      
      return tablesWithStatus as Table[];
    } else {
      // Default behavior for non-event specific requests
      return await db.select().from(schema.tables).where(eq(schema.tables.venueId, venueId));
    }
  }

  async getTablesByVenueAndFloor(venueId: number, floor: string): Promise<Table[]> {
    return await db.select().from(schema.tables)
      .where(and(eq(schema.tables.venueId, venueId), eq(schema.tables.floor, floor)));
  }

  async getTablesWithSeats(venueId: number): Promise<TableWithSeats[]> {
    const tables = await this.getTablesByVenue(venueId);
    const tablesWithSeats = [];
    
    for (const table of tables) {
      const seats = await this.getTableSeats(table.id);
      tablesWithSeats.push({ ...table, seats });
    }
    
    return tablesWithSeats;
  }

  async getTable(id: number): Promise<Table | null> {
    const result = await db.select().from(schema.tables).where(eq(schema.tables.id, id));
    return result[0] || null;
  }

  async getTableById(id: number): Promise<Table | null> {
    const result = await db.select().from(schema.tables).where(eq(schema.tables.id, id));
    return result[0] || null;
  }

  async getTableWithSeats(id: number): Promise<TableWithSeats | null> {
    const table = await this.getTable(id);
    if (!table) return null;
    
    const seats = await this.getTableSeats(id);
    return { ...table, seats };
  }

  async createTable(tableData: any): Promise<number> {
    const result = await db.insert(schema.tables).values(tableData).returning({ id: schema.tables.id });
    return result[0].id;
  }

  async updateTable(id: number, tableData: Partial<Table>): Promise<boolean> {
    const result = await db.update(schema.tables).set(tableData).where(eq(schema.tables.id, id));
    return result.rowCount > 0;
  }

  async deleteTable(id: number): Promise<boolean> {
    // First delete all seats associated with this table
    await db.delete(schema.seats).where(eq(schema.seats.tableId, id));
    // Then delete the table
    const result = await db.delete(schema.tables).where(eq(schema.tables.id, id));
    return result.rowCount! > 0;
  }

  // Seat methods
  async getSeats(): Promise<Seat[]> {
    return await db.select().from(schema.seats);
  }

  async getTableSeats(tableId: number): Promise<Seat[]> {
    return await db.select().from(schema.seats).where(eq(schema.seats.tableId, tableId));
  }

  async getSeat(id: number): Promise<Seat | null> {
    const result = await db.select().from(schema.seats).where(eq(schema.seats.id, id));
    return result[0] || null;
  }

  async createSeat(seatData: any): Promise<number> {
    const result = await db.insert(schema.seats).values(seatData).returning({ id: schema.seats.id });
    return result[0].id;
  }

  async updateSeat(id: number, seatData: Partial<Seat>): Promise<boolean> {
    const result = await db.update(schema.seats).set(seatData).where(eq(schema.seats.id, id));
    return result.rowCount > 0;
  }

  async deleteSeat(id: number): Promise<boolean> {
    const result = await db.delete(schema.seats).where(eq(schema.seats.id, id));
    return result.rowCount > 0;
  }

  // Menu methods
  async getMenuCategories(): Promise<string[]> {
    const result = await db.selectDistinct({ category: schema.menuItems.category }).from(schema.menuItems);
    return result.map(r => r.category).filter(Boolean) as string[];
  }

  async getMenuItems(category?: string): Promise<MenuItem[]> {
    if (category) {
      return await db.select().from(schema.menuItems).where(eq(schema.menuItems.category, category));
    }
    return await db.select().from(schema.menuItems);
  }

  async getMenuItem(id: number): Promise<MenuItem | null> {
    const result = await db.select().from(schema.menuItems).where(eq(schema.menuItems.id, id));
    return result[0] || null;
  }

  async createMenuItem(itemData: any): Promise<number> {
    const result = await db.insert(schema.menuItems).values(itemData).returning({ id: schema.menuItems.id });
    return result[0].id;
  }

  async updateMenuItem(id: number, itemData: Partial<MenuItem>): Promise<boolean> {
    const result = await db.update(schema.menuItems).set(itemData).where(eq(schema.menuItems.id, id));
    return result.rowCount > 0;
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    const result = await db.delete(schema.menuItems).where(eq(schema.menuItems.id, id));
    return result.rowCount > 0;
  }

  // Staff methods
  async getVenueStaff(): Promise<VenueStaff[]> {
    return await db.select().from(schema.venueStaff).where(eq(schema.venueStaff.isActive, true));
  }

  async getStaffMember(id: number): Promise<VenueStaff | null> {
    const result = await db.select().from(schema.venueStaff).where(eq(schema.venueStaff.id, id));
    return result[0] || null;
  }

  async getStaffByUserId(userId: number): Promise<VenueStaff | null> {
    const result = await db.select().from(schema.venueStaff).where(eq(schema.venueStaff.userId, userId));
    return result[0] || null;
  }

  async createStaffMember(staffData: any): Promise<number> {
    const result = await db.insert(schema.venueStaff).values(staffData).returning({ id: schema.venueStaff.id });
    return result[0].id;
  }

  async updateStaffMember(id: number, staffData: Partial<VenueStaff>): Promise<boolean> {
    const result = await db.update(schema.venueStaff).set(staffData).where(eq(schema.venueStaff.id, id));
    return result.rowCount > 0;
  }

  async deleteStaffMember(id: number): Promise<boolean> {
    const result = await db.update(schema.venueStaff).set({ isActive: false }).where(eq(schema.venueStaff.id, id));
    return result.rowCount > 0;
  }

  // Utility methods
  async clearAllBookings(): Promise<boolean> {
    await db.delete(schema.bookings);
    return true;
  }

  // Food Options methods
  async getFoodOptionsByDisplayOrder(): Promise<any[]> {
    return await db.select().from(schema.foodOptions).orderBy(asc(schema.foodOptions.displayOrder));
  }

  async getRandomizedFoodOptions(eventId: number): Promise<any[]> {
    // First check if this event has specific food options configured
    const eventFoodOptions = await this.getEventFoodOptions(eventId);
    
    if (eventFoodOptions.length > 0) {
      // If event has specific options, limit to 3 per category
      return this.limitToThreePerCategory(eventFoodOptions);
    }
    
    // If no specific options configured, get all options and limit to 3 per category
    const allOptions = await db.select().from(schema.foodOptions).orderBy(asc(schema.foodOptions.displayOrder));
    return this.limitToThreePerCategory(allOptions);
  }

  private limitToThreePerCategory(options: any[]): any[] {
    const categorized = {
      salad: options.filter(opt => opt.type === 'salad').slice(0, 3),
      entree: options.filter(opt => opt.type === 'entree').slice(0, 3),
      dessert: options.filter(opt => opt.type === 'dessert').slice(0, 3)
    };
    
    return [...categorized.salad, ...categorized.entree, ...categorized.dessert];
  }

  // Event Food Options methods
  async getEventFoodOptions(eventId: number): Promise<any[]> {
    const result = await db
      .select({
        id: schema.foodOptions.id,
        name: schema.foodOptions.name,
        description: schema.foodOptions.description,
        type: schema.foodOptions.type,
        price: schema.foodOptions.price,
        allergens: schema.foodOptions.allergens,
        dietaryRestrictions: schema.foodOptions.dietaryRestrictions,
        displayOrder: schema.foodOptions.displayOrder,
        image: schema.foodOptions.image,
        isAvailable: schema.eventFoodOptions.isAvailable,
        customPrice: schema.eventFoodOptions.customPrice,
      })
      .from(schema.eventFoodOptions)
      .innerJoin(schema.foodOptions, eq(schema.eventFoodOptions.foodOptionId, schema.foodOptions.id))
      .where(and(
        eq(schema.eventFoodOptions.eventId, eventId),
        eq(schema.eventFoodOptions.isAvailable, true)
      ))
      .orderBy(asc(schema.foodOptions.displayOrder));

    return result.map(item => ({
      ...item,
      price: item.customPrice || item.price // Use custom price if set
    }));
  }

  async updateEventFoodOptions(eventId: number, foodOptionIds: number[]): Promise<void> {
    // First, remove all existing event food options for this event
    await db.delete(schema.eventFoodOptions)
      .where(eq(schema.eventFoodOptions.eventId, eventId));

    // Then, add the new ones
    if (foodOptionIds.length > 0) {
      const insertData = foodOptionIds.map(foodOptionId => ({
        eventId,
        foodOptionId,
        isAvailable: true
      }));

      await db.insert(schema.eventFoodOptions).values(insertData);
    }
  }

  async getFoodOptionsByIds(ids: number[]): Promise<any[]> {
    return await db.select().from(schema.foodOptions).where(eq(schema.foodOptions.id, ids[0]));
  }

  async createFoodOption(foodData: any): Promise<any> {
    const result = await db.insert(schema.foodOptions).values(foodData).returning();
    return result[0];
  }

  async updateFoodOption(id: number, foodData: any): Promise<any> {
    const result = await db.update(schema.foodOptions).set(foodData).where(eq(schema.foodOptions.id, id)).returning();
    return result[0];
  }

  async deleteFoodOption(id: number): Promise<boolean> {
    const result = await db.delete(schema.foodOptions).where(eq(schema.foodOptions.id, id));
    return result.rowCount > 0;
  }

  async updateFoodOptionsOrder(orderedIds: number[]): Promise<boolean> {
    // Update display order for each food option
    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(schema.foodOptions)
        .set({ displayOrder: i })
        .where(eq(schema.foodOptions.id, orderedIds[i]));
    }
    return true;
  }

  async getEventFoodTotals(eventId: number): Promise<any> {
    // Get all bookings for this event that have food selections
    const bookingsWithFood = await db
      .select({
        id: schema.bookings.id,
        foodSelections: schema.bookings.foodSelections
      })
      .from(schema.bookings)
      .where(and(
        eq(schema.bookings.eventId, eventId),
        eq(schema.bookings.status, 'confirmed')
      ));

    // Get all food options to map IDs to names
    const allFoodOptions = await db.select().from(schema.foodOptions);
    const foodOptionsMap = new Map(allFoodOptions.map(opt => [opt.id, opt]));

    // Initialize totals structure
    const totals = {
      salads: {} as Record<string, number>,
      entrees: {} as Record<string, number>,
      desserts: {} as Record<string, number>
    };

    // Process each booking's food selections
    for (const booking of bookingsWithFood) {
      if (!booking.foodSelections || !Array.isArray(booking.foodSelections)) {
        continue;
      }

      // Process each food selection in the booking
      for (const selection of booking.foodSelections) {
        if (!selection || typeof selection !== 'object') {
          continue;
        }

        // Process salad selection
        if (selection.salad && typeof selection.salad === 'number') {
          const foodOption = foodOptionsMap.get(selection.salad);
          if (foodOption && foodOption.type === 'salad') {
            const key = foodOption.name;
            totals.salads[key] = (totals.salads[key] || 0) + 1;
          }
        }

        // Process entree selection
        if (selection.entree && typeof selection.entree === 'number') {
          const foodOption = foodOptionsMap.get(selection.entree);
          if (foodOption && foodOption.type === 'entree') {
            const key = foodOption.name;
            totals.entrees[key] = (totals.entrees[key] || 0) + 1;
          }
        }

        // Process dessert selection
        if (selection.dessert && typeof selection.dessert === 'number') {
          const foodOption = foodOptionsMap.get(selection.dessert);
          if (foodOption && foodOption.type === 'dessert') {
            const key = foodOption.name;
            totals.desserts[key] = (totals.desserts[key] || 0) + 1;
          }
        }
      }
    }

    return totals;
  }

  async getEventOrdersWithDetails(eventId: number): Promise<any[]> {
    const bookings = await db.select({
      id: schema.bookings.id,
      tableId: schema.bookings.tableId,
      partySize: schema.bookings.partySize,
      guestNames: schema.bookings.guestNames,
      foodSelections: schema.bookings.foodSelections,
      wineSelections: schema.bookings.wineSelections,
      orderTracking: schema.bookings.orderTracking,
      customerEmail: schema.bookings.customerEmail,
      status: schema.bookings.status,
      createdAt: schema.bookings.createdAt,
      checkedIn: schema.bookings.checkedIn,
      checkedInAt: schema.bookings.checkedInAt,
      tableNumber: schema.tables.tableNumber,
      tableCapacity: schema.tables.capacity,
      tableZone: schema.tables.zone,
      tablePriceCategory: schema.tables.priceCategory,
    })
      .from(schema.bookings)
      .innerJoin(schema.tables, eq(schema.bookings.tableId, schema.tables.id))
      .where(and(
        eq(schema.bookings.eventId, eventId),
        eq(schema.bookings.status, 'confirmed')
      ))
      .orderBy(asc(schema.tables.tableNumber));

    // Get all food options to map IDs to names
    const allFoodOptions = await db.select().from(schema.foodOptions);
    const foodOptionsMap = new Map(allFoodOptions.map(opt => [opt.id, opt]));

    // Process bookings to include detailed food information
    const detailedOrders = bookings.map(booking => {
      let processedFoodSelections = [];
      
      // First check if we have order tracking data (preferred method)
      if (booking.orderTracking) {
        try {
          const orderData = JSON.parse(booking.orderTracking);
          if (orderData && orderData.orders && Array.isArray(orderData.orders)) {
            processedFoodSelections = orderData.orders.map((order: any) => ({
              guestName: order.guestName,
              guestNumber: order.guestName === 'Table Service' ? 999 : 
                         processedFoodSelections.length + 1,
              items: order.orderItems.map((item: any) => ({
                type: item.type.charAt(0).toUpperCase() + item.type.slice(1), // Capitalize
                name: item.itemName,
                quantity: item.quantity,
                dietary: [] // Will be filled from food options if needed
              })),
              status: order.status || 'pending',
              orderTracking: true // Flag to indicate this came from order tracking
            }));
          }
        } catch (e) {
          console.error('Error parsing order tracking for booking', booking.id, e);
        }
      }
      
      // Fallback to food selections if no order tracking data
      if (processedFoodSelections.length === 0 && booking.foodSelections && Array.isArray(booking.foodSelections)) {
        booking.foodSelections.forEach((selection, index) => {
          if (selection && typeof selection === 'object') {
            // Handle both object and array formats for guestNames
            let guestName = `Guest ${index + 1}`;
            if (booking.guestNames) {
              if (Array.isArray(booking.guestNames)) {
                guestName = booking.guestNames[index] || `Guest ${index + 1}`;
              } else if (typeof booking.guestNames === 'object') {
                // guestNames is stored as {"1": "NAME1", "2": "NAME2", ...}
                // Map array index (0, 1, 2...) to object key ("1", "2", "3"...)
                const guestKey = String(index + 1);
                guestName = booking.guestNames[guestKey] || `Guest ${index + 1}`;
              }
            }
            
            const guestOrder = {
              guestName,
              guestNumber: index + 1,
              items: [] as Array<{type: string, name: string, dietary: string[]}>
            };

            // Process salad
            if (selection.salad && typeof selection.salad === 'number') {
              const foodOption = foodOptionsMap.get(selection.salad);
              if (foodOption) {
                guestOrder.items.push({
                  type: 'Salad',
                  name: foodOption.name,
                  dietary: foodOption.dietaryRestrictions || []
                });
              }
            }

            // Process entree
            if (selection.entree && typeof selection.entree === 'number') {
              const foodOption = foodOptionsMap.get(selection.entree);
              if (foodOption) {
                guestOrder.items.push({
                  type: 'Entree',
                  name: foodOption.name,
                  dietary: foodOption.dietaryRestrictions || []
                });
              }
            }

            // Process dessert
            if (selection.dessert && typeof selection.dessert === 'number') {
              const foodOption = foodOptionsMap.get(selection.dessert);
              if (foodOption) {
                guestOrder.items.push({
                  type: 'Dessert',
                  name: foodOption.name,
                  dietary: foodOption.dietaryRestrictions || []
                });
              }
            }

            if (guestOrder.items.length > 0) {
              processedFoodSelections.push(guestOrder);
            }
          }
        });
        
        // Process wine selections separately for fallback method
        if (booking.wineSelections && Array.isArray(booking.wineSelections)) {
          const wineItems = booking.wineSelections.map((wine: any) => ({
            type: 'Wine',
            name: wine.name,
            quantity: wine.quantity || 1
          }));
          
          if (wineItems.length > 0) {
            processedFoodSelections.push({
              guestName: 'Table Service',
              guestNumber: 999,
              items: wineItems
            });
          }
        }
      }

      return {
        bookingId: booking.id,
        tableNumber: booking.tableNumber,
        tableId: booking.tableId,
        tableZone: booking.tableZone || 'General',
        tablePriceCategory: booking.tablePriceCategory || 'standard',
        partySize: booking.partySize,
        customerEmail: booking.customerEmail,
        status: booking.status,
        createdAt: booking.createdAt,
        checkedIn: booking.checkedIn,
        checkedInAt: booking.checkedInAt,
        guestOrders: processedFoodSelections,
        totalGuests: processedFoodSelections.length,
        hasOrders: processedFoodSelections.length > 0
      };
    });

    return detailedOrders;
  }

  async updateBookingFoodSelections(bookingId: number, foodSelections: any, modifiedBy: number): Promise<any> {
    const result = await db.update(schema.bookings)
      .set({ 
        foodSelections,
        modifiedBy
      })
      .where(eq(schema.bookings.id, bookingId))
      .returning();
    return result[0];
  }

  // Get event orders with details for PDF generation
  async getEventOrdersWithDetails(eventId: number): Promise<any[]> {
    const result = await db.select({
      bookingId: schema.bookings.id,
      tableNumber: sql`COALESCE(${schema.tables.tableNumber}, ${schema.bookings.tableId})`.as('tableNumber'),
      tableId: schema.bookings.tableId,
      tableZone: sql`'General'`.as('tableZone'),
      tablePriceCategory: sql`'Standard'`.as('tablePriceCategory'),
      partySize: schema.bookings.partySize,
      customerEmail: schema.bookings.customerEmail,
      status: schema.bookings.status,
      createdAt: schema.bookings.createdAt,
      checkedIn: schema.bookings.checkedIn,
      checkedInAt: schema.bookings.checkedInAt,
      orderTracking: schema.bookings.orderTracking,
      foodSelections: schema.bookings.foodSelections,
      guestNames: schema.bookings.guestNames
    })
    .from(schema.bookings)
    .leftJoin(schema.tables, eq(schema.bookings.tableId, schema.tables.id))
    .where(and(
      eq(schema.bookings.eventId, eventId),
      eq(schema.bookings.status, 'confirmed')
    ));

    console.log(`Found ${result.length} bookings for event ${eventId}`);
    result.forEach(booking => {
      console.log(`  Booking ${booking.bookingId}: table ${booking.tableNumber}, email ${booking.customerEmail}, has orderTracking: ${!!booking.orderTracking}`);
    });

    // Get all food options to map IDs to names for fallback
    const allFoodOptions = await db.select().from(schema.foodOptions);
    const foodOptionsMap = new Map(allFoodOptions.map(opt => [opt.id, opt]));

    // Transform order tracking data to match expected format
    const processedBookings = result.map(booking => {
      let guestOrders = [];
      
      if (booking.orderTracking) {
        try {
          // Parse orderTracking if it's a string
          const orderData = typeof booking.orderTracking === 'string' 
            ? JSON.parse(booking.orderTracking) 
            : booking.orderTracking;
          
          console.log(`Processing booking ${booking.bookingId} with order data:`, {
            hasOrders: !!orderData.orders,
            orderCount: orderData.orders?.length || 0
          });
          
          if (orderData.orders && Array.isArray(orderData.orders)) {
            guestOrders = orderData.orders.map((order: any, index: number) => ({
              guestName: order.guestName || `Guest ${index + 1}`,
              guestNumber: index + 1,
              items: order.orderItems ? order.orderItems.map((item: any) => ({
                type: item.type || 'unknown',
                name: item.itemName || item.name || 'Unknown Item',
                dietary: []
              })) : []
            }));
          }
        } catch (error) {
          console.error(`Error parsing order tracking for booking ${booking.bookingId}:`, error);
        }
      }
      
      // Fallback to food selections if no order tracking data
      if (guestOrders.length === 0 && booking.foodSelections && Array.isArray(booking.foodSelections)) {
        console.log(`Processing booking ${booking.bookingId} with fallback food selections`);
        
        booking.foodSelections.forEach((selection: any, index: number) => {
          if (selection && typeof selection === 'object') {
            // Handle guest names
            let guestName = `Guest ${index + 1}`;
            if (booking.guestNames) {
              if (Array.isArray(booking.guestNames)) {
                guestName = booking.guestNames[index] || `Guest ${index + 1}`;
              } else if (typeof booking.guestNames === 'object') {
                const guestKey = String(index + 1);
                guestName = booking.guestNames[guestKey] || `Guest ${index + 1}`;
              }
            }
            
            const guestOrder = {
              guestName,
              guestNumber: index + 1,
              items: [] as Array<{type: string, name: string, dietary: string[]}>
            };

            // Process salad (handle both numeric ID and object format)
            let saladId = null;
            if (selection.salad) {
              if (typeof selection.salad === 'number') {
                saladId = selection.salad;
              } else if (selection.salad.id) {
                saladId = selection.salad.id;
              }
            }
            if (saladId) {
              const foodOption = foodOptionsMap.get(saladId);
              if (foodOption) {
                guestOrder.items.push({
                  type: 'salad',
                  name: foodOption.name,
                  dietary: foodOption.dietaryRestrictions || []
                });
              }
            }

            // Process entree (handle both numeric ID and object format)
            let entreeId = null;
            if (selection.entree) {
              if (typeof selection.entree === 'number') {
                entreeId = selection.entree;
              } else if (selection.entree.id) {
                entreeId = selection.entree.id;
              }
            }
            if (entreeId) {
              const foodOption = foodOptionsMap.get(entreeId);
              if (foodOption) {
                guestOrder.items.push({
                  type: 'entree',
                  name: foodOption.name,
                  dietary: foodOption.dietaryRestrictions || []
                });
              }
            }

            // Process dessert (handle both numeric ID and object format)
            let dessertId = null;
            if (selection.dessert) {
              if (typeof selection.dessert === 'number') {
                dessertId = selection.dessert;
              } else if (selection.dessert.id) {
                dessertId = selection.dessert.id;
              }
            }
            if (dessertId) {
              const foodOption = foodOptionsMap.get(dessertId);
              if (foodOption) {
                guestOrder.items.push({
                  type: 'dessert',
                  name: foodOption.name,
                  dietary: foodOption.dietaryRestrictions || []
                });
              }
            }

            if (guestOrder.items.length > 0) {
              guestOrders.push(guestOrder);
            }
          }
        });
      }

      const processedBooking = {
        ...booking,
        guestOrders,
        totalGuests: guestOrders.length,
        hasOrders: guestOrders.some((guest: any) => guest.items.length > 0)
      };
      
      console.log(`Processed booking ${booking.bookingId}: ${processedBooking.hasOrders ? 'HAS ORDERS' : 'NO ORDERS'}, ${processedBooking.totalGuests} guests`);
      
      return processedBooking;
    });

    const bookingsWithOrders = processedBookings.filter(booking => booking.hasOrders);
    console.log(`Returning ${bookingsWithOrders.length} bookings with orders out of ${result.length} total bookings`);
    
    return bookingsWithOrders;
  }

  // Layout methods (stub implementations)
  async getFloors(venueId: number): Promise<any[]> {
    return [];
  }

  async getZones(venueId: number): Promise<any[]> {
    return [];
  }

  async getLayoutTemplates(venueId: number): Promise<any[]> {
    return [];
  }

  async saveLayoutTemplate(venueId: number, templateData: any): Promise<any> {
    return null;
  }

  async updateFloorImage(venueId: number, floorId: string, imageUrl: string): Promise<boolean> {
    return true;
  }

  // Seat Hold methods for concurrency control
  async createSeatHold(holdData: any): Promise<number | null> {
    try {
      // First, clean up any expired holds for this table
      await db.delete(schema.seatHolds)
        .where(and(
          eq(schema.seatHolds.eventId, holdData.eventId),
          eq(schema.seatHolds.tableId, holdData.tableId),
          sql`${schema.seatHolds.holdExpiry} < NOW()`
        ));

      // Try to create the new hold
      const result = await db.insert(schema.seatHolds).values(holdData).returning({ id: schema.seatHolds.id });
      return result[0].id;
    } catch (error) {
      console.error("Error creating seat hold:", error);
      return null;
    }
  }

  async getActiveSeatHolds(eventId: number, tableId: number): Promise<any[]> {
    const currentTime = new Date();
    return await db.select().from(schema.seatHolds)
      .where(and(
        eq(schema.seatHolds.eventId, eventId),
        eq(schema.seatHolds.tableId, tableId),
        eq(schema.seatHolds.status, 'active'),
        gt(schema.seatHolds.holdExpiry, currentTime)
      ));
  }

  async getSeatHoldByToken(lockToken: string): Promise<any> {
    const result = await db.select().from(schema.seatHolds)
      .where(eq(schema.seatHolds.lockToken, lockToken));
    return result[0] || null;
  }

  async expireSeatHold(holdId: number): Promise<boolean> {
    const result = await db.update(schema.seatHolds)
      .set({ status: 'expired' })
      .where(eq(schema.seatHolds.id, holdId));
    return result.rowCount > 0;
  }

  async completeSeatHold(holdId: number): Promise<boolean> {
    const result = await db.update(schema.seatHolds)
      .set({ status: 'completed' })
      .where(eq(schema.seatHolds.id, holdId));
    return result.rowCount > 0;
  }

  // Clean up expired holds periodically
  async cleanupExpiredHolds(): Promise<number> {
    const result = await db.update(schema.seatHolds)
      .set({ status: 'expired' })
      .where(and(
        eq(schema.seatHolds.status, 'active'),
        sql`${schema.seatHolds.holdExpiry} < NOW()`
      ));
    return result.rowCount;
  }

  // Admin Log methods
  async createAdminLog(logData: InsertAdminLog): Promise<number> {
    const result = await db.insert(schema.adminLogs).values(logData).returning({ id: schema.adminLogs.id });
    return result[0].id;
  }

  async getAdminLogs(): Promise<AdminLog[]> {
    return await db.select().from(schema.adminLogs).orderBy(desc(schema.adminLogs.createdAt));
  }

  async getAdminLogsByEntityType(entityType: string): Promise<AdminLog[]> {
    return await db.select().from(schema.adminLogs)
      .where(eq(schema.adminLogs.entityType, entityType))
      .orderBy(desc(schema.adminLogs.createdAt));
  }

  // Missing methods to prevent crashes
  async updateEventsOrder(orderedIds: number[]): Promise<boolean> {
    try {
      for (let i = 0; i < orderedIds.length; i++) {
        await db.update(schema.events)
          .set({ displayOrder: i })
          .where(eq(schema.events.id, orderedIds[i]));
      }
      return true;
    } catch (error) {
      console.error('Error updating events order:', error);
      return false;
    }
  }

  async getBookingByQRCode(bookingId: number): Promise<Booking | null> {
    const result = await db.select().from(schema.bookings).where(eq(schema.bookings.id, bookingId)).limit(1);
    return result[0] || null;
  }

  async changeBookingSeats(bookingId: number, newTableId: number, newSeats: number[]): Promise<Booking | null> {
    try {
      const result = await db.update(schema.bookings)
        .set({ 
          tableId: newTableId, 
          seatNumbers: newSeats,
          partySize: newSeats.length 
        })
        .where(eq(schema.bookings.id, bookingId))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error changing booking seats:', error);
      return null;
    }
  }

  async addBookingNote(bookingId: number, note: string): Promise<Booking | null> {
    try {
      const result = await db.update(schema.bookings)
        .set({ notes: note })
        .where(eq(schema.bookings.id, bookingId))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error adding booking note:', error);
      return null;
    }
  }

  async getEventCheckInStats(eventId: number): Promise<any> {
    try {
      const bookings = await db.select()
        .from(schema.bookings)
        .where(eq(schema.bookings.eventId, eventId));
      
      const totalBookings = bookings.length;
      const checkedIn = bookings.filter(b => b.status === 'checked-in').length;
      
      return {
        totalBookings,
        checkedIn,
        remaining: totalBookings - checkedIn
      };
    } catch (error) {
      console.error('Error getting check-in stats:', error);
      return { totalBookings: 0, checkedIn: 0, remaining: 0 };
    }
  }
}

export const storage = new PgStorage();