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
  venueId: integer("venue_id").notNull(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
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
  partySize: integer("party_size").notNull(), // Number of people at the table
  guestNames: json("guest_names").$type<string[]>().default([]), // Array of guest names
  foodSelections: json("food_selections").$type<any[]>().default([]),
  customerEmail: varchar("customer_email", { length: 255 }).notNull(),
  stripePaymentId: varchar("stripe_payment_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  notes: text("notes"),
  refundAmount: integer("refund_amount"),
  refundId: varchar("refund_id", { length: 255 }),
  lastModified: timestamp("last_modified"),
  modifiedBy: integer("modified_by"),
  checkedIn: boolean("checked_in").default(false),
  checkedInAt: timestamp("checked_in_at"),
  checkedInBy: integer("checked_in_by"),
});

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
  venue: one(venues, {
    fields: [events.venueId],
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
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true });
export const insertVenueStaffSchema = createInsertSchema(venueStaff).omit({ id: true, hireDate: true });
export const insertFloorSchema = createInsertSchema(floors).omit({ id: true });
export const insertTableZoneSchema = createInsertSchema(tableZones).omit({ id: true });
export const insertVenueLayoutTemplateSchema = createInsertSchema(venueLayoutTemplates).omit({ id: true, createdAt: true, lastModified: true });
export const insertTemplateTableAssociationSchema = createInsertSchema(templateTableAssociations).omit({ id: true });

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

export type NewBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

export type NewMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

export type NewVenueStaff = z.infer<typeof insertVenueStaffSchema>;
export type VenueStaff = typeof venueStaff.$inferSelect;

export type NewFloor = z.infer<typeof insertFloorSchema>;
export type Floor = typeof floors.$inferSelect;

export type NewTableZone = z.infer<typeof insertTableZoneSchema>;
export type TableZone = typeof tableZones.$inferSelect;

export type NewVenueLayoutTemplate = z.infer<typeof insertVenueLayoutTemplateSchema>;
export type VenueLayoutTemplate = typeof venueLayoutTemplates.$inferSelect;

export type NewTemplateTableAssociation = z.infer<typeof insertTemplateTableAssociationSchema>;
export type TemplateTableAssociation = typeof templateTableAssociations.$inferSelect;

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

// Enum-like types for allergies and dietary restrictions
export type Allergen = 'gluten' | 'dairy' | 'nuts' | 'peanuts' | 'shellfish' | 'eggs' | 'soy' | 'fish';
export type DietaryRestriction = 'vegetarian' | 'vegan' | 'halal' | 'kosher' | 'gluten-free' | 'dairy-free' | 'nut-free';

// Admin Logs Table
export const adminLogs = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: integer("entity_id"),
  details: json("details").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  ipAddress: varchar("ip_address", { length: 100 }),
});

export const insertAdminLogSchema = createInsertSchema(adminLogs).omit({ id: true, createdAt: true });
export type InsertAdminLog = z.infer<typeof insertAdminLogSchema>;
export type AdminLog = typeof adminLogs.$inferSelect;