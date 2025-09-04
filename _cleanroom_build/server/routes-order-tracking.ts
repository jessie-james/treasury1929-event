import express, { type Express } from "express";
import { storage } from "./storage";
import { z } from "zod";

// Schema for tracking orders by table and guest
const orderTrackingSchema = z.object({
  bookingId: z.number(),
  tableId: z.number(),
  guestName: z.string(),
  orderItems: z.array(z.object({
    itemId: z.number(),
    itemName: z.string(),
    quantity: z.number(),
    notes: z.string().optional()
  })),
  eventId: z.number()
});

export function registerOrderTrackingRoutes(app: Express) {
  // Create order tracking entry
  app.post("/api/orders/track", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const validationResult = orderTrackingSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid order data",
          errors: validationResult.error.format()
        });
      }

      const { bookingId, tableId, guestName, orderItems, eventId } = validationResult.data;

      // Verify booking exists and belongs to user (or is admin)
      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      // Create order tracking record
      const orderTracking = {
        id: Date.now(), // Simple ID generation
        bookingId,
        tableId,
        guestName,
        orderItems,
        eventId,
        userId: req.user.id,
        status: 'pending' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // In a real app, this would be stored in database
      // For now, we'll add it to the booking's metadata
      const updatedBooking = await storage.updateBooking(bookingId, {
        orderTracking: JSON.stringify(orderTracking)
      });

      // Create admin log
      await storage.createAdminLog({
        userId: req.user.id,
        action: "create_order_tracking",
        entityType: "booking",
        entityId: bookingId,
        details: {
          tableId,
          guestName,
          orderItems: orderItems.length,
          eventId
        }
      });

      res.status(201).json({
        success: true,
        orderTracking,
        message: "Order tracking created successfully"
      });

    } catch (error) {
      console.error("Error creating order tracking:", error);
      res.status(500).json({ message: "Failed to create order tracking" });
    }
  });

  // Get orders by table for event (admin/hostess only)
  app.get("/api/events/:eventId/tables/:tableId/orders", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role === "customer") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const eventId = parseInt(req.params.eventId);
      const tableId = parseInt(req.params.tableId);

      if (isNaN(eventId) || isNaN(tableId)) {
        return res.status(400).json({ message: "Invalid event or table ID" });
      }

      // Get all bookings for this event and table
      const allBookings = await storage.getBookings();
      const tableBookings = allBookings.filter(booking => 
        booking.eventId === eventId && 
        booking.tableId === tableId &&
        booking.status !== "canceled"
      );

      // Extract order tracking data
      const orderData = tableBookings
        .map(booking => {
          if (booking.orderTracking) {
            try {
              const tracking = JSON.parse(booking.orderTracking);
              return {
                bookingId: booking.id,
                guestName: tracking.guestName,
                orderItems: tracking.orderItems,
                status: tracking.status,
                createdAt: tracking.createdAt,
                foodSelections: booking.foodSelections,
                wineSelections: booking.wineSelections
              };
            } catch (e) {
              return null;
            }
          }
          
          // Fallback to booking data if no order tracking
          return {
            bookingId: booking.id,
            guestName: booking.guestNames ? Object.values(booking.guestNames)[0] : 'Guest',
            orderItems: [],
            status: 'pending',
            createdAt: booking.createdAt,
            foodSelections: booking.foodSelections || [],
            wineSelections: booking.wineSelections || []
          };
        })
        .filter(Boolean);

      res.json({
        tableId,
        eventId,
        orders: orderData,
        totalOrders: orderData.length
      });

    } catch (error) {
      console.error("Error fetching table orders:", error);
      res.status(500).json({ message: "Failed to fetch table orders" });
    }
  });

  // Get all orders for an event (kitchen dashboard)
  app.get("/api/events/:eventId/orders", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Allow customers to view their own orders
      const isCustomer = req.user?.role === "customer";
      const userId = req.user?.id;

      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      // Get all bookings for this event
      const allBookings = await storage.getBookings();
      const eventBookings = allBookings.filter(booking => 
        booking.eventId === eventId &&
        booking.status !== "canceled"
      );

      // Organize orders by table
      const ordersByTable: Record<number, any[]> = {};
      
      eventBookings.forEach(booking => {
        if (!ordersByTable[booking.tableId]) {
          ordersByTable[booking.tableId] = [];
        }

        let orderData;
        if (booking.orderTracking) {
          try {
            const tracking = JSON.parse(booking.orderTracking);
            orderData = {
              bookingId: booking.id,
              guestName: tracking.guestName,
              orderItems: tracking.orderItems,
              status: tracking.status,
              foodSelections: booking.foodSelections || [],
              wineSelections: booking.wineSelections || []
            };
          } catch (e) {
            orderData = null;
          }
        }

        if (!orderData) {
          // Fallback to booking data
          orderData = {
            bookingId: booking.id,
            guestName: booking.guestNames ? Object.values(booking.guestNames)[0] : 'Guest',
            orderItems: [],
            status: 'pending',
            foodSelections: booking.foodSelections || [],
            wineSelections: booking.wineSelections || []
          };
        }

        ordersByTable[booking.tableId].push(orderData);
      });

      res.json({
        eventId,
        ordersByTable,
        totalTables: Object.keys(ordersByTable).length,
        totalOrders: Object.values(ordersByTable).flat().length
      });

    } catch (error) {
      console.error("Error fetching event orders:", error);
      res.status(500).json({ message: "Failed to fetch event orders" });
    }
  });

  // Update order status
  app.patch("/api/orders/:bookingId/status", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role === "customer") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const bookingId = parseInt(req.params.bookingId);
      const { status } = req.body;

      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }

      if (!['pending', 'preparing', 'ready', 'served'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Update order tracking status
      let orderTracking;
      if (booking.orderTracking) {
        try {
          orderTracking = JSON.parse(booking.orderTracking);
          orderTracking.status = status;
          orderTracking.updatedAt = new Date();
        } catch (e) {
          orderTracking = {
            status,
            updatedAt: new Date(),
            bookingId
          };
        }
      } else {
        orderTracking = {
          status,
          updatedAt: new Date(),
          bookingId
        };
      }

      await storage.updateBooking(bookingId, {
        orderTracking: JSON.stringify(orderTracking)
      });

      // Create admin log
      await storage.createAdminLog({
        userId: req.user.id,
        action: "update_order_status",
        entityType: "booking",
        entityId: bookingId,
        details: {
          newStatus: status,
          updatedBy: req.user.email
        }
      });

      res.json({
        success: true,
        status,
        message: "Order status updated successfully"
      });

    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });
}