import { pgTable, text, serial, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles and authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'admin', 'venue_owner', 'venue_manager', 'customer'
  createdAt: timestamp("created_at").defaultNow(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  date: timestamp("date").notNull(),
  availableSeats: integer("available_seats").notNull(),
  totalSeats: integer("total_seats").notNull(),
  venueId: integer("venue_id").notNull(),
  displayOrder: integer("display_order").default(0),
});

export const venues = pgTable("venues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id").notNull(), // References users with role 'venue_owner'
  managerId: integer("manager_id").notNull(), // References users with role 'venue_manager'
});

export const tables = pgTable("tables", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").notNull(),
  tableNumber: integer("table_number").notNull(),
  capacity: integer("capacity").notNull().default(4),
});

export const seats = pgTable("seats", {
  id: serial("id").primaryKey(),
  tableId: integer("table_id").notNull(),
  seatNumber: integer("seat_number").notNull(),
});

// New table to track event-specific seat availability
export const seatBookings = pgTable("seat_bookings", {
  id: serial("id").primaryKey(),
  seatId: integer("seat_id").notNull(),
  eventId: integer("event_id").notNull(),
  isBooked: boolean("is_booked").notNull().default(false),
});

export const foodOptions = pgTable("food_options", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  price: integer("price").default(0),
  allergens: text("allergens").array(),
  dietaryRestrictions: text("dietary_restrictions").array(),
  displayOrder: integer("display_order").default(0),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  userId: integer("user_id").notNull(),
  tableId: integer("table_id").notNull(),
  seatNumbers: integer("seat_numbers").array().notNull(),
  foodSelections: jsonb("food_selections").notNull(),
  guestNames: jsonb("guest_names").notNull(),
  customerEmail: text("customer_email").notNull(),
  stripePaymentId: text("stripe_payment_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  // Remove status and other fields that don't exist in the database
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertEventSchema = createInsertSchema(events);
export const insertVenueSchema = createInsertSchema(venues);
export const insertTableSchema = createInsertSchema(tables);
export const insertSeatSchema = createInsertSchema(seats);
export const insertSeatBookingSchema = createInsertSchema(seatBookings);
export const insertFoodOptionSchema = createInsertSchema(foodOptions);
export const insertBookingSchema = createInsertSchema(bookings);

// Types
export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Venue = typeof venues.$inferSelect;
export type Table = typeof tables.$inferSelect;
export type Seat = typeof seats.$inferSelect;
export type SeatBooking = typeof seatBookings.$inferSelect;
export type FoodOption = typeof foodOptions.$inferSelect;
export type Booking = typeof bookings.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertVenue = z.infer<typeof insertVenueSchema>;
export type InsertTable = z.infer<typeof insertTableSchema>;
export type InsertSeat = z.infer<typeof insertSeatSchema>;
export type InsertSeatBooking = z.infer<typeof insertSeatBookingSchema>;
export type InsertFoodOption = z.infer<typeof insertFoodOptionSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;