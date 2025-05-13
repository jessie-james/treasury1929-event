import { MemStorage, type IStorage } from "./storage-base";
import { db } from "./db";
import {
  users, events, tickets, bookings, tables, seats, menuItems,
  venueStaff, venueLayoutTemplates, tableZones, floors,
  type NewUser, type User, type NewEvent, type Event, type NewTicket, type Ticket,
  type NewBooking, type Booking, type BookingWithDetails, type NewTable, type Table,
  type NewSeat, type Seat, type TableWithSeats, type NewMenuItem, type MenuItem,
  type NewVenueStaff, type VenueStaff, type DietaryRestriction, type Allergen
} from "@shared/schema";
import { eq, and, inArray, isNull, or, sql, desc, asc } from "drizzle-orm";
import { hashPassword } from "./auth";

// Specialized methods for PgStorage to handle the actual database operations
class PgStorage implements IStorage {
  // User Methods
  async getUserById(id: number): Promise<User | null> {
    const results = await db.select().from(users).where(eq(users.id, id));
    return results.length > 0 ? results[0] : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const results = await db.select().from(users).where(eq(users.email, email));
    return results.length > 0 ? results[0] : null;
  }

  async createUser(userData: NewUser): Promise<number> {
    // Hash the password before storing
    if (userData.password) {
      userData.password = await hashPassword(userData.password);
    }

    const result = await db.insert(users).values([userData]).returning({ id: users.id });
    return result[0].id;
  }

  async updateUserProfile(userId: number, profile: Partial<User>): Promise<User | null> {
    // Don't allow updating certain fields
    const { id, password, ...safeProfile } = profile as any;

    await db.update(users).set(safeProfile).where(eq(users.id, userId));
    return this.getUserById(userId);
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<boolean> {
    const hashedPassword = await hashPassword(newPassword);
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
    return true;
  }

  async updateUserDietaryPreferences(userId: number, allergens: Allergen[], dietaryRestrictions: DietaryRestriction[]): Promise<boolean> {
    await db.update(users).set({
      allergens,
      dietaryRestrictions
    }).where(eq(users.id, userId));
    return true;
  }

  async updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User | null> {
    await db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId));
    return this.getUserById(userId);
  }

  async updateUserStripeInfo(userId: number, stripeInfo: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<User | null> {
    await db.update(users).set({
      stripeCustomerId: stripeInfo.stripeCustomerId,
      stripeSubscriptionId: stripeInfo.stripeSubscriptionId
    }).where(eq(users.id, userId));
    return this.getUserById(userId);
  }

  // Event Methods
  async getAllEvents(): Promise<Event[]> {
    return db.select().from(events).orderBy(asc(events.displayOrder));
  }

  async getActiveEvents(): Promise<Event[]> {
    return db.select().from(events).where(eq(events.isActive, true)).orderBy(asc(events.displayOrder));
  }

  async getEventById(id: number): Promise<Event | null> {
    const results = await db.select().from(events).where(eq(events.id, id));
    return results.length > 0 ? results[0] : null;
  }

  async createEvent(eventData: NewEvent): Promise<number> {
    const result = await db.insert(events).values(eventData).returning({ id: events.id });
    return result[0].id;
  }

  async updateEvent(id: number, eventData: Partial<NewEvent>): Promise<Event | null> {
    await db.update(events).set(eventData).where(eq(events.id, id));
    return this.getEventById(id);
  }

  async deleteEvent(id: number): Promise<boolean> {
    await db.delete(events).where(eq(events.id, id));
    return true;
  }

  // Booking Methods
  async getBookings(): Promise<Booking[]> {
    return db.select().from(bookings);
  }

  async getBookingsByUserId(userId: number): Promise<BookingWithDetails[]> {
    const result = await db.select()
      .from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));

    const bookingsWithDetails: BookingWithDetails[] = [];
    
    for (const booking of result) {
      const event = await this.getEventById(booking.eventId);
      const user = await this.getUserById(booking.userId);
      const table = await this.getTable(booking.tableId);
      
      if (event && user && table) {
        bookingsWithDetails.push({
          ...booking,
          event,
          user,
          table
        });
      }
    }
    
    return bookingsWithDetails;
  }

  async getBookingsByEventId(eventId: number): Promise<BookingWithDetails[]> {
    const result = await db.select()
      .from(bookings)
      .where(eq(bookings.eventId, eventId))
      .orderBy(desc(bookings.createdAt));

    const bookingsWithDetails: BookingWithDetails[] = [];
    
    for (const booking of result) {
      const event = await this.getEventById(booking.eventId);
      const user = await this.getUserById(booking.userId);
      const table = await this.getTable(booking.tableId);
      
      if (event && user && table) {
        bookingsWithDetails.push({
          ...booking,
          event,
          user,
          table
        });
      }
    }
    
    return bookingsWithDetails;
  }

  async getBooking(id: number): Promise<Booking | null> {
    const results = await db.select().from(bookings).where(eq(bookings.id, id));
    return results.length > 0 ? results[0] : null;
  }

  async getBookingWithDetails(id: number): Promise<BookingWithDetails | null> {
    const booking = await this.getBooking(id);
    if (!booking) return null;

    const event = await this.getEventById(booking.eventId);
    const user = await this.getUserById(booking.userId);
    const table = await this.getTable(booking.tableId);
    
    if (event && user && table) {
      return {
        ...booking,
        event,
        user,
        table
      };
    }
    
    return null;
  }

  async getBookingByPaymentId(paymentId: string): Promise<Booking | null> {
    const results = await db.select().from(bookings).where(eq(bookings.stripePaymentId, paymentId));
    return results.length > 0 ? results[0] : null;
  }

  async createBooking(bookingData: NewBooking): Promise<number> {
    const result = await db.insert(bookings).values(bookingData).returning({ id: bookings.id });
    return result[0].id;
  }

  async updateBooking(id: number, bookingData: Partial<Booking>): Promise<Booking | null> {
    await db.update(bookings).set({
      ...bookingData,
      lastModified: new Date(),
    }).where(eq(bookings.id, id));
    return this.getBooking(id);
  }

  async deleteBooking(id: number): Promise<boolean> {
    await db.delete(bookings).where(eq(bookings.id, id));
    return true;
  }

  async getSeatsByEventId(eventId: number): Promise<any[]> {
    // First get all bookings for this event
    const eventBookings = await db.select().from(bookings).where(eq(bookings.eventId, eventId));
    
    // Gather all seat information
    const reservedSeats = [];
    for (const booking of eventBookings) {
      // Only consider confirmed or pending bookings
      if (booking.status === 'confirmed' || booking.status === 'pending') {
        const tableSeats = await this.getTableSeats(booking.tableId);
        
        // For each seat in the booking, mark it as reserved
        for (const seatNumber of booking.seatNumbers) {
          const seat = tableSeats.find(s => s.seatNumber === seatNumber);
          if (seat) {
            reservedSeats.push({
              seatId: seat.id,
              tableId: booking.tableId,
              seatNumber,
              status: booking.status,
              bookingId: booking.id
            });
          }
        }
      }
    }
    
    return reservedSeats;
  }

  async updateEventAvailability(eventId: number): Promise<boolean> {
    try {
      // Get the event
      const event = await this.getEventById(eventId);
      if (!event) return false;
      
      // Get all tables with their total seat capacity
      const allTables = await this.getTablesWithSeats(event.venueId);
      let totalSeats = 0;
      for (const table of allTables) {
        totalSeats += table.seats.length;
      }
      
      // Get all confirmed and pending bookings for this event
      const confirmedAndPendingBookings = await db.select()
        .from(bookings)
        .where(
          and(
            eq(bookings.eventId, eventId),
            or(
              eq(bookings.status, 'confirmed'),
              eq(bookings.status, 'pending')
            )
          )
        );
      
      // Count reserved seats
      let reservedSeats = 0;
      for (const booking of confirmedAndPendingBookings) {
        reservedSeats += booking.seatNumbers.length;
      }
      
      // Update event availability
      const availableSeats = totalSeats - reservedSeats;
      await db.update(events)
        .set({
          availableSeats,
          totalSeats
        })
        .where(eq(events.id, eventId));
      
      return true;
    } catch (error) {
      console.error("Error updating event availability:", error);
      return false;
    }
  }

  async checkInBooking(bookingId: number, checkedInBy: number): Promise<Booking | null> {
    await db.update(bookings).set({
      checkedIn: true,
      checkedInAt: new Date(),
      checkedInBy,
      lastModified: new Date(),
      modifiedBy: checkedInBy
    }).where(eq(bookings.id, bookingId));
    return this.getBooking(bookingId);
  }

  async updateBookingStatus(id: number, status: string, modifiedBy?: number): Promise<Booking | null> {
    await db.update(bookings).set({
      status,
      lastModified: new Date(),
      modifiedBy
    }).where(eq(bookings.id, id));
    
    const booking = await this.getBooking(id);
    if (booking) {
      // Update event availability
      await this.updateEventAvailability(booking.eventId);
    }
    
    return booking;
  }

  async processRefund(bookingId: number, refundAmount: number, refundId: string, modifiedBy: number): Promise<Booking | null> {
    await db.update(bookings).set({
      status: 'refunded',
      refundAmount,
      refundId,
      lastModified: new Date(),
      modifiedBy
    }).where(eq(bookings.id, bookingId));
    
    const booking = await this.getBooking(bookingId);
    if (booking) {
      // Update event availability
      await this.updateEventAvailability(booking.eventId);
    }
    
    return booking;
  }

  // Table Methods
  async getVenues(): Promise<{ id: number, name: string }[]> {
    // This would typically query a venues table
    // For now, return a static venue
    return [{ id: 1, name: "Elegant Events Venue" }];
  }

  async getTables(): Promise<Table[]> {
    return db.select().from(tables);
  }

  async getTablesByVenue(venueId: number): Promise<Table[]> {
    return db.select().from(tables).where(eq(tables.venueId, venueId));
  }

  async getTablesByVenueAndFloor(venueId: number, floor: string): Promise<Table[]> {
    return db.select().from(tables).where(
      and(
        eq(tables.venueId, venueId),
        eq(tables.floor, floor)
      )
    );
  }

  async getTablesWithSeats(venueId: number): Promise<TableWithSeats[]> {
    try {
      const allTables = await db.select().from(tables).where(eq(tables.venueId, venueId));
      const result: TableWithSeats[] = [];

      for (const table of allTables) {
        const tableSeats = await this.getTableSeats(table.id);
        result.push({
          ...table,
          seats: tableSeats
        });
      }

      return result;
    } catch (error) {
      console.error("Error getting tables with seats:", error);
      throw error;
    }
  }

  async getTable(id: number): Promise<Table | null> {
    const results = await db.select().from(tables).where(eq(tables.id, id));
    return results.length > 0 ? results[0] : null;
  }

  async getTableWithSeats(id: number): Promise<TableWithSeats | null> {
    const table = await this.getTable(id);
    if (!table) return null;
    
    const tableSeats = await this.getTableSeats(id);
    return {
      ...table,
      seats: tableSeats
    };
  }

  async createTable(tableData: NewTable): Promise<number> {
    const result = await db.insert(tables).values(tableData).returning({ id: tables.id });
    const tableId = result[0].id;
    
    // Automatically create seats for the table
    const { capacity } = tableData;
    
    // Calculate positions in a circle around the table
    const radius = 12; // Distance from table center
    const startAngle = 0; // Start position in radians
    
    for (let i = 0; i < capacity; i++) {
      const angle = startAngle + (i * 2 * Math.PI) / capacity;
      const xOffset = Math.round(radius * Math.cos(angle));
      const yOffset = Math.round(radius * Math.sin(angle));
      
      await this.createSeat({
        tableId,
        seatNumber: i + 1,
        xOffset,
        yOffset
      });
    }
    
    return tableId;
  }

  async updateTable(id: number, tableData: Partial<Table>): Promise<boolean> {
    // Don't allow updating table ID
    const { id: tableId, ...safeTableData } = tableData as any;
    
    await db.update(tables).set(safeTableData).where(eq(tables.id, id));
    return true;
  }

  async deleteTable(id: number): Promise<boolean> {
    // First delete all seats for this table
    await db.delete(seats).where(eq(seats.tableId, id));
    
    // Then delete the table
    await db.delete(tables).where(eq(tables.id, id));
    return true;
  }

  // Seat Methods
  async getSeats(): Promise<Seat[]> {
    return db.select().from(seats);
  }

  async getTableSeats(tableId: number): Promise<Seat[]> {
    return db.select().from(seats).where(eq(seats.tableId, tableId));
  }

  async getSeat(id: number): Promise<Seat | null> {
    const results = await db.select().from(seats).where(eq(seats.id, id));
    return results.length > 0 ? results[0] : null;
  }

  async createSeat(seatData: NewSeat): Promise<number> {
    const result = await db.insert(seats).values(seatData).returning({ id: seats.id });
    return result[0].id;
  }

  async updateSeat(id: number, seatData: Partial<Seat>): Promise<boolean> {
    // Don't allow updating seat ID or tableId
    const { id: seatId, tableId, ...safeSeatData } = seatData as any;
    
    await db.update(seats).set(safeSeatData).where(eq(seats.id, id));
    return true;
  }

  async deleteSeat(id: number): Promise<boolean> {
    await db.delete(seats).where(eq(seats.id, id));
    return true;
  }

  // Menu Methods
  async getMenuCategories(): Promise<string[]> {
    // This is a simple implementation that extracts unique categories from menu items
    const items = await db.select().from(menuItems);
    const categories = new Set<string>();
    
    items.forEach(item => {
      if (item.category) {
        categories.add(item.category);
      }
    });
    
    return Array.from(categories);
  }

  async getMenuItems(category?: string): Promise<MenuItem[]> {
    if (category) {
      return db.select().from(menuItems).where(eq(menuItems.category, category));
    }
    return db.select().from(menuItems);
  }

  async getMenuItem(id: number): Promise<MenuItem | null> {
    const results = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return results.length > 0 ? results[0] : null;
  }

  async createMenuItem(itemData: NewMenuItem): Promise<number> {
    const result = await db.insert(menuItems).values(itemData).returning({ id: menuItems.id });
    return result[0].id;
  }

  async updateMenuItem(id: number, itemData: Partial<MenuItem>): Promise<boolean> {
    // Don't allow updating item ID
    const { id: itemId, ...safeItemData } = itemData as any;
    
    await db.update(menuItems).set(safeItemData).where(eq(menuItems.id, id));
    return true;
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
    return true;
  }

  // Venue Staff Management
  async getVenueStaff(): Promise<VenueStaff[]> {
    return db.select().from(venueStaff);
  }

  async getStaffMember(id: number): Promise<VenueStaff | null> {
    const results = await db.select().from(venueStaff).where(eq(venueStaff.id, id));
    return results.length > 0 ? results[0] : null;
  }

  async getStaffByUserId(userId: number): Promise<VenueStaff | null> {
    const results = await db.select().from(venueStaff).where(eq(venueStaff.userId, userId));
    return results.length > 0 ? results[0] : null;
  }

  async createStaffMember(staffData: NewVenueStaff): Promise<number> {
    const result = await db.insert(venueStaff).values(staffData).returning({ id: venueStaff.id });
    return result[0].id;
  }

  async updateStaffMember(id: number, staffData: Partial<VenueStaff>): Promise<boolean> {
    // Don't allow updating staff ID or userId
    const { id: staffId, userId, ...safeStaffData } = staffData as any;
    
    await db.update(venueStaff).set(safeStaffData).where(eq(venueStaff.id, id));
    return true;
  }

  async deleteStaffMember(id: number): Promise<boolean> {
    await db.delete(venueStaff).where(eq(venueStaff.id, id));
    return true;
  }

  // Utility Methods
  async clearAllBookings(): Promise<boolean> {
    await db.delete(bookings);
    
    // Reset availability for all events
    const allEvents = await this.getAllEvents();
    for (const event of allEvents) {
      // Count total seats
      const allTables = await this.getTablesWithSeats(event.venueId);
      let totalSeats = 0;
      for (const table of allTables) {
        totalSeats += table.seats.length;
      }
      
      // Update event
      await db.update(events)
        .set({
          availableSeats: totalSeats,
          totalSeats
        })
        .where(eq(events.id, event.id));
    }
    
    return true;
  }

  // Layout & Template Methods
  async getFloors(venueId: number): Promise<any[]> {
    // This would typically query a floors table
    // For now, return hardcoded floors
    return [
      { id: 'main', name: 'Main Floor', isActive: true },
      { id: 'mezzanine', name: 'Mezzanine', isActive: true },
      { id: 'vip', name: 'VIP Area', isActive: false },
    ];
  }

  async getZones(venueId: number): Promise<any[]> {
    // This would typically query a zones table
    // For now, return hardcoded zones
    return [
      { id: 'front-stage', name: 'Front Stage', color: '#FF5757', tables: [] },
      { id: 'center', name: 'Center', color: '#57B3FF', tables: [] },
      { id: 'back', name: 'Back', color: '#57FFA0', tables: [] },
    ];
  }

  async getLayoutTemplates(venueId: number): Promise<any[]> {
    // This would typically query a layout_templates table
    // For now, return hardcoded templates
    return [
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
  }

  async saveLayoutTemplate(venueId: number, templateData: any): Promise<any> {
    // This would typically save to a layout_templates table
    // For now, return mock data
    return {
      id: Date.now().toString(),
      name: templateData.name,
      description: templateData.description,
      createdAt: new Date(),
      lastModified: new Date()
    };
  }

  async updateFloorImage(venueId: number, floorId: string, imageUrl: string): Promise<boolean> {
    // This would typically update a floor's image in the database
    // For now, just return success
    return true;
  }
}

// Use Postgres storage
export const storage = new PgStorage();