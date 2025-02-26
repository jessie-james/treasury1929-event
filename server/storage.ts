import { type Event, type FoodOption, type Booking, type InsertBooking, mockEvents, mockFoodOptions } from "@shared/schema";

export interface IStorage {
  getEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  getFoodOptions(): Promise<FoodOption[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateEventAvailability(eventId: number, seatsBooked: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private events: Map<number, Event>;
  private foodOptions: Map<number, FoodOption>;
  private bookings: Map<number, Booking>;
  private currentBookingId: number;

  constructor() {
    this.events = new Map(mockEvents.map(event => [event.id, event]));
    this.foodOptions = new Map(mockFoodOptions.map(option => [option.id, option]));
    this.bookings = new Map();
    this.currentBookingId = 1;
  }

  async getEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getFoodOptions(): Promise<FoodOption[]> {
    return Array.from(this.foodOptions.values());
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const id = this.currentBookingId++;
    const newBooking = { ...booking, id };
    this.bookings.set(id, newBooking);
    return newBooking;
  }

  async updateEventAvailability(eventId: number, seatsBooked: number): Promise<void> {
    const event = this.events.get(eventId);
    if (!event) throw new Error("Event not found");
    event.availableSeats -= seatsBooked;
    this.events.set(eventId, event);
  }
}

export const storage = new MemStorage();
