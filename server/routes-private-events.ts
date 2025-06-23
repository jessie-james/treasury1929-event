import express, { type Express } from "express";
import { storage } from "./storage";
import { z } from "zod";
import crypto from "crypto";

// Schema for creating private event access tokens
const createPrivateAccessSchema = z.object({
  eventId: z.number(),
  expiresAt: z.string().optional(),
  maxUses: z.number().optional(),
  description: z.string().optional()
});

interface PrivateEventAccess {
  id: string;
  eventId: number;
  token: string;
  expiresAt: Date | null;
  maxUses: number | null;
  currentUses: number;
  description: string | null;
  createdAt: Date;
  createdBy: number;
}

// In-memory store for private event tokens (in production, use database)
const privateEventTokens = new Map<string, PrivateEventAccess>();

export function registerPrivateEventRoutes(app: Express) {
  // Generate access token for private event
  app.post("/api/events/:eventId/private-access", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role === "customer") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      const validationResult = createPrivateAccessSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validationResult.error.format()
        });
      }

      const { expiresAt, maxUses, description } = validationResult.data;

      // Check if event exists and is private
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (!event.isPrivate) {
        return res.status(400).json({ message: "Event is not private" });
      }

      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const tokenId = crypto.randomUUID();

      const accessData: PrivateEventAccess = {
        id: tokenId,
        eventId,
        token,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses: maxUses || null,
        currentUses: 0,
        description: description || null,
        createdAt: new Date(),
        createdBy: req.user.id
      };

      privateEventTokens.set(token, accessData);

      // Create admin log
      await storage.createAdminLog({
        userId: req.user.id,
        action: "create_private_access",
        entityType: "event",
        entityId: eventId,
        details: {
          tokenId,
          expiresAt,
          maxUses,
          description
        }
      });

      res.json({
        tokenId,
        token,
        accessUrl: `${req.protocol}://${req.get('host')}/events/${eventId}?access_token=${token}`,
        expiresAt: accessData.expiresAt,
        maxUses: accessData.maxUses
      });

    } catch (error) {
      console.error("Error creating private event access:", error);
      res.status(500).json({ message: "Failed to create access token" });
    }
  });

  // Validate private event access
  app.get("/api/events/:eventId/validate-access", async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const { access_token } = req.query;

      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      if (!access_token || typeof access_token !== 'string') {
        return res.status(400).json({ 
          hasAccess: false, 
          message: "Access token required" 
        });
      }

      const accessData = privateEventTokens.get(access_token);
      if (!accessData || accessData.eventId !== eventId) {
        return res.status(404).json({ 
          hasAccess: false, 
          message: "Invalid access token" 
        });
      }

      // Check if token has expired
      if (accessData.expiresAt && new Date() > accessData.expiresAt) {
        return res.status(410).json({ 
          hasAccess: false, 
          message: "Access token has expired" 
        });
      }

      // Check if max uses exceeded
      if (accessData.maxUses && accessData.currentUses >= accessData.maxUses) {
        return res.status(410).json({ 
          hasAccess: false, 
          message: "Access token usage limit exceeded" 
        });
      }

      // Increment usage count
      accessData.currentUses += 1;

      res.json({
        hasAccess: true,
        message: "Access granted",
        remainingUses: accessData.maxUses ? accessData.maxUses - accessData.currentUses : null
      });

    } catch (error) {
      console.error("Error validating private event access:", error);
      res.status(500).json({ 
        hasAccess: false, 
        message: "Unable to validate access" 
      });
    }
  });

  // List access tokens for an event (admin only)
  app.get("/api/events/:eventId/private-access", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role === "customer") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      const tokens = Array.from(privateEventTokens.values())
        .filter(token => token.eventId === eventId)
        .map(token => ({
          id: token.id,
          description: token.description,
          expiresAt: token.expiresAt,
          maxUses: token.maxUses,
          currentUses: token.currentUses,
          createdAt: token.createdAt,
          isExpired: token.expiresAt ? new Date() > token.expiresAt : false,
          isMaxedOut: token.maxUses ? token.currentUses >= token.maxUses : false
        }));

      res.json(tokens);

    } catch (error) {
      console.error("Error listing private event tokens:", error);
      res.status(500).json({ message: "Failed to list access tokens" });
    }
  });

  // Revoke access token
  app.delete("/api/events/:eventId/private-access/:tokenId", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role === "customer") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const eventId = parseInt(req.params.eventId);
      const { tokenId } = req.params;

      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      // Find and remove token
      let removedToken = null;
      for (const [token, data] of privateEventTokens.entries()) {
        if (data.id === tokenId && data.eventId === eventId) {
          privateEventTokens.delete(token);
          removedToken = data;
          break;
        }
      }

      if (!removedToken) {
        return res.status(404).json({ message: "Access token not found" });
      }

      // Create admin log
      await storage.createAdminLog({
        userId: req.user.id,
        action: "revoke_private_access",
        entityType: "event",
        entityId: eventId,
        details: {
          tokenId,
          revokedAt: new Date()
        }
      });

      res.json({ message: "Access token revoked successfully" });

    } catch (error) {
      console.error("Error revoking private event access:", error);
      res.status(500).json({ message: "Failed to revoke access token" });
    }
  });
}