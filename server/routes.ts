import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertBookingSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  app.get("/api/events", async (_req, res) => {
    const events = await storage.getEvents();
    res.json(events);
  });

  app.get("/api/events/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const event = await storage.getEvent(id);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }
    res.json(event);
  });

  app.get("/api/food-options", async (_req, res) => {
    const options = await storage.getFoodOptions();
    res.json(options);
  });

  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount } = req.body;

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const booking = insertBookingSchema.parse(req.body);
      const created = await storage.createBooking(booking);
      await storage.updateEventAvailability(
        booking.eventId,
        booking.seatNumbers.length
      );
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid booking data" });
        return;
      }
      throw error;
    }
  });

  return httpServer;
}