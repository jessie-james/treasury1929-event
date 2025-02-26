import { type Event, type FoodOption, type Booking, type InsertBooking, events, foodOptions, bookings } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  getFoodOptions(): Promise<FoodOption[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateEventAvailability(eventId: number, seatsBooked: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getEvents(): Promise<Event[]> {
    return await db.select().from(events);
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getFoodOptions(): Promise<FoodOption[]> {
    return await db.select().from(foodOptions);
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [created] = await db.insert(bookings).values(booking).returning();
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
}

export const storage = new DatabaseStorage();