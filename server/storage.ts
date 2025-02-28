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
    try {
      console.log(`Fetching user with ID: ${id}`);
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error fetching user:", error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      console.log(`Fetching user with email: ${email}`);
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error("Error fetching user by email:", error);
      throw error;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      console.log("Creating new user:", { ...user, password: "[REDACTED]" });
      const [created] = await db.insert(users).values(user).returning();
      console.log("User created successfully:", { id: created.id, email: created.email });
      return created;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async getEvents(): Promise<Event[]> {
    try {
      return await db.select().from(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      throw error;
    }
  }

  async getEvent(id: number): Promise<Event | undefined> {
    try {
      console.log(`Fetching event with ID: ${id}`);
      const [event] = await db.select().from(events).where(eq(events.id, id));
      return event;
    } catch (error) {
      console.error("Error fetching event:", error);
      throw error;
    }
  }

  async getTables(): Promise<Table[]> {
    try {
      return await db.select().from(tables);
    } catch (error) {
      console.error("Error fetching tables:", error);
      throw error;
    }
  }

  async getTableSeats(tableId: number): Promise<Seat[]> {
    try {
      console.log(`Fetching seats for table ID: ${tableId}`);
      return await db
        .select()
        .from(seats)
        .where(eq(seats.tableId, tableId))
        .orderBy(seats.seatNumber);
    } catch (error) {
      console.error("Error fetching table seats:", error);
      throw error;
    }
  }

  async updateSeatAvailability(
    tableId: number, 
    seatNumbers: number[], 
    isAvailable: boolean
  ): Promise<void> {
    try {
      console.log(`Updating seat availability for table ${tableId}, seats ${seatNumbers.join(", ")} to ${isAvailable}`);
      await db
        .update(seats)
        .set({ isAvailable })
        .where(
          and(
            eq(seats.tableId, tableId),
            inArray(seats.seatNumber, seatNumbers)
          )
        );
      console.log("Seat availability updated successfully");
    } catch (error) {
      console.error("Error updating seat availability:", error);
      throw error;
    }
  }

  async getFoodOptions(): Promise<FoodOption[]> {
    try {
      return await db.select().from(foodOptions);
    } catch (error) {
      console.error("Error fetching food options:", error);
      throw error;
    }
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    try {
      console.log("Creating new booking:", booking);
      const [created] = await db.insert(bookings).values(booking).returning();
      console.log("Booking created successfully:", created);

      // Update seat availability
      await this.updateSeatAvailability(
        booking.tableId,
        booking.seatNumbers,
        false
      );

      return created;
    } catch (error) {
      console.error("Error creating booking:", error);
      throw error;
    }
  }

  async updateEventAvailability(eventId: number, seatsBooked: number): Promise<void> {
    try {
      console.log(`Updating event ${eventId} availability, seats booked: ${seatsBooked}`);
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId));

      if (!event) throw new Error("Event not found");

      await db
        .update(events)
        .set({ availableSeats: event.availableSeats - seatsBooked })
        .where(eq(events.id, eventId));

      console.log("Event availability updated successfully");
    } catch (error) {
      console.error("Error updating event availability:", error);
      throw error;
    }
  }

  async getBookings(): Promise<Booking[]> {
    try {
      return await db.select().from(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();