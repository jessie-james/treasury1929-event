import { 
  type Event, type FoodOption, type Booking, type Table, type Seat,
  type SeatBooking, type InsertBooking, type User, type InsertUser,
  type AdminLog, type InsertAdminLog, type SeatPosition, type InsertSeatPosition,
  events, foodOptions, bookings, users, adminLogs, seatPositions
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { type InsertEvent } from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getUsers(): Promise<User[]>; // Added getUsers method

  // Events
  getEvents(): Promise<Event[]>;
  getEventsByDisplayOrder(): Promise<Event[]>; // Get events ordered by display_order
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<void>;
  updateEventsOrder(orderedIds: number[]): Promise<void>; // Update display order of events

  // Tables and Seats
  getTables(): Promise<Table[]>;
  getTableSeats(tableId: number): Promise<Seat[]>;
  getTableSeatsAvailability(tableId: number, eventId: number): Promise<SeatBooking[]>;
  updateSeatAvailability(tableId: number, seatNumbers: number[], eventId: number, isBooked: boolean): Promise<void>;

  // Food Options
  getFoodOptions(): Promise<FoodOption[]>;
  getFoodOptionsByDisplayOrder(): Promise<FoodOption[]>; // Get food options ordered by display_order
  getRandomizedFoodOptions(eventId: number): Promise<FoodOption[]>; // Get random food options per event (3 per category)
  getFoodOptionsByIds(ids: number[]): Promise<FoodOption[]>;
  createFoodOption(foodOption: Omit<FoodOption, "id">): Promise<FoodOption>;
  updateFoodOption(id: number, foodOption: Partial<Omit<FoodOption, "id">>): Promise<FoodOption | undefined>;
  deleteFoodOption(id: number): Promise<void>;
  updateFoodOptionsOrder(orderedIds: number[]): Promise<void>; // Update display order of food options

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
  
  // Booking Management (Admin)
  getBookingById(id: number): Promise<Booking | undefined>;
  getBookingWithDetails(id: number): Promise<(Booking & { event: Event, foodItems: FoodOption[], user: User }) | undefined>;
  createManualBooking(booking: InsertBooking, adminId: number): Promise<Booking | undefined>;
  updateBooking(
    id: number, 
    updates: Partial<Booking>, 
    modifiedBy: number
  ): Promise<Booking | undefined>;
  changeBookingSeats(
    bookingId: number, 
    newTableId: number, 
    newSeatNumbers: number[], 
    modifiedBy: number
  ): Promise<Booking | undefined>;
  updateBookingFoodSelections(
    bookingId: number, 
    newFoodSelections: Record<string, Record<string, number>>, 
    modifiedBy: number
  ): Promise<Booking | undefined>;
  addBookingNote(bookingId: number, note: string, modifiedBy: number): Promise<Booking | undefined>;
  processRefund(
    bookingId: number, 
    refundAmount: number, 
    refundId: string, 
    modifiedBy: number
  ): Promise<Booking | undefined>;
  cancelBooking(bookingId: number, modifiedBy: number): Promise<Booking | undefined>;
  
  // Ticket Check-in
  checkInBooking(bookingId: number, staffId: number): Promise<Booking | undefined>;
  getBookingByQRCode(bookingId: number): Promise<(Booking & { event: Event, foodItems: FoodOption[], user: User }) | undefined>;
  getCheckedInBookings(eventId: number): Promise<Booking[]>;
  getEventCheckInStats(eventId: number): Promise<{
    totalBookings: number;
    checkedInBookings: number;
    checkedInPercentage: number;
    foodStats: {
      salads: { total: number; checkedIn: number; percentage: number; byItem: Record<number, { total: number; checkedIn: number; percentage: number; }> };
      entrees: { total: number; checkedIn: number; percentage: number; byItem: Record<number, { total: number; checkedIn: number; percentage: number; }> };
      desserts: { total: number; checkedIn: number; percentage: number; byItem: Record<number, { total: number; checkedIn: number; percentage: number; }> };
      wines: { total: number; checkedIn: number; percentage: number; byItem: Record<number, { total: number; checkedIn: number; percentage: number; }> };
    };
  }>;
  
  // Admin Logs
  createAdminLog(log: InsertAdminLog): Promise<AdminLog>;
  getAdminLogs(): Promise<AdminLog[]>;
  getAdminLogsByEntityType(entityType: string): Promise<AdminLog[]>;
  getAdminLogsByAdmin(adminId: number): Promise<AdminLog[]>;
  
  // Seat Positions
  getSeatPositions(floorPlan: string): Promise<SeatPosition[]>;
  getSeatPosition(floorPlan: string, tableId: number, seatNumber: number): Promise<SeatPosition | undefined>;
  createSeatPosition(position: InsertSeatPosition): Promise<SeatPosition>;
  updateSeatPosition(id: number, position: Partial<InsertSeatPosition>): Promise<SeatPosition | undefined>;
  deleteSeatPosition(id: number): Promise<void>;
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
  
  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    try {
      console.log(`Updating user ${id} with:`, { ...updates, password: updates.password ? "[REDACTED]" : undefined });
      const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();
      
      if (!updated) {
        throw new Error(`User with ID ${id} not found`);
      }
      
      console.log(`User ${id} updated successfully`);
      return updated;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw error;
    }
  }
  
  async deleteUser(id: number): Promise<void> {
    try {
      console.log(`Deleting user ${id}`);
      const result = await db
        .delete(users)
        .where(eq(users.id, id));
      
      console.log(`User ${id} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
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
  
  async getEventsByDisplayOrder(): Promise<Event[]> {
    try {
      return await db.select()
        .from(events)
        .orderBy(events.displayOrder);
    } catch (error) {
      console.error("Error fetching events by display order:", error);
      throw error;
    }
  }
  
  async updateEventsOrder(orderedIds: number[]): Promise<void> {
    try {
      console.log("Updating events display order:", orderedIds);
      // Update display order for each event based on its position in orderedIds array
      for (let i = 0; i < orderedIds.length; i++) {
        await db.update(events)
          .set({ displayOrder: i })
          .where(eq(events.id, orderedIds[i]));
      }
      console.log("Events display order updated successfully");
    } catch (error) {
      console.error("Error updating events order:", error);
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
      // This is a temporary implementation since tables table has been removed
      console.log("Using temporary table implementation");
      return [
        // These will be reimplemented with a new approach
      ];
    } catch (error) {
      console.error("Error fetching tables:", error);
      throw error;
    }
  }

  async getTableSeats(tableId: number): Promise<Seat[]> {
    try {
      console.log(`Using temporary seats implementation for table ID: ${tableId}`);
      return [
        // These will be reimplemented with a new approach
      ];
    } catch (error) {
      console.error("Error fetching table seats:", error);
      throw error;
    }
  }

  async getTableSeatsAvailability(tableId: number, eventId: number): Promise<SeatBooking[]> {
    try {
      console.log(`Using temporary seat availability implementation for table ${tableId}, event ${eventId}`);
      return [
        // These will be reimplemented with a new approach
      ];
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
      console.log(`Using temporary implementation for updating seat availability`);
      console.log(`Table ${tableId}, seats ${seatNumbers.join(", ")} to ${isBooked ? "booked" : "available"}`);
      // This will be reimplemented with a new approach
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
  
  async getFoodOptionsByDisplayOrder(): Promise<FoodOption[]> {
    try {
      // Get all food options and manually sort them
      const allFoodOptions = await db.select().from(foodOptions);
      
      // Sort first by type, then by displayOrder
      return allFoodOptions.sort((a, b) => {
        // First compare by type
        if (a.type !== b.type) {
          return a.type.localeCompare(b.type);
        }
        
        // Then by displayOrder within the same type
        return (a.displayOrder || 0) - (b.displayOrder || 0);
      });
    } catch (error) {
      console.error("Error fetching food options by display order:", error);
      throw error;
    }
  }
  
  async updateFoodOptionsOrder(orderedIds: number[]): Promise<void> {
    try {
      console.log("Updating food options display order:", orderedIds);
      
      // Get the food type from the first item to ensure we're only reordering items of the same type
      if (orderedIds.length === 0) return;
      
      const firstFoodItem = await db
        .select()
        .from(foodOptions)
        .where(eq(foodOptions.id, orderedIds[0]))
        .limit(1);
        
      if (firstFoodItem.length === 0) return;
      
      const foodType = firstFoodItem[0].type;
      console.log(`Reordering food items of type: ${foodType}`);
      
      // Get current food items of this type, ordered by display order
      let foodItemsOfType = await db
        .select()
        .from(foodOptions)
        .where(eq(foodOptions.type, foodType))
        .orderBy(foodOptions.displayOrder);
        
      // Create a map of IDs to existing display orders to preserve relative order
      const existingOrderMap = new Map<number, number>();
      foodItemsOfType.forEach((item, index) => {
        existingOrderMap.set(item.id, item.displayOrder !== null ? item.displayOrder : index);
      });
      
      // Update the display order based on the new order
      for (let i = 0; i < orderedIds.length; i++) {
        await db.update(foodOptions)
          .set({ displayOrder: i })
          .where(eq(foodOptions.id, orderedIds[i]));
      }
      
      console.log("Food options display order updated successfully");
    } catch (error) {
      console.error("Error updating food options order:", error);
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
    // Validate the essential booking fields
    if (!booking.eventId || !booking.userId || !booking.tableId || 
        !booking.seatNumbers || !booking.seatNumbers.length || 
        !booking.stripePaymentId || !booking.customerEmail) {
      console.error("Invalid booking data:", booking);
      throw new Error("Missing required booking fields");
    }

    console.log("Creating new booking with data:", JSON.stringify(booking, null, 2));
    
    try {
      // Create the booking record first
      console.log("Inserting booking record...");
      const [created] = await db.insert(bookings).values(booking).returning();
      console.log("Booking created successfully:", JSON.stringify(created, null, 2));

      // Then update seat availability as a separate operation
      await this.updateSeatAvailability(
        booking.tableId,
        booking.seatNumbers,
        booking.eventId,
        true
      );

      return created;
    } catch (error) {
      console.error("Error creating booking:", error);
      // Add more context to the error for debugging
      if (error instanceof Error) {
        error.message = `Failed to create booking: ${error.message}`;
      }
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
          // Extract unique food IDs from the selections
          const foodIdsArray: number[] = [];
          Object.values(foodSelections).forEach(selections => {
            Object.values(selections).forEach(id => {
              if (id && !foodIdsArray.includes(id)) {
                foodIdsArray.push(id);
              }
            });
          });

          const foodItems = await this.getFoodOptionsByIds(foodIdsArray);

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
        // Skip canceled or refunded bookings
        if (booking.status === 'canceled' || booking.status === 'refunded') {
          return;
        }
        
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
  
  // Booking Management Methods
  async getBookingById(id: number): Promise<Booking | undefined> {
    try {
      console.log(`Fetching booking with ID: ${id}`);
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
      return booking;
    } catch (error) {
      console.error("Error fetching booking:", error);
      throw error;
    }
  }
  
  async getBookingWithDetails(id: number): Promise<(Booking & { event: Event, foodItems: FoodOption[], user: User }) | undefined> {
    try {
      console.log(`Fetching detailed booking with ID: ${id}`);
      const booking = await this.getBookingById(id);
      
      if (!booking) {
        return undefined;
      }
      
      const event = await this.getEvent(booking.eventId);
      const user = await this.getUser(booking.userId);
      
      if (!event || !user) {
        throw new Error("Unable to find event or user associated with booking");
      }
      
      // Extract food IDs from the selections
      const foodSelections = booking.foodSelections as Record<string, Record<string, number>>;
      const foodIdsArray: number[] = [];
      
      Object.values(foodSelections).forEach(selections => {
        Object.values(selections).forEach(id => {
          if (id && !foodIdsArray.includes(id)) {
            foodIdsArray.push(id);
          }
        });
      });
      
      const foodItems = await this.getFoodOptionsByIds(foodIdsArray);
      
      return {
        ...booking,
        event,
        foodItems,
        user
      };
    } catch (error) {
      console.error("Error fetching booking with details:", error);
      throw error;
    }
  }
  
  async updateBooking(id: number, updates: Partial<Booking>, modifiedBy: number): Promise<Booking | undefined> {
    try {
      console.log(`Updating booking ${id} with:`, updates);
      
      // Add modification tracking data
      const updatedData = {
        ...updates,
        lastModified: new Date(),
        modifiedBy
      };
      
      const [updated] = await db
        .update(bookings)
        .set(updatedData)
        .where(eq(bookings.id, id))
        .returning();
        
      return updated;
    } catch (error) {
      console.error("Error updating booking:", error);
      throw error;
    }
  }
  
  async changeBookingSeats(
    bookingId: number, 
    newTableId: number, 
    newSeatNumbers: number[], 
    modifiedBy: number
  ): Promise<Booking | undefined> {
    try {
      console.log(`Changing seats for booking ${bookingId} to table ${newTableId}, seats ${newSeatNumbers.join(", ")}`);
      
      // Get the original booking
      const booking = await this.getBookingById(bookingId);
      if (!booking) {
        throw new Error("Booking not found");
      }
      
      // Release the old seat allocations
      await this.updateSeatAvailability(
        booking.tableId,
        booking.seatNumbers as number[],
        booking.eventId,
        false
      );
      
      // Allocate the new seats
      await this.updateSeatAvailability(
        newTableId,
        newSeatNumbers,
        booking.eventId,
        true
      );
      
      // Update the booking record
      const [updated] = await db
        .update(bookings)
        .set({
          tableId: newTableId,
          seatNumbers: newSeatNumbers,
          status: "modified",
          lastModified: new Date(),
          modifiedBy
        })
        .where(eq(bookings.id, bookingId))
        .returning();
        
      return updated;
    } catch (error) {
      console.error("Error changing booking seats:", error);
      throw error;
    }
  }
  
  async updateBookingFoodSelections(
    bookingId: number, 
    newFoodSelections: Record<string, Record<string, number>>, 
    modifiedBy: number
  ): Promise<Booking | undefined> {
    try {
      console.log(`Updating food selections for booking ${bookingId}`);
      
      const [updated] = await db
        .update(bookings)
        .set({
          foodSelections: newFoodSelections,
          status: "modified",
          lastModified: new Date(),
          modifiedBy
        })
        .where(eq(bookings.id, bookingId))
        .returning();
        
      return updated;
    } catch (error) {
      console.error("Error updating booking food selections:", error);
      throw error;
    }
  }
  
  async addBookingNote(bookingId: number, note: string, modifiedBy: number): Promise<Booking | undefined> {
    try {
      console.log(`Adding note to booking ${bookingId}`);
      
      // Get the current booking to append to any existing notes
      const booking = await this.getBookingById(bookingId);
      if (!booking) {
        throw new Error("Booking not found");
      }
      
      // Format the new note with timestamp and admin info
      const timestamp = new Date().toISOString();
      const formattedNote = `[${timestamp}] Admin #${modifiedBy}: ${note}`;
      
      // Combine with existing notes or create new notes
      const updatedNotes = booking.notes 
        ? `${booking.notes}\n\n${formattedNote}`
        : formattedNote;
      
      const [updated] = await db
        .update(bookings)
        .set({
          notes: updatedNotes,
          lastModified: new Date(),
          modifiedBy
        })
        .where(eq(bookings.id, bookingId))
        .returning();
        
      return updated;
    } catch (error) {
      console.error("Error adding booking note:", error);
      throw error;
    }
  }
  
  async processRefund(
    bookingId: number, 
    refundAmount: number, 
    refundId: string, 
    modifiedBy: number
  ): Promise<Booking | undefined> {
    try {
      console.log(`Processing refund for booking ${bookingId}, amount: ${refundAmount}, refund ID: ${refundId}`);
      
      const [updated] = await db
        .update(bookings)
        .set({
          status: "refunded",
          refundAmount,
          refundId,
          lastModified: new Date(),
          modifiedBy
        })
        .where(eq(bookings.id, bookingId))
        .returning();
        
      return updated;
    } catch (error) {
      console.error("Error processing refund:", error);
      throw error;
    }
  }
  
  async cancelBooking(bookingId: number, modifiedBy: number): Promise<Booking | undefined> {
    try {
      console.log(`Canceling booking ${bookingId}`);
      
      // Get the booking to release seats
      const booking = await this.getBookingById(bookingId);
      if (!booking) {
        throw new Error("Booking not found");
      }
      
      // Release the seat allocations
      await this.updateSeatAvailability(
        booking.tableId,
        booking.seatNumbers as number[],
        booking.eventId,
        false
      );
      
      // Update event seat availability
      await this.updateEventAvailability(booking.eventId, -(booking.seatNumbers as number[]).length);
      
      // Update the booking record
      const [updated] = await db
        .update(bookings)
        .set({
          status: "canceled",
          lastModified: new Date(),
          modifiedBy
        })
        .where(eq(bookings.id, bookingId))
        .returning();
      
      // Log this action
      await this.createAdminLog({
        userId: modifiedBy,
        action: "cancel_booking",
        entityType: "booking",
        entityId: bookingId,
        details: { bookingData: booking },
      });
        
      return updated;
    } catch (error) {
      console.error("Error canceling booking:", error);
      throw error;
    }
  }
  
  async createManualBooking(booking: InsertBooking, adminId: number): Promise<Booking | undefined> {
    try {
      console.log(`Creating manual booking by admin ${adminId}`);
      
      // Make sure guestNames is an object (even if empty)
      if (!booking.guestNames) {
        booking.guestNames = {};
      }
      
      // Make sure foodSelections is an object with entries for each seat
      if (!booking.foodSelections || Object.keys(booking.foodSelections).length === 0) {
        const foodSelections: Record<string, Record<string, number>> = {};
        
        // Get first food item of each type
        const salads = await db
          .select()
          .from(foodOptions)
          .where(eq(foodOptions.type, "salad"))
          .limit(1);
          
        const entrees = await db
          .select()
          .from(foodOptions)
          .where(eq(foodOptions.type, "entree"))
          .limit(1);
          
        const desserts = await db
          .select()
          .from(foodOptions)
          .where(eq(foodOptions.type, "dessert"))
          .limit(1);
          
        // Assign default food selections for each seat
        for (const seatNumber of booking.seatNumbers) {
          foodSelections[seatNumber.toString()] = {
            salad: salads.length > 0 ? salads[0].id : 0,
            entree: entrees.length > 0 ? entrees[0].id : 0,
            dessert: desserts.length > 0 ? desserts[0].id : 0
          };
        }
        
        booking.foodSelections = foodSelections;
      }
      
      // Set default status for manual bookings
      const manualBooking: InsertBooking = {
        ...booking,
        status: "confirmed",
        createdAt: new Date(),
        stripePaymentId: `manual-${Date.now()}-${adminId}`, // Create a pseudo payment ID for tracking
      };
      
      console.log("Creating manual booking with data:", JSON.stringify(manualBooking, null, 2));
      
      // Create the booking
      const createdBooking = await this.createBooking(manualBooking);
      
      // Log this action
      await this.createAdminLog({
        userId: adminId,
        action: "create_manual_booking",
        entityType: "booking",
        entityId: createdBooking.id,
        details: { bookingData: createdBooking },
      });
      
      return createdBooking;
    } catch (error) {
      console.error("Error creating manual booking:", error);
      throw error;
    }
  }
  
  // Admin Logs Methods
  async createAdminLog(log: InsertAdminLog): Promise<AdminLog> {
    try {
      console.log(`Creating admin log for action: ${log.action}`, JSON.stringify(log, null, 2));
      // Make sure details is a valid JSON object, not undefined
      if (!log.details) {
        log.details = {};
      }
      
      const [created] = await db.insert(adminLogs).values(log).returning();
      console.log("Admin log created successfully:", JSON.stringify(created, null, 2));
      return created;
    } catch (error) {
      console.error("Error creating admin log:", error);
      console.error("Log data that caused error:", JSON.stringify(log, null, 2));
      throw error;
    }
  }
  
  async getAdminLogs(): Promise<AdminLog[]> {
    try {
      return await db
        .select()
        .from(adminLogs);
    } catch (error) {
      console.error("Error fetching admin logs:", error);
      throw error;
    }
  }
  
  async getAdminLogsByEntityType(entityType: string): Promise<AdminLog[]> {
    try {
      return await db
        .select()
        .from(adminLogs)
        .where(eq(adminLogs.entityType, entityType));
    } catch (error) {
      console.error(`Error fetching admin logs for entity type ${entityType}:`, error);
      throw error;
    }
  }
  
  async getAdminLogsByAdmin(adminId: number): Promise<AdminLog[]> {
    try {
      return await db
        .select()
        .from(adminLogs)
        .where(eq(adminLogs.userId, adminId));
    } catch (error) {
      console.error(`Error fetching admin logs for admin ID ${adminId}:`, error);
      throw error;
    }
  }

  // Seat Position methods
  async getSeatPositions(floorPlan: string): Promise<SeatPosition[]> {
    try {
      console.log(`Fetching seat positions for floor plan: ${floorPlan}`);
      return await db
        .select()
        .from(seatPositions)
        .where(eq(seatPositions.floorPlan, floorPlan));
    } catch (error) {
      console.error("Error fetching seat positions:", error);
      throw error;
    }
  }

  async getSeatPosition(floorPlan: string, tableId: number, seatNumber: number): Promise<SeatPosition | undefined> {
    try {
      console.log(`Fetching seat position for floor plan: ${floorPlan}, table: ${tableId}, seat: ${seatNumber}`);
      const [position] = await db
        .select()
        .from(seatPositions)
        .where(
          and(
            eq(seatPositions.floorPlan, floorPlan),
            eq(seatPositions.tableId, tableId),
            eq(seatPositions.seatNumber, seatNumber)
          )
        );
      return position;
    } catch (error) {
      console.error("Error fetching seat position:", error);
      throw error;
    }
  }

  async createSeatPosition(position: InsertSeatPosition): Promise<SeatPosition> {
    try {
      console.log("Creating new seat position:", position);
      const [created] = await db
        .insert(seatPositions)
        .values(position)
        .returning();
      console.log("Seat position created successfully:", created);
      return created;
    } catch (error) {
      console.error("Error creating seat position:", error);
      throw error;
    }
  }

  async updateSeatPosition(id: number, position: Partial<InsertSeatPosition>): Promise<SeatPosition | undefined> {
    try {
      console.log(`Updating seat position ${id} with:`, position);
      // Always update the updatedAt timestamp
      const updates = {
        ...position,
        updatedAt: new Date()
      };
      
      const [updated] = await db
        .update(seatPositions)
        .set(updates)
        .where(eq(seatPositions.id, id))
        .returning();
      
      if (!updated) {
        console.log(`Seat position with ID ${id} not found`);
        return undefined;
      }
      
      console.log(`Seat position ${id} updated successfully`);
      return updated;
    } catch (error) {
      console.error(`Error updating seat position ${id}:`, error);
      throw error;
    }
  }

  async deleteSeatPosition(id: number): Promise<void> {
    try {
      console.log(`Deleting seat position ${id}`);
      await db
        .delete(seatPositions)
        .where(eq(seatPositions.id, id));
      
      console.log(`Seat position ${id} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting seat position ${id}:`, error);
      throw error;
    }
  }

  // Ticket Check-in Methods
  async checkInBooking(bookingId: number, staffId: number): Promise<Booking | undefined> {
    try {
      console.log(`Checking in booking ${bookingId} by staff ${staffId}`);
      
      // Get booking details before update
      const booking = await this.getBookingById(bookingId);
      if (!booking) {
        console.error(`Booking ${bookingId} not found for check-in`);
        return undefined;
      }
      
      // Verify booking is not already checked in
      if (booking.checkedIn) {
        console.warn(`Booking ${bookingId} is already checked in`);
        return booking;
      }
      
      // Update booking check-in status
      const [updatedBooking] = await db
        .update(bookings)
        .set({
          checkedIn: true,
          checkedInAt: new Date(),
          checkedInBy: staffId,
          lastModified: new Date(),
          modifiedBy: staffId,
        })
        .where(eq(bookings.id, bookingId))
        .returning();
      
      if (!updatedBooking) {
        throw new Error(`Failed to update booking ${bookingId}`);
      }
      
      // Log the check-in in admin logs
      await this.createAdminLog({
        userId: staffId,
        action: "check_in_booking",
        entityType: "booking",
        entityId: bookingId,
        details: {
          bookingId,
          eventId: booking.eventId,
          seatNumbers: booking.seatNumbers,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log(`Booking ${bookingId} checked in successfully`);
      return updatedBooking;
    } catch (error) {
      console.error(`Error checking in booking ${bookingId}:`, error);
      throw error;
    }
  }
  
  async getBookingByQRCode(bookingId: number): Promise<(Booking & { event: Event, foodItems: FoodOption[], user: User }) | undefined> {
    try {
      console.log(`Getting booking details for QR code scanning, booking ID: ${bookingId}`);
      return await this.getBookingWithDetails(bookingId);
    } catch (error) {
      console.error(`Error getting booking by QR code ${bookingId}:`, error);
      throw error;
    }
  }
  
  async getCheckedInBookings(eventId: number): Promise<Booking[]> {
    try {
      console.log(`Getting checked-in bookings for event ${eventId}`);
      const checkedInBookings = await db
        .select()
        .from(bookings)
        .where(and(
          eq(bookings.eventId, eventId),
          eq(bookings.checkedIn, true)
        ));
      
      return checkedInBookings;
    } catch (error) {
      console.error(`Error getting checked-in bookings for event ${eventId}:`, error);
      throw error;
    }
  }
  
  async getEventCheckInStats(eventId: number): Promise<{
    totalBookings: number;
    checkedInBookings: number;
    checkedInPercentage: number;
    foodStats: {
      salads: { total: number; checkedIn: number; percentage: number; byItem: Record<number, { total: number; checkedIn: number; percentage: number; }> };
      entrees: { total: number; checkedIn: number; percentage: number; byItem: Record<number, { total: number; checkedIn: number; percentage: number; }> };
      desserts: { total: number; checkedIn: number; percentage: number; byItem: Record<number, { total: number; checkedIn: number; percentage: number; }> };
      wines: { total: number; checkedIn: number; percentage: number; byItem: Record<number, { total: number; checkedIn: number; percentage: number; }> };
    };
  }> {
    try {
      console.log(`Getting check-in stats for event ${eventId}`);
      
      // Get all bookings for this event
      const eventBookings = await db
        .select()
        .from(bookings)
        .where(eq(bookings.eventId, eventId));
      
      // Filter checked-in bookings
      const checkedInBookings = eventBookings.filter(booking => booking.checkedIn);
      
      // Get all food options
      const allFoodOptions = await this.getFoodOptions();
      
      // Initialize food stats
      const foodStats = {
        salads: { total: 0, checkedIn: 0, percentage: 0, byItem: {} as Record<number, { total: number; checkedIn: number; percentage: number; }> },
        entrees: { total: 0, checkedIn: 0, percentage: 0, byItem: {} as Record<number, { total: number; checkedIn: number; percentage: number; }> },
        desserts: { total: 0, checkedIn: 0, percentage: 0, byItem: {} as Record<number, { total: number; checkedIn: number; percentage: number; }> },
        wines: { total: 0, checkedIn: 0, percentage: 0, byItem: {} as Record<number, { total: number; checkedIn: number; percentage: number; }> }
      };
      
      // Initialize byItem for each food option
      allFoodOptions.forEach(option => {
        const type = option.type === 'entree' ? 'entrees' : 
                     option.type === 'salad' ? 'salads' : 
                     option.type === 'dessert' ? 'desserts' : 
                     option.type === 'wine' ? 'wines' : null;
                     
        if (type) {
          foodStats[type].byItem[option.id] = { 
            total: 0, 
            checkedIn: 0, 
            percentage: 0 
          };
        }
      });
      
      // Process food selections for all bookings
      eventBookings.forEach(booking => {
        const isCheckedIn = booking.checkedIn;
        
        // Process each seat's food selection
        booking.seatNumbers.forEach(seatNumber => {
          const seatSelections = (booking.foodSelections as any)[seatNumber.toString()];
          if (!seatSelections) return;
          
          // Process each food type
          Object.entries(seatSelections).forEach(([type, foodId]) => {
            if (!foodId) return;
            
            const mappedType = type === 'entree' ? 'entrees' : 
                              type === 'salad' ? 'salads' : 
                              type === 'dessert' ? 'desserts' : 
                              type === 'wine' ? 'wines' : null;
                              
            if (mappedType && typeof foodId === 'number') {
              // Increment total counts
              foodStats[mappedType].total++;
              
              if (foodStats[mappedType].byItem[foodId]) {
                foodStats[mappedType].byItem[foodId].total++;
              
                // If booking is checked in, increment checked-in counts
                if (isCheckedIn) {
                  foodStats[mappedType].checkedIn++;
                  foodStats[mappedType].byItem[foodId].checkedIn++;
                }
              }
            }
          });
        });
      });
      
      // Calculate percentages
      Object.keys(foodStats).forEach(type => {
        const stats = foodStats[type as keyof typeof foodStats];
        stats.percentage = stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0;
        
        // Calculate percentages for each item
        Object.keys(stats.byItem).forEach(itemId => {
          const item = stats.byItem[Number(itemId)];
          item.percentage = item.total > 0 ? Math.round((item.checkedIn / item.total) * 100) : 0;
        });
      });
      
      // Calculate overall stats
      const totalBookings = eventBookings.length;
      const totalCheckedIn = checkedInBookings.length;
      const checkedInPercentage = totalBookings > 0 ? Math.round((totalCheckedIn / totalBookings) * 100) : 0;
      
      return {
        totalBookings,
        checkedInBookings: totalCheckedIn,
        checkedInPercentage,
        foodStats
      };
    } catch (error) {
      console.error(`Error getting check-in stats for event ${eventId}:`, error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();