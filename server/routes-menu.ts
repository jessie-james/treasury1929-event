import { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { insertMenuItemSchema } from "@shared/schema";

// Middleware to check if user is admin
function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated() || req.user?.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized. Admin access required." });
  }
  next();
}

// Schema for reordering menu items
const reorderMenuItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.number(),
      displayOrder: z.number(),
    })
  ),
});

export function registerMenuRoutes(app: Express): void {
  // Get all menu items
  app.get("/api/admin/menu-items", requireAdmin, async (req, res) => {
    try {
      const menuItems = await storage.getMenuItems();
      res.json(menuItems);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get menu item by ID
  app.get("/api/admin/menu-items/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const menuItem = await storage.getMenuItem(id);
      
      if (!menuItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      
      res.json(menuItem);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new menu item
  app.post("/api/admin/menu-items", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertMenuItemSchema.parse(req.body);
      
      // Add display order if not provided
      if (validatedData.displayOrder === undefined) {
        const menuItems = await storage.getMenuItems(validatedData.category || undefined);
        const maxOrder = menuItems.reduce((max, item) => 
          item.displayOrder && item.displayOrder > max ? item.displayOrder : max, 0);
        validatedData.displayOrder = maxOrder + 1;
      }
      
      const id = await storage.createMenuItem(validatedData);
      const newItem = await storage.getMenuItem(id);
      
      // Log admin action
      await storage.createAdminLog({
        userId: req.user?.id || 0,
        action: "create",
        entityType: "menuItem",
        entityId: id,
        details: { menuItem: newItem },
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || undefined,
      });
      
      res.status(201).json(newItem);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update a menu item
  app.put("/api/admin/menu-items/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const menuItem = await storage.getMenuItem(id);
      
      if (!menuItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      
      const validatedData = insertMenuItemSchema.partial().parse(req.body);
      await storage.updateMenuItem(id, validatedData);
      const updatedItem = await storage.getMenuItem(id);
      
      // Log admin action
      await storage.createAdminLog({
        userId: req.user?.id || 0,
        action: "update",
        entityType: "menuItem",
        entityId: id,
        details: { 
          before: menuItem,
          after: updatedItem,
          changes: validatedData
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || undefined,
      });
      
      res.json(updatedItem);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete a menu item
  app.delete("/api/admin/menu-items/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const menuItem = await storage.getMenuItem(id);
      
      if (!menuItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      
      await storage.deleteMenuItem(id);
      
      // Log admin action
      await storage.createAdminLog({
        userId: req.user?.id || 0,
        action: "delete",
        entityType: "menuItem",
        entityId: id,
        details: { menuItem },
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || undefined,
      });
      
      res.status(200).json({ success: true, message: "Menu item deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reorder menu items
  app.post("/api/admin/menu-items/reorder", requireAdmin, async (req, res) => {
    try {
      const { items } = reorderMenuItemsSchema.parse(req.body);
      
      // Update each item's display order
      for (const item of items) {
        await storage.updateMenuItem(item.id, { displayOrder: item.displayOrder });
      }
      
      // Log admin action
      await storage.createAdminLog({
        userId: req.user?.id || 0,
        action: "reorder",
        entityType: "menuItems",
        details: { items },
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || undefined,
      });
      
      res.status(200).json({ success: true, message: "Menu items reordered successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get menu categories
  app.get("/api/admin/menu-categories", requireAdmin, async (req, res) => {
    try {
      const categories = await storage.getMenuCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}