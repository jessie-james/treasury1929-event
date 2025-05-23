import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";
import {
  type User, type Event, type Booking, type BookingWithDetails,
  type Table, type Seat, type TableWithSeats, type MenuItem, type VenueStaff,
  type InsertAdminLog, type AdminLog, type Venue, type Stage, type VenueWithTables
} from "@shared/schema";
import type { IStorage } from "./storage-base.js";
import { eq, and, desc, asc } from "drizzle-orm";
import { hashPassword } from "./auth.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

export class PgStorage implements IStorage {
  
  // User methods
  async getUserById(id: number): Promise<User | null> {
    const result = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return result[0] || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return result[0] || null;
  }

  async createUser(userData: any): Promise<number> {
    if (userData.password) {
      userData.password = await hashPassword(userData.password);
    }
    const result = await db.insert(schema.users).values(userData).returning({ id: schema.users.id });
    return result[0].id;
  }

  async updateUserProfile(userId: number, profile: Partial<User>): Promise<User | null> {
    const result = await db.update(schema.users).set(profile).where(eq(schema.users.id, userId)).returning();
    return result[0] || null;
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<boolean> {
    const hashedPassword = await hashPassword(newPassword);
    const result = await db.update(schema.users).set({ password: hashedPassword }).where(eq(schema.users.id, userId));
    return result.rowCount > 0;
  }

  async updateUserDietaryPreferences(userId: number, allergens: string[], dietaryRestrictions: string[]): Promise<boolean> {
    const result = await db.update(schema.users)
      .set({ allergens, dietaryRestrictions })
      .where(eq(schema.users.id, userId));
    return result.rowCount > 0;
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

    const tables = await this.getTablesByVenue(id);
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
    return await db.select().from(schema.events).orderBy(desc(schema.events.date));
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
  async getBookings(): Promise<Booking[]> {
    return await db.select().from(schema.bookings).orderBy(desc(schema.bookings.createdAt));
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

  async getBookingByPaymentId(paymentId: string): Promise<Booking | null> {
    const result = await db.select().from(schema.bookings).where(eq(schema.bookings.stripePaymentId, paymentId));
    return result[0] || null;
  }

  async createBooking(bookingData: any): Promise<number> {
    const result = await db.insert(schema.bookings).values(bookingData).returning({ id: schema.bookings.id });
    return result[0].id;
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

  async getTablesByVenue(venueId: number): Promise<Table[]> {
    return await db.select().from(schema.tables).where(eq(schema.tables.venueId, venueId));
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
      return eventFoodOptions;
    }
    
    // If no specific options configured, return all food options
    return await db.select().from(schema.foodOptions).orderBy(asc(schema.foodOptions.displayOrder));
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

  // Legacy layout methods removed - using simplified venue design
}

export const storage = new PgStorage();