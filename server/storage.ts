import { 
  type Event, type FoodOption, type Booking, type Table, type Seat,
  type InsertBooking, type User, type InsertUser, type SeatBooking,
  events, foodOptions, bookings, tables, seats, users, seatBookings
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray } from "drizzle-orm";
import { type InsertEvent } from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>; // Added getUsers method

  // Events
  getEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<void>;

  // Tables and Seats
  getTables(): Promise<Table[]>;
  getTableSeats(tableId: number): Promise<Seat[]>;
  getTableSeatsAvailability(tableId: number, eventId: number): Promise<SeatBooking[]>;
  updateSeatAvailability(tableId: number, seatNumbers: number[], eventId: number, isBooked: boolean): Promise<void>;

  // Food Options
  getFoodOptions(): Promise<FoodOption[]>;
  getFoodOptionsByIds(ids: number[]): Promise<FoodOption[]>;
  createFoodOption(foodOption: Omit<FoodOption, "id">): Promise<FoodOption>;
  updateFoodOption(id: number, foodOption: Partial<Omit<FoodOption, "id">>): Promise<FoodOption | undefined>;
  deleteFoodOption(id: number): Promise<void>;

  // Bookings
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateEventAvailability(eventId: number, seatsBooked: number): Promise<void>;
  getBookings(): Promise<Booking[]>;
  getBookingDetails(): Promise<(Booking & { event: Event, foodItems: FoodOption[] })[]>;
  getEventFoodTotals(eventId: number): Promise<{
    salads: Record<number, number>;
    entrees: Record<number, number>;
    desserts: Record<number, number>;
    wines: Record<number, number>;
  }>;
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

  async getUsers(): Promise<User[]> { // Added getUsers method
    try {
      return await db.select().from(users);
    } catch (error) {
      console.error("Error fetching users:", error);
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

  async getTableSeatsAvailability(tableId: number, eventId: number): Promise<SeatBooking[]> {
    try {
      const tableSeats = await this.getTableSeats(tableId);
      const seatIds = tableSeats.map(seat => seat.id);

      return await db
        .select()
        .from(seatBookings)
        .where(
          and(
            inArray(seatBookings.seatId, seatIds),
            eq(seatBookings.eventId, eventId)
          )
        );
    } catch (error) {
      console.error("Error fetching seat availability:", error);
      throw error;
    }
  }

  async updateSeatAvailability(
    tableId: number, 
    seatNumbers: number[], 
    eventId: number,
    isBooked: boolean
  ): Promise<void> {
    try {
      console.log(`Updating seat availability for table ${tableId}, seats ${seatNumbers.join(", ")} to ${isBooked}`);

      // Get the seat IDs for the given table and seat numbers
      const tableSeats = await db
        .select()
        .from(seats)
        .where(
          and(
            eq(seats.tableId, tableId),
            inArray(seats.seatNumber, seatNumbers)
          )
        );

      const seatIds = tableSeats.map(seat => seat.id);

      // For each seat, ensure there's a booking record and update it
      for (const seatId of seatIds) {
        const [existing] = await db
          .select()
          .from(seatBookings)
          .where(
            and(
              eq(seatBookings.seatId, seatId),
              eq(seatBookings.eventId, eventId)
            )
          );

        if (existing) {
          await db
            .update(seatBookings)
            .set({ isBooked })
            .where(eq(seatBookings.id, existing.id));
        } else {
          await db
            .insert(seatBookings)
            .values({
              seatId,
              eventId,
              isBooked
            });
        }
      }

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

  async getFoodOptionsByIds(ids: number[]): Promise<FoodOption[]> {
    try {
      return await db
        .select()
        .from(foodOptions)
        .where(inArray(foodOptions.id, ids));
    } catch (error) {
      console.error("Error fetching food options by IDs:", error);
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
        booking.eventId,
        true
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

  async getBookingDetails(): Promise<(Booking & { event: Event, foodItems: FoodOption[] })[]> {
    try {
      const bookings = await this.getBookings();
      const enrichedBookings = await Promise.all(
        bookings.map(async (booking) => {
          const event = await this.getEvent(booking.eventId);

          // Extract all unique food IDs from the foodSelections
          const foodSelections = booking.foodSelections as Record<string, Record<string, number>>;
          const foodIds = new Set<number>();
          Object.values(foodSelections).forEach(selections => {
            Object.values(selections).forEach(id => foodIds.add(id));
          });

          const foodItems = await this.getFoodOptionsByIds([...foodIds]);

          return {
            ...booking,
            event: event!,
            foodItems,
          };
        })
      );

      return enrichedBookings;
    } catch (error) {
      console.error("Error fetching booking details:", error);
      throw error;
    }
  }

  async getEventFoodTotals(eventId: number) {
    try {
      const bookingResults = await db
        .select()
        .from(bookings)
        .where(eq(bookings.eventId, eventId));

      const totals = {
        salads: {} as Record<number, number>,
        entrees: {} as Record<number, number>,
        desserts: {} as Record<number, number>,
        wines: {} as Record<number, number>
      };

      bookingResults.forEach(booking => {
        const selections = booking.foodSelections as Record<string, Record<string, number>>;
        Object.values(selections).forEach(selection => {
          if (selection.salad) {
            totals.salads[selection.salad] = (totals.salads[selection.salad] || 0) + 1;
          }
          if (selection.entree) {
            totals.entrees[selection.entree] = (totals.entrees[selection.entree] || 0) + 1;
          }
          if (selection.dessert) {
            totals.desserts[selection.dessert] = (totals.desserts[selection.dessert] || 0) + 1;
          }
          if (selection.wine) {
            totals.wines[selection.wine] = (totals.wines[selection.wine] || 0) + 1;
          }
        });
      });

      return totals;
    } catch (error) {
      console.error("Error getting event food totals:", error);
      throw error;
    }
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    try {
      console.log("Creating event with data:", event);
      const [created] = await db.insert(events).values({
        ...event,
        date: event.date, // Date is already in ISO string format from the client
        availableSeats: event.totalSeats,
      }).returning();
      return created;
    } catch (error) {
      console.error("Error creating event:", error);
      throw error;
    }
  }

  async updateEvent(id: number, eventUpdate: Partial<InsertEvent>): Promise<Event | undefined> {
    try {
      const [updated] = await db
        .update(events)
        .set(eventUpdate)
        .where(eq(events.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error updating event:", error);
      throw error;
    }
  }

  async deleteEvent(id: number): Promise<void> {
    try {
      await db.delete(events).where(eq(events.id, id));
    } catch (error) {
      console.error("Error deleting event:", error);
      throw error;
    }
  }

  async createFoodOption(foodOption: Omit<FoodOption, "id">): Promise<FoodOption> {
    try {
      console.log("Creating food option with data:", foodOption);
      const [created] = await db.insert(foodOptions).values(foodOption).returning();
      return created;
    } catch (error) {
      console.error("Error creating food option:", error);
      throw error;
    }
  }

  async updateFoodOption(id: number, foodOption: Partial<Omit<FoodOption, "id">>): Promise<FoodOption | undefined> {
    try {
      const [updated] = await db
        .update(foodOptions)
        .set(foodOption)
        .where(eq(foodOptions.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error updating food option:", error);
      throw error;
    }
  }

  async deleteFoodOption(id: number): Promise<void> {
    try {
      await db.delete(foodOptions).where(eq(foodOptions.id, id));
    } catch (error) {
      console.error("Error deleting food option:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();