import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  date: timestamp("date").notNull(),
  availableSeats: integer("available_seats").notNull(),
  totalSeats: integer("total_seats").notNull(),
});

export const foodOptions = pgTable("food_options", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'entree', 'dessert', 'wine'
  description: text("description").notNull(),
  image: text("image").notNull(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  seatNumbers: integer("seat_numbers").array().notNull(),
  foodSelections: jsonb("food_selections").notNull(),
  customerEmail: text("customer_email").notNull(),
  stripePaymentId: text("stripe_payment_id").notNull(),
});

export const insertEventSchema = createInsertSchema(events);
export const insertFoodOptionSchema = createInsertSchema(foodOptions);
export const insertBookingSchema = createInsertSchema(bookings);

export type Event = typeof events.$inferSelect;
export type FoodOption = typeof foodOptions.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertFoodOption = z.infer<typeof insertFoodOptionSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export const mockEvents: Event[] = [
  {
    id: 1,
    title: "Summer Gala Dinner",
    description: "An elegant evening of fine dining and entertainment",
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30",
    date: new Date("2024-07-15T19:00:00"),
    availableSeats: 72,
    totalSeats: 80,
  },
  {
    id: 2,
    title: "Wedding Showcase",
    description: "Experience our venue's wedding capabilities",
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622",
    date: new Date("2024-07-20T18:00:00"),
    availableSeats: 40,
    totalSeats: 80,
  },
  {
    id: 3,
    title: "Corporate Awards Night",
    description: "Annual business excellence awards ceremony",
    image: "https://images.unsplash.com/photo-1464047736614-af63643285bf",
    date: new Date("2024-08-05T19:30:00"),
    availableSeats: 76,
    totalSeats: 80,
  },
];

export const mockFoodOptions: FoodOption[] = [
  {
    id: 1,
    name: "Pan-Seared Salmon",
    type: "entree",
    description: "Fresh Atlantic salmon with lemon butter sauce",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0",
  },
  {
    id: 2,
    name: "Beef Tenderloin",
    type: "entree",
    description: "Grilled beef with red wine reduction",
    image: "https://images.unsplash.com/photo-1565895405138-6c3a1555da6a",
  },
  {
    id: 3,
    name: "Mushroom Risotto",
    type: "entree",
    description: "Creamy arborio rice with wild mushrooms",
    image: "https://images.unsplash.com/photo-1563897539633-7374c276c212",
  },
  {
    id: 4,
    name: "Chocolate Fondant",
    type: "dessert",
    description: "Warm chocolate cake with vanilla ice cream",
    image: "https://images.unsplash.com/photo-1564844536311-de546a28c87d",
  },
  {
    id: 5,
    name: "Crème Brûlée",
    type: "dessert",
    description: "Classic French dessert with caramelized sugar",
    image: "https://images.unsplash.com/photo-1565895405227-31cffbe0cf86",
  },
  {
    id: 6,
    name: "Berry Pavlova",
    type: "dessert",
    description: "Meringue with fresh berries and cream",
    image: "https://images.unsplash.com/photo-1564851287875-fb73b71f0e4e",
  },
  {
    id: 7,
    name: "Chardonnay Reserve",
    type: "wine",
    description: "Premium white wine with buttery notes",
    image: "https://images.unsplash.com/photo-1556442281-77c90134c61f",
  },
  {
    id: 8,
    name: "Cabernet Sauvignon",
    type: "wine",
    description: "Full-bodied red wine with dark fruit notes",
    image: "https://images.unsplash.com/photo-1562601579-599dec564e06",
  },
  {
    id: 9,
    name: "Prosecco",
    type: "wine",
    description: "Sparkling wine with crisp apple notes",
    image: "https://images.unsplash.com/photo-1598112973620-70dd9833f67e",
  },
];
