import { 
  type Event, type FoodOption, type Booking, type Table, type Seat,
  type InsertBooking, type User, type InsertUser,
  events, foodOptions, bookings, tables, seats, users 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Events
  getEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;

  // Tables and Seats
  getTables(): Promise<Table[]>;
  getTableSeats(tableId: number): Promise<Seat[]>;
  updateSeatAvailability(tableId: number, seatNumbers: number[], isAvailable: boolean): Promise<void>;

  // Food Options
  getFoodOptions(): Promise<FoodOption[]>;

  // Bookings
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateEventAvailability(eventId: number, seatsBooked: number): Promise<void>;
  getBookings(): Promise<Booking[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getEvents(): Promise<Event[]> {
    return await db.select().from(events);
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getTables(): Promise<Table[]> {
    return await db.select().from(tables);
  }

  async getTableSeats(tableId: number): Promise<Seat[]> {
    return await db
      .select()
      .from(seats)
      .where(eq(seats.tableId, tableId))
      .orderBy(seats.seatNumber);
  }

  async updateSeatAvailability(
    tableId: number, 
    seatNumbers: number[], 
    isAvailable: boolean
  ): Promise<void> {
    await db
      .update(seats)
      .set({ isAvailable })
      .where(
        and(
          eq(seats.tableId, tableId),
          inArray(seats.seatNumber, seatNumbers)
        )
      );
  }

  async getFoodOptions(): Promise<FoodOption[]> {
    return await db.select().from(foodOptions);
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [created] = await db.insert(bookings).values(booking).returning();

    // Update seat availability
    await this.updateSeatAvailability(
      booking.tableId,
      booking.seatNumbers,
      false
    );

    return created;
  }

  async updateEventAvailability(eventId: number, seatsBooked: number): Promise<void> {
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId));

    if (!event) throw new Error("Event not found");

    await db
      .update(events)
      .set({ availableSeats: event.availableSeats - seatsBooked })
      .where(eq(events.id, eventId));
  }
  async getBookings(): Promise<Booking[]> {
    return await db.select().from(bookings);
  }
}

export const storage = new DatabaseStorage();