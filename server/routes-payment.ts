// Server-side payment routes using Stripe Checkout
import type { Express } from "express";
import { getStripe, createPaymentIntent, formatStripeError } from "./stripe";
import { storage } from "./storage";
import express from "express";

export function registerPaymentRoutes(app: Express) {
  // Create checkout session for server-side Stripe processing
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { eventId, tableId, selectedSeats, amount, foodSelections, guestNames } = req.body;
      
      // Validate input
      if (!eventId || !tableId || !selectedSeats || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const stripe = getStripe();
      if (!stripe) {
        return res.status(500).json({ error: "Stripe not initialized" });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Event Booking - ${selectedSeats.length} seats`,
                description: `Event ID: ${eventId}, Table: ${tableId}`,
              },
              unit_amount: Math.round(amount / selectedSeats.length), // amount per seat in cents
            },
            quantity: selectedSeats.length,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/booking-cancelled`,
        metadata: {
          eventId: eventId.toString(),
          tableId: tableId.toString(),
          userId: req.user.id.toString(),
          seats: selectedSeats.join(','),
          foodSelections: JSON.stringify(foodSelections || []),
          guestNames: JSON.stringify(guestNames || []),
        },
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
      console.error('Checkout session creation failed:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Payment setup failed' });
    }
  });

  // Handle successful payment callback
  app.get("/api/payment-success", async (req, res) => {
    try {
      const { session_id } = req.query;
      
      if (!session_id) {
        return res.status(400).json({ error: 'Missing session ID' });
      }

      const stripe = getStripe();
      if (!stripe) {
        return res.status(500).json({ error: "Stripe not initialized" });
      }

      const session = await stripe.checkout.sessions.retrieve(session_id as string);
      
      if (session.payment_status === 'paid') {
        // Create booking in database
        const bookingData = {
          eventId: parseInt(session.metadata!.eventId),
          userId: parseInt(session.metadata!.userId),
          tableId: parseInt(session.metadata!.tableId),
          partySize: session.metadata!.seats.split(',').length,
          customerEmail: session.customer_details?.email || '',
          stripePaymentId: session.payment_intent as string,
          guestNames: JSON.parse(session.metadata!.guestNames || '[]'),
          foodSelections: JSON.parse(session.metadata!.foodSelections || '[]'),
          status: 'confirmed'
        };

        // Insert booking into database
        const booking = await storage.createBooking(bookingData);
        
        res.json({ success: true, booking });
      } else {
        res.status(400).json({ error: 'Payment not completed' });
      }
    } catch (error) {
      console.error('Payment verification failed:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Payment verification failed' });
    }
  });

  // Simplified direct payment intent creation endpoint
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      // Log request details for debugging
      console.log("Payment intent request:", {
        body: { ...req.body, userEmail: req.body.userEmail ? '[REDACTED]' : undefined },
        session: !!req.session,
        sessionID: !!req.sessionID,
        isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
        hasUser: !!req.user
      });
      
      // Validate request has minimum required data
      if (!req.body.seatCount && !req.body.bookingAmount) {
        return res.status(400).json({
          error: "Missing required parameters",
          message: "Payment requires seat count or booking amount"
        });
      }
      
      // Calculate amount to charge (in cents)
      let amount = 0;
      
      if (req.body.seatCount && typeof req.body.seatCount === 'number') {
        amount = req.body.seatCount * 1999; // $19.99 per seat
      } else if (req.body.bookingAmount && typeof req.body.bookingAmount === 'number') {
        amount = Math.round(req.body.bookingAmount * 100); // Convert dollars to cents
      }
      
      if (amount <= 0) {
        return res.status(400).json({
          error: "Invalid amount",
          message: "Payment amount must be greater than zero"
        });
      }
      
      // Determine user information from various sources
      let userId: number | undefined = undefined;
      let userEmail: string | undefined = undefined;
      
      // Try to get user info from session first (if authenticated)
      if (req.isAuthenticated && req.isAuthenticated() && req.user) {
        userId = req.user.id;
        userEmail = req.user.email;
        console.log(`Using authenticated user: ${userId} (${userEmail})`);
      } 
      // Fall back to request body if provided
      else if (req.body.userId && req.body.userEmail) {
        userId = Number(req.body.userId);
        userEmail = req.body.userEmail;
        
        // Verify user exists in database
        try {
          const user = await storage.getUserById(userId);
          if (user && user.email === userEmail) {
            console.log(`Verified user from request body: ${userId} (${userEmail})`);
          } else {
            console.log(`User verification failed, but proceeding with payment`);
          }
        } catch (err) {
          console.log(`Error verifying user ${userId}, but proceeding with payment`);
        }
      }
      // If we still don't have user info, use a minimal fallback
      else {
        // Allow payment without user info, but log it
        console.log("Creating payment without user information");
      }
      
      // Create payment metadata
      const metadata: Record<string, string> = {
        timestamp: new Date().toISOString(),
        seatCount: req.body.seatCount?.toString() || '0',
        amount: (amount / 100).toString(),
      };
      
      // Add user info to metadata if available
      if (userId) metadata.userId = userId.toString();
      if (userEmail) metadata.userEmail = userEmail;
      
      console.log(`Creating payment intent for $${amount / 100} (${amount} cents)`);
      
      // Create the payment intent
      const paymentIntent = await createPaymentIntent({
        amount,
        metadata
      });
      
      // Log success
      console.log(`Payment intent created: ${paymentIntent.id} (${amount} cents)`);
      
      // Try to log to admin logs if we have a user ID
      if (userId) {
        try {
          await storage.createAdminLog({
            userId,
            action: "create_payment_intent",
            entityType: "payment",
            entityId: 0,
            details: {
              paymentIntentId: paymentIntent.id,
              amount: amount / 100,
              seatCount: req.body.seatCount || 0,
              createdAt: new Date().toISOString()
            }
          });
        } catch (logError) {
          // Don't fail if logging fails
          console.error("Error creating payment log:", logError);
        }
      }
      
      // Return client secret to the frontend
      return res.json({
        clientSecret: paymentIntent.client_secret,
        amount: amount / 100, // Return amount in dollars for display
        success: true
      });
      
    } catch (error: any) {
      // Format and log error
      console.error("Error creating payment intent:", error);
      
      const { message, code } = formatStripeError(error);
      
      return res.status(500).json({
        error: message,
        code,
        success: false
      });
    }
  });
  
  // Add a webhook endpoint for Stripe events
  app.post("/api/stripe-webhook", async (req, res) => {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).send("Stripe not initialized");
    }
    
    let event;
    
    try {
      // Verify webhook signature
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (webhookSecret && req.headers['stripe-signature']) {
        event = stripe.webhooks.constructEvent(
          req.body,
          req.headers['stripe-signature'] as string,
          webhookSecret
        );
      } else {
        // For testing, just parse the JSON
        event = req.body;
      }
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle specific webhook events
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      console.log(`Payment intent succeeded: ${paymentIntent.id}`);
      
      // Get user ID from metadata
      if (paymentIntent.metadata?.userId) {
        try {
          const userId = Number(paymentIntent.metadata.userId);
          
          // Log successful payment
          await storage.createAdminLog({
            userId,
            action: "payment_succeeded",
            entityType: "payment",
            entityId: 0,
            details: {
              paymentIntentId: paymentIntent.id,
              amount: paymentIntent.amount / 100,
              metadata: paymentIntent.metadata
            }
          });
        } catch (logError) {
          console.error("Error logging payment success:", logError);
        }
      }
    }
    
    res.json({ received: true });
  });
}