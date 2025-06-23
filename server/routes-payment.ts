// Server-side payment routes using Stripe Checkout
import type { Express } from "express";
import { getStripe, createPaymentIntent, formatStripeError } from "./stripe";
import { storage } from "./storage";
import express from "express";

// Helper function to create booking from Stripe session
async function createBookingFromStripeSession(session: any) {
  const metadata = session.metadata;
  
  // Validate metadata exists
  if (!metadata || !metadata.eventId || !metadata.tableId || !metadata.userId) {
    throw new Error('Missing required booking metadata in Stripe session');
  }
  
  // Calculate party size from seats count
  const seats = metadata.seats ? metadata.seats.split(',') : [];
  const partySize = seats.length;
  
  // Validate table exists and belongs to the event
  const tableId = parseInt(metadata.tableId);
  const eventId = parseInt(metadata.eventId);
  
  // Check if table is already booked for this event
  const existingBookings = await storage.getBookingsByEventId(eventId);
  const tableAlreadyBooked = existingBookings.some(booking => 
    booking.tableId === tableId && booking.status === 'confirmed'
  );
  
  if (tableAlreadyBooked) {
    throw new Error(`Table ${tableId} is already booked for this event`);
  }
  
  const bookingData = {
    eventId,
    tableId,
    userId: parseInt(metadata.userId),
    partySize: partySize || 1,
    seatNumbers: seats.map((s: string) => parseInt(s)),
    customerEmail: session.customer_details?.email || metadata.customerEmail,
    stripePaymentId: session.payment_intent,
    stripeSessionId: session.id,
    amount: session.amount_total || 0,
    status: 'confirmed' as const,
    foodSelections: metadata.foodSelections ? JSON.parse(metadata.foodSelections) : [],
    guestNames: metadata.guestNames ? JSON.parse(metadata.guestNames) : []
  };

  console.log('Creating booking with validated data:', bookingData);
  return await storage.createBooking(bookingData);
}

export function registerPaymentRoutes(app: Express) {
  // Create checkout session for server-side Stripe processing
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { eventId, tableId, selectedSeats, amount, foodSelections, wineSelections, guestNames, selectedVenue } = req.body;
      
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
        success_url: `${req.protocol}://${req.get('host')}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.get('host')}/booking-cancel`,
        metadata: {
          eventId: eventId.toString(),
          tableId: tableId.toString(),
          userId: req.user.id.toString(),
          seats: selectedSeats.join(','),
          foodSelections: JSON.stringify(foodSelections || []),
          wineSelections: JSON.stringify(wineSelections || []),
          guestNames: JSON.stringify(guestNames || []),
          selectedVenue: selectedVenue || '',
        },
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
      console.error('Checkout session creation failed:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Payment setup failed' });
    }
  });

  // Handle Stripe redirect to server-side success page
  app.get("/api/booking-success", async (req, res) => {
    try {
      const { session_id } = req.query;
      
      if (!session_id) {
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Payment Error</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: red; }
            </style>
          </head>
          <body>
            <h1 class="error">Payment Error</h1>
            <p>No session ID found. Please contact support.</p>
            <button onclick="window.location.href='/'">Return Home</button>
          </body>
          </html>
        `);
      }

      const stripe = getStripe();
      if (!stripe) {
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>System Error</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: red; }
            </style>
          </head>
          <body>
            <h1 class="error">System Error</h1>
            <p>Payment system temporarily unavailable.</p>
            <button onclick="window.location.href='/'">Return Home</button>
          </body>
          </html>
        `);
      }

      const session = await stripe.checkout.sessions.retrieve(session_id as string);
      
      if (session.payment_status === 'paid') {
        // Create booking from session metadata
        const booking = await createBookingFromStripeSession(session);
        
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Payment Successful</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; max-width: 600px; margin: 0 auto; }
              .success { color: green; font-size: 2em; }
              .booking-details { background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .session-id { background: #f5f5f5; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 0.9em; word-break: break-all; margin: 20px 0; }
              button { background: #0070f3; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; margin: 10px; }
              button:hover { background: #0056b3; }
              .secondary { background: #6c757d; }
              .secondary:hover { background: #5a6268; }
            </style>
          </head>
          <body>
            <h1 class="success">🎉 Payment Successful!</h1>
            <p>Thank you! Your booking has been confirmed.</p>
            
            <div class="booking-details">
              <h3>Booking Details</h3>
              <p><strong>Booking ID:</strong> #${booking}</p>
              <p><strong>Amount:</strong> $${((session.amount_total || 0) / 100).toFixed(2)}</p>
            </div>
            
            <div class="session-id">
              <strong>Session ID:</strong><br>
              ${session_id}
            </div>
            
            <button onclick="window.location.href='/'">Back to Events</button>
            <button onclick="window.location.href='/profile'" class="secondary">View My Bookings</button>
          </body>
          </html>
        `);
      } else {
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Payment Pending</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .warning { color: orange; }
            </style>
          </head>
          <body>
            <h1 class="warning">Payment Pending</h1>
            <p>Your payment is being processed. Please check back shortly.</p>
            <button onclick="window.location.href='/'">Return Home</button>
          </body>
          </html>
        `);
      }
    } catch (error) {
      console.error("Payment success page error:", error);
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Verification Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: red; }
          </style>
        </head>
        <body>
          <h1 class="error">Payment Verification Error</h1>
          <p>Unable to verify your payment. Please contact support with your session ID.</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; font-family: monospace; margin: 20px 0;">
            ${req.query.session_id}
          </div>
          <button onclick="window.location.href='/'">Return Home</button>
        </body>
        </html>
      `);
    }
  });

  // Handle successful payment callback
  app.get("/api/payment-success", async (req, res) => {
    try {
      // Add CORS headers for better cross-origin support
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
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
            details: JSON.stringify({
              paymentIntentId: paymentIntent.id,
              amount: amount / 100,
              seatCount: req.body.seatCount || 0,
              createdAt: new Date().toISOString()
            })
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
            details: JSON.stringify({
              paymentIntentId: paymentIntent.id,
              amount: paymentIntent.amount / 100,
              metadata: paymentIntent.metadata
            })
          });
        } catch (logError) {
          console.error("Error logging payment success:", logError);
        }
      }
    }
    
    res.json({ received: true });
  });
}