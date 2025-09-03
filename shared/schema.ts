import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  json,
  primaryKey,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }),
  role: varchar("role", { length: 50 }).default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  allergens: json("allergens").$type<Allergen[]>().default([]),
  dietaryRestrictions: json("dietary_restrictions").$type<DietaryRestriction[]>().default([]),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
});

// Events Table
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  image: varchar("image", { length: 255 }),
  date: timestamp("date").notNull(),
  availableTables: integer("available_tables").default(0),
  totalTables: integer("total_tables").default(0),
  availableSeats: integer("available_seats").default(0),
  totalSeats: integer("total_seats").default(0),
  venueId: integer("venue_id").notNull(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  eventType: varchar("event_type", { length: 50 }).default("full").notNull(), // 'full' or 'ticket-only'
  isPrivate: boolean("is_private").default(false),
  ticketCutoffDays: integer("ticket_cutoff_days").default(3),
  // PRICING SYSTEM - $130 per person for full events
  basePrice: integer("base_price").default(13000), // $130.00 per person in cents
  // TICKET-ONLY PRICING - separate price for ticket-only events
  ticketPrice: integer("ticket_price").default(5000), // $50.00 per ticket in cents
  ticketCapacity: integer("ticket_capacity"), // Maximum tickets available for ticket-only events
  // Event toggles for flexibility
  includeFoodService: boolean("include_food_service").default(true),
  includeBeverages: boolean("include_beverages").default(true),
  includeAlcohol: boolean("include_alcohol").default(true),
  maxTicketsPerPurchase: integer("max_tickets_per_purchase").default(8), // 6 for ticket-only events
});

// Tickets Table
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  userId: integer("user_id").notNull(),
  tableId: integer("table_id").notNull(),
  seatNumber: integer("seat_number").notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  qrCode: varchar("qr_code", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isCheckedIn: boolean("is_checked_in").default(false),
  checkedInAt: timestamp("checked_in_at"),
});

// Venues Table
export const venues = pgTable("venues", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  width: integer("width").default(1000).notNull(),
  height: integer("height").default(700).notNull(),
  bounds: json("bounds").$type<{x: number, y: number, width: number, height: number}>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Stages Table
export const stages = pgTable("stages", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").notNull(),
  name: varchar("name", { length: 100 }).default("Main Stage").notNull(),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  width: integer("width").default(200).notNull(),
  height: integer("height").default(100).notNull(),
  rotation: integer("rotation").default(0),
  isActive: boolean("is_active").default(true),
});

// Tables Table
export const tables = pgTable("tables", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").notNull(),
  tableNumber: integer("table_number").notNull(),
  capacity: integer("capacity").default(4).notNull(),
  floor: varchar("floor", { length: 50 }).default("main").notNull(),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  width: integer("width").default(80).notNull(),
  height: integer("height").default(80).notNull(),
  shape: varchar("shape", { length: 20 }).default("full").notNull(), // 'full' or 'half' circle
  tableSize: integer("table_size").default(8).notNull(), // 1-9 size scale
  status: varchar("status", { length: 20 }).default("available"),
  zone: varchar("zone", { length: 50 }),
  priceCategory: varchar("price_category", { length: 20 }).default("standard"),
  isLocked: boolean("is_locked").default(false),
  rotation: integer("rotation").default(0),
});

// Seats Table
export const seats = pgTable("seats", {
  id: serial("id").primaryKey(),
  tableId: integer("table_id").notNull(),
  seatNumber: integer("seat_number").notNull(),
  xOffset: integer("x_offset").default(0),
  yOffset: integer("y_offset").default(0),
});

// Bookings Table - Updated for table-based booking
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  userId: integer("user_id").notNull(),
  tableId: integer("table_id").notNull(),
  seatNumbers: integer("seat_numbers").array().default([]), // Array of seat numbers booked
  partySize: integer("party_size").default(1), // Number of people at the table - made optional
  guestNames: json("guest_names").$type<string[]>().default([]), // Array of guest names
  foodSelections: json("food_selections").$type<any[]>().default([]),
  customerEmail: varchar("customer_email", { length: 255 }).notNull(),
  stripePaymentId: varchar("stripe_payment_id", { length: 255 }),
  amount: integer("amount"), // Actual Stripe charged amount in cents
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // PHASE 1: Enhanced status support - 'pending'|'confirmed'|'refunded'|'cancelled'|'reserved'|'comp'
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  // PHASE 1: New fields for admin booking functionality
  totalPaidCents: integer("total_paid_cents").notNull().default(0),
  bookingType: varchar("booking_type", { length: 50 }).notNull().default("standard"), // 'standard', 'manual', 'comp'
  notes: text("notes"),
  refundAmount: integer("refund_amount"),
  refundId: varchar("refund_id", { length: 255 }),
  lastModified: timestamp("last_modified"),
  modifiedBy: integer("modified_by"),
  checkedIn: boolean("checked_in").default(false),
  checkedInAt: timestamp("checked_in_at"),
  checkedInBy: integer("checked_in_by"),
  selectedVenue: varchar("selected_venue", { length: 100 }), // 'Main Floor' or 'Mezzanine'
  holdStartTime: timestamp("hold_start_time"), // For 20-minute timeout
  holdExpiry: timestamp("hold_expiry"), // Calculated expiry time for efficient queries
  wineSelections: json("wine_selections").$type<any[]>().default([]),
  orderTracking: text("orderTracking"),
  // Concurrency control fields
  lockToken: varchar("lock_token", { length: 255 }), // UUID for seat hold locks
  lockExpiry: timestamp("lock_expiry"), // When the lock expires
  version: integer("version").default(1), // For optimistic locking
}, (table) => ({
  // Performance indexes for availability queries
  eventIdIdx: index("idx_bookings_event_id").on(table.eventId),
  eventStatusIdx: index("idx_bookings_event_status").on(table.eventId, table.status),
  eventTableIdx: index("idx_bookings_event_table").on(table.eventId, table.tableId),
}));

// Unique constraint for bookings (one table per event)
// This constraint helps prevent double-bookings for the same table at an event
export const bookingTableEventUnique = pgTable(
  "booking_table_event_unique",
  {
    eventId: integer("event_id").notNull(),
    tableId: integer("table_id").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.eventId, t.tableId] }),
  })
);

// Seat Holds Table - For concurrency control and timer-based holds
export const seatHolds = pgTable("seat_holds", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  tableId: integer("table_id").notNull(),
  seatNumbers: integer("seat_numbers").array().default([]),
  userId: integer("user_id"),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  holdStartTime: timestamp("hold_start_time").defaultNow().notNull(),
  holdExpiry: timestamp("hold_expiry").notNull(),
  lockToken: varchar("lock_token", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("active").notNull(), // 'active', 'completed', 'expired'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  unique: unique().on(table.eventId, table.tableId), // One hold per table per event
}));

// Menu Items Table
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: integer("price"),
  category: varchar("category", { length: 100 }),
  isAvailable: boolean("is_available").default(true),
  image: varchar("image", { length: 255 }),
  containsAllergens: json("contains_allergens").$type<Allergen[]>().default([]),
  dietaryInfo: json("dietary_info").$type<DietaryRestriction[]>().default([]),
});

// Food Options Table
export const foodOptions = pgTable("food_options", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull(), // 'salad', 'entree', 'dessert', 'wine_glass', 'wine_bottle'
  price: integer("price").default(0), // Price in cents - NOW FREE for food items ($130 per person covers all food)
  allergens: json("allergens").$type<string[]>().default([]),
  dietaryRestrictions: json("dietary_restrictions").$type<string[]>().default([]),
  displayOrder: integer("display_order").default(0),
  image: varchar("image", { length: 500 }),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Event Food Options Junction Table
export const eventFoodOptions = pgTable("event_food_options", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  foodOptionId: integer("food_option_id").notNull(),
  isAvailable: boolean("is_available").default(true),
  customPrice: integer("custom_price"), // Optional custom price for this event
}, (table) => ({
  unique: unique().on(table.eventId, table.foodOptionId),
}));

// Event Pricing Tiers Table
export const eventPricingTiers = pgTable("event_pricing_tiers", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(), // e.g., "Front Row", "VIP Lounge", "General Seating"
  price: integer("price").notNull(), // Price in cents
  description: text("description"), // Optional description of what's included
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  unique: unique().on(table.eventId, table.name), // Prevent duplicate tier names per event
}));

// Event Table Assignments - Links tables to pricing tiers for specific events
export const eventTableAssignments = pgTable("event_table_assignments", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  tableId: integer("table_id").notNull(),
  pricingTierId: integer("pricing_tier_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  unique: unique().on(table.eventId, table.tableId), // One pricing tier per table per event
}));

// Event Venues Junction Table - Links events to multiple venues (max 2)
export const eventVenues = pgTable("event_venues", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  venueId: integer("venue_id").notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(), // e.g., "Main Floor", "Mezzanine"
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  unique: unique().on(table.eventId, table.venueId), // Prevent duplicate venue per event
}));

// Venue Staff Table
export const venueStaff = pgTable("venue_staff", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  venueId: integer("venue_id").notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  accessAreas: json("access_areas").$type<string[]>().default([]),
  isActive: boolean("is_active").default(true),
  hireDate: timestamp("hire_date").defaultNow().notNull(),
});

// Old floor and template tables removed - using simplified venue design

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  venueStaff: many(venueStaff),
}));

export const venuesRelations = relations(venues, ({ many }) => ({
  events: many(events),
  tables: many(tables),
  stages: many(stages),
  eventVenues: many(eventVenues),
}));

export const stagesRelations = relations(stages, ({ one }) => ({
  venue: one(venues, {
    fields: [stages.venueId],
    references: [venues.id],
  }),
}));

export const eventsRelations = relations(events, ({ many, one }) => ({
  bookings: many(bookings),
  tickets: many(tickets),
  eventFoodOptions: many(eventFoodOptions),
  pricingTiers: many(eventPricingTiers),
  tableAssignments: many(eventTableAssignments),
  eventVenues: many(eventVenues),
  venue: one(venues, {
    fields: [events.venueId],
    references: [venues.id],
  }),
}));

export const foodOptionsRelations = relations(foodOptions, ({ many }) => ({
  eventFoodOptions: many(eventFoodOptions),
}));

export const eventFoodOptionsRelations = relations(eventFoodOptions, ({ one }) => ({
  event: one(events, {
    fields: [eventFoodOptions.eventId],
    references: [events.id],
  }),
  foodOption: one(foodOptions, {
    fields: [eventFoodOptions.foodOptionId],
    references: [foodOptions.id],
  }),
}));

export const eventPricingTiersRelations = relations(eventPricingTiers, ({ one, many }) => ({
  event: one(events, {
    fields: [eventPricingTiers.eventId],
    references: [events.id],
  }),
  tableAssignments: many(eventTableAssignments),
}));

export const eventTableAssignmentsRelations = relations(eventTableAssignments, ({ one }) => ({
  event: one(events, {
    fields: [eventTableAssignments.eventId],
    references: [events.id],
  }),
  table: one(tables, {
    fields: [eventTableAssignments.tableId],
    references: [tables.id],
  }),
  pricingTier: one(eventPricingTiers, {
    fields: [eventTableAssignments.pricingTierId],
    references: [eventPricingTiers.id],
  }),
}));

export const eventVenuesRelations = relations(eventVenues, ({ one }) => ({
  event: one(events, {
    fields: [eventVenues.eventId],
    references: [events.id],
  }),
  venue: one(venues, {
    fields: [eventVenues.venueId],
    references: [venues.id],
  }),
}));

export const tablesRelations = relations(tables, ({ many, one }) => ({
  seats: many(seats),
  bookings: many(bookings),
  tickets: many(tickets),
  venue: one(venues, {
    fields: [tables.venueId],
    references: [venues.id],
  }),
}));

export const seatsRelations = relations(seats, ({ one }) => ({
  table: one(tables, {
    fields: [seats.tableId],
    references: [tables.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  event: one(events, {
    fields: [bookings.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  table: one(tables, {
    fields: [bookings.tableId],
    references: [tables.id],
  }),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  event: one(events, {
    fields: [tickets.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [tickets.userId],
    references: [users.id],
  }),
  table: one(tables, {
    fields: [tickets.tableId],
    references: [tables.id],
  }),
}));

export const venueStaffRelations = relations(venueStaff, ({ one }) => ({
  user: one(users, {
    fields: [venueStaff.userId],
    references: [users.id],
  }),
}));

// Old relations removed

// Schema validation with Zod
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertVenueSchema = createInsertSchema(venues).omit({ id: true, createdAt: true });
export const insertStageSchema = createInsertSchema(stages).omit({ id: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true });
export const insertTicketSchema = createInsertSchema(tickets).omit({ id: true, createdAt: true });
export const insertTableSchema = createInsertSchema(tables).omit({ id: true });
export const insertSeatSchema = createInsertSchema(seats).omit({ id: true });
// All booking validation schemas removed to fix checkout issues
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true });
export const insertFoodOptionSchema = createInsertSchema(foodOptions).omit({ id: true, createdAt: true });
export const insertEventFoodOptionSchema = createInsertSchema(eventFoodOptions).omit({ id: true });
export const insertEventPricingTierSchema = createInsertSchema(eventPricingTiers).omit({ id: true, createdAt: true });
export const insertEventTableAssignmentSchema = createInsertSchema(eventTableAssignments).omit({ id: true, createdAt: true });
export const insertEventVenueSchema = createInsertSchema(eventVenues).omit({ id: true, createdAt: true });
export const insertVenueStaffSchema = createInsertSchema(venueStaff).omit({ id: true, hireDate: true });
// Old schema imports removed

// Type definitions
export type NewUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type NewVenue = z.infer<typeof insertVenueSchema>;
export type Venue = typeof venues.$inferSelect;

export type NewStage = z.infer<typeof insertStageSchema>;
export type Stage = typeof stages.$inferSelect;

export type NewEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

export type NewTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

export type NewTable = z.infer<typeof insertTableSchema>;
export type Table = typeof tables.$inferSelect;

export type NewSeat = z.infer<typeof insertSeatSchema>;
export type Seat = typeof seats.$inferSelect;

// All booking validation types removed to fix checkout issues
export type Booking = typeof bookings.$inferSelect;

export type NewMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

export type NewFoodOption = z.infer<typeof insertFoodOptionSchema>;
export type FoodOption = typeof foodOptions.$inferSelect;

export type NewEventFoodOption = z.infer<typeof insertEventFoodOptionSchema>;
export type EventFoodOption = typeof eventFoodOptions.$inferSelect;

export type NewEventPricingTier = z.infer<typeof insertEventPricingTierSchema>;
export type EventPricingTier = typeof eventPricingTiers.$inferSelect;

export type NewEventTableAssignment = z.infer<typeof insertEventTableAssignmentSchema>;
export type EventTableAssignment = typeof eventTableAssignments.$inferSelect;

export type NewEventVenue = z.infer<typeof insertEventVenueSchema>;
export type EventVenue = typeof eventVenues.$inferSelect;

export type NewVenueStaff = z.infer<typeof insertVenueStaffSchema>;
export type VenueStaff = typeof venueStaff.$inferSelect;

// Old type definitions removed

// Extended types
export interface VenueWithTables extends Venue {
  tables: Table[];
  stages: Stage[];
}

export interface TableWithSeats extends Table {
  seats: Seat[];
}

export interface BookingWithDetails extends Booking {
  event: Event;
  user: User;
  table: Table;
}

// Enum-like types for allergies and dietary restrictions - SIMPLIFIED TO 4 TYPES ONLY
export type Allergen = never; // All allergens removed
export type DietaryRestriction = 'gluten-free' | 'vegan' | 'vegetarian' | 'dairy-free';

// Admin Logs Table
export const adminLogs = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: integer("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  ipAddress: varchar("ip_address", { length: 100 }),
});

export const insertAdminLogSchema = createInsertSchema(adminLogs).omit({ id: true, createdAt: true });
export type InsertAdminLog = z.infer<typeof insertAdminLogSchema>;
export type AdminLog = typeof adminLogs.$inferSelect;