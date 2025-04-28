import { pgTable, text, serial, integer, timestamp, jsonb, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles and authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'admin', 'venue_owner', 'venue_manager', 'customer'
  createdAt: timestamp("created_at").defaultNow(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  allergens: text("allergens").array(),
  dietaryRestrictions: text("dietary_restrictions").array(),
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
  isActive: boolean("is_active").default(true),
});

export const venues = pgTable("venues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id").notNull(), // References users with role 'venue_owner'
  managerId: integer("manager_id").notNull(), // References users with role 'venue_manager'
});

// Tables and seats have been removed and will be reimplemented with a new approach
// Removing these tables requires adjusting the booking schema to accommodate a new approach

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
  status: text("status").notNull().default("confirmed"), // confirmed, modified, refunded, canceled
  notes: text("notes"),
  refundAmount: integer("refund_amount"),
  refundId: text("refund_id"),
  lastModified: timestamp("last_modified"),
  modifiedBy: integer("modified_by"), // User ID of admin who modified the booking
  checkedIn: boolean("checked_in").default(false), // Whether the ticket has been scanned and checked in
  checkedInAt: timestamp("checked_in_at"), // When the ticket was checked in
  checkedInBy: integer("checked_in_by"), // User ID of staff who checked in the ticket
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertEventSchema = createInsertSchema(events);
export const insertVenueSchema = createInsertSchema(venues);
export const insertFoodOptionSchema = createInsertSchema(foodOptions);
export const insertBookingSchema = createInsertSchema(bookings);

// Types
export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Venue = typeof venues.$inferSelect;
export type FoodOption = typeof foodOptions.$inferSelect;
export type Booking = typeof bookings.$inferSelect;

// These types will be reimplemented with a new approach
export interface Table {
  id: number;
  tableNumber: number;
  capacity: number;
}

export interface Seat {
  id: number;
  tableId: number;
  seatNumber: number;
}

export interface SeatBooking {
  id: number;
  seatId: number;
  eventId: number;
  isBooked: boolean;
}

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertVenue = z.infer<typeof insertVenueSchema>;
export type InsertFoodOption = z.infer<typeof insertFoodOptionSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

// Admin logs
export const adminLogs = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Admin who performed the action
  action: text("action").notNull(), // Type of action performed
  entityType: text("entity_type").notNull(), // Type of entity affected (booking, event, etc.)
  entityId: integer("entity_id"), // ID of the affected entity, if applicable
  details: jsonb("details"), // Additional details about the action
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdminLogSchema = createInsertSchema(adminLogs);
export type AdminLog = typeof adminLogs.$inferSelect;
export type InsertAdminLog = z.infer<typeof insertAdminLogSchema>;

// Seat positions for the floor plan
export const seatPositions = pgTable("seat_positions", {
  id: serial("id").primaryKey(),
  floorPlan: text("floor_plan").notNull(), // e.g., 'mezzanine', 'main-floor'
  tableId: integer("table_id").notNull(),
  seatNumber: integer("seat_number").notNull(),
  xPosition: real("x_position").notNull(),
  yPosition: real("y_position").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSeatPositionSchema = createInsertSchema(seatPositions);
export type SeatPosition = typeof seatPositions.$inferSelect;
export type InsertSeatPosition = z.infer<typeof insertSeatPositionSchema>;