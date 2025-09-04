import { Express } from "express";
import { db } from "./db";
import { eventPricingTiers } from "@shared/schema";
import { eq } from "drizzle-orm";

export function registerPricingRoutes(app: Express): void {
  // Get pricing tiers for an event
  app.get("/api/events/:eventId/pricing-tiers", async (req: any, res: any) => {
    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      const pricingTiers = await db.select()
        .from(eventPricingTiers)
        .where(eq(eventPricingTiers.eventId, eventId))
        .orderBy(eventPricingTiers.displayOrder);

      res.json(pricingTiers);
    } catch (error) {
      console.error("Error fetching pricing tiers:", error);
      res.status(500).json({ message: "Failed to fetch pricing tiers" });
    }
  });

  // Create pricing tier for an event
  app.post("/api/events/:eventId/pricing-tiers", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated() || req.user?.role === "customer") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      const { name, price, description, displayOrder } = req.body;
      
      if (!name || typeof price !== "number") {
        return res.status(400).json({ message: "Name and price are required" });
      }

      const newTiers = await db.insert(eventPricingTiers)
        .values({
          eventId,
          name,
          price,
          description: description || null,
          displayOrder: displayOrder || 0
        })
        .returning();
        
      const newTier = newTiers[0];

      res.status(201).json(newTier);
    } catch (error) {
      console.error("Error creating pricing tier:", error);
      res.status(500).json({ message: "Failed to create pricing tier" });
    }
  });

  // Update pricing tier
  app.put("/api/events/:eventId/pricing-tiers/:tierId", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated() || req.user?.role === "customer") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const eventId = parseInt(req.params.eventId);
      const tierId = parseInt(req.params.tierId);
      
      if (isNaN(eventId) || isNaN(tierId)) {
        return res.status(400).json({ message: "Invalid event or tier ID" });
      }

      const { name, price, description, displayOrder } = req.body;

      const updatedTiers = await db.update(eventPricingTiers)
        .set({
          name,
          price,
          description,
          displayOrder
        })
        .where(eq(eventPricingTiers.id, tierId))
        .returning();

      if (updatedTiers.length === 0) {
        return res.status(404).json({ message: "Pricing tier not found" });
      }

      res.json(updatedTiers[0]);
    } catch (error) {
      console.error("Error updating pricing tier:", error);
      res.status(500).json({ message: "Failed to update pricing tier" });
    }
  });

  // Delete pricing tier
  app.delete("/api/events/:eventId/pricing-tiers/:tierId", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated() || req.user?.role === "customer") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const tierId = parseInt(req.params.tierId);
      
      if (isNaN(tierId)) {
        return res.status(400).json({ message: "Invalid tier ID" });
      }

      const deletedTiers = await db.delete(eventPricingTiers)
        .where(eq(eventPricingTiers.id, tierId))
        .returning();

      if (deletedTiers.length === 0) {
        return res.status(404).json({ message: "Pricing tier not found" });
      }

      res.json({ message: "Pricing tier deleted successfully" });
    } catch (error) {
      console.error("Error deleting pricing tier:", error);
      res.status(500).json({ message: "Failed to delete pricing tier" });
    }
  });
}