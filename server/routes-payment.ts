// Server-side payment routes using Stripe Checkout
import type { Express } from "express";
import { getStripe, createPaymentIntent, formatStripeError } from "./stripe";
import { storage } from "./storage";
import express from "express";

// Helper function to create booking from Stripe session
export async function createBookingFromStripeSession(session: any) {
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
  
  // DEBUG: Log metadata wine selections
  console.log("🍷 WINE DEBUG: Metadata wine selections from Stripe:", metadata.wineSelections);
  const parsedWineSelections = metadata.wineSelections ? JSON.parse(metadata.wineSelections) : [];
  console.log("🍷 WINE DEBUG: Parsed wine selections:", JSON.stringify(parsedWineSelections, null, 2));

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
    wineSelections: parsedWineSelections,
    guestNames: metadata.guestNames ? JSON.parse(metadata.guestNames) : [],
    selectedVenue: metadata.selectedVenue || null,
    holdStartTime: new Date()
  };

  console.log('Creating booking with validated data:', bookingData);
  const bookingId = await storage.createBooking(bookingData);
  
  // Send booking confirmation email
  try {
    const { EmailService } = await import('./email-service');
    
    // Get the created booking with full details
    const createdBooking = await storage.getBooking(bookingId.id);
    const event = await storage.getEventById(eventId);
    const table = await storage.getTableById(tableId);
    const venue = await storage.getVenueById(parseInt(metadata.selectedVenue) || 4);
    
    if (createdBooking && event && table && venue) {
      const emailData = {
        booking: {
          id: createdBooking.id.toString(),
          customerEmail: createdBooking.customerEmail,
          partySize: createdBooking.partySize || 1,
          status: createdBooking.status,
          notes: createdBooking.notes || undefined,
          stripePaymentId: createdBooking.stripePaymentId || undefined,
          createdAt: createdBooking.createdAt,
          guestNames: createdBooking.guestNames || []
        },
        event: {
          id: event.id.toString(),
          title: event.title,
          date: event.date,
          description: event.description || ''
        },
        table: {
          id: table.id.toString(),
          tableNumber: table.tableNumber,
          floor: table.floor,
          capacity: table.capacity
        },
        venue: {
          id: venue.id.toString(),
          name: venue.name,
          address: '2 E Congress St, Ste 100'
        }
      };
      
      const emailSent = await EmailService.sendBookingConfirmation(emailData);
      if (emailSent) {
        console.log(`✓ SUCCESS: Booking confirmation email sent to ${bookingData.customerEmail}`);
        console.log(`  Booking ID: ${bookingId}`);
        console.log(`  Event: ${event.title}`);
        console.log(`  Table: ${table.tableNumber}`);
      } else {
        console.error(`❌ CRITICAL EMAIL FAILURE: Failed to send confirmation email`);
        console.error(`  Customer: ${bookingData.customerEmail}`);
        console.error(`  Booking ID: ${bookingId}`);
        console.error(`  Event: ${event.title}`);
        console.error(`  This customer will NOT receive their ticket!`);
      }
    }
  } catch (emailError) {
    console.error('❌ CRITICAL ERROR: Booking confirmation email system failure');
    console.error('  This means customers are not receiving their tickets!');
    console.error('  Booking was created but email failed');
    console.error('  Email Error Details:', emailError);
    console.error('  Time:', new Date().toISOString());
    // Don't fail the booking creation if email fails, but log extensively
  }
  
  // Immediately sync availability after booking creation
  const { AvailabilitySync } = await import('./availability-sync.js');
  await AvailabilitySync.syncEventAvailability(eventId);
  console.log(`✅ Availability synced for event ${eventId} after booking creation`);
  
  return bookingId;
}

export function registerPaymentRoutes(app: Express) {
  // Create checkout session for server-side Stripe processing
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { eventId, tableId, selectedSeats, amount, foodSelections, wineSelections, guestNames, selectedVenue, partySize } = req.body;
      
      // DEBUG: Log wine selections received from frontend
      console.log("🍷 WINE DEBUG: Wine selections received from frontend:", JSON.stringify(wineSelections, null, 2));
      
      // Use selectedSeats or derive from partySize, and calculate amount if not provided
      const seats = selectedSeats || Array.from({length: partySize || 2}, (_, i) => i + 1);
      const calculatedAmount = amount || (seats.length * 13000); // $130 per person in cents
      
      // Validate input
      if (!eventId || !tableId || (!selectedSeats && !partySize)) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get event and table details for user-friendly display
      const event = await storage.getEventById(eventId);
      const table = await storage.getTableById(tableId);
      
      if (!event || !table) {
        return res.status(404).json({ message: "Event or table not found" });
      }
      
      // Block inactive events from checkout
      if (event.isActive === false) {
        return res.status(400).json({ 
          message: "This event is no longer accepting bookings",
          inactive: true 
        });
      }

      const stripe = getStripe();
      if (!stripe) {
        return res.status(500).json({ error: "Stripe not initialized" });
      }

      // Format event date for display
      const eventDate = new Date(event.date);
      const eventDateFormatted = eventDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${event.title} - Table ${table.tableNumber}`,
                description: `${eventDateFormatted} | ${seats.length} seat${seats.length > 1 ? 's' : ''} | ${table.floor}`,
              },
              unit_amount: calculatedAmount, // total amount in cents - no division needed
            },
            quantity: 1, // quantity is always 1 since amount is already the total
          },
        ],
        mode: 'payment',
        success_url: `${req.protocol}://${req.get('host')}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.get('host')}/booking-cancel`,
        metadata: {
          eventId: eventId.toString(),
          tableId: tableId.toString(),
          userId: req.user.id.toString(),
          seats: seats.join(','),
          foodSelections: JSON.stringify(foodSelections || []),
          wineSelections: JSON.stringify(wineSelections || []),
          guestNames: JSON.stringify(guestNames || {}),
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
              <p><strong>Booking ID:</strong> #${typeof booking === 'object' ? booking.id : booking}</p>
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
        const bookingId = await storage.createBooking(bookingData);
        
        // Send booking confirmation email
        try {
          const { EmailService } = await import('./email-service');
          
          // Get the created booking with full details
          const createdBooking = await storage.getBooking(bookingId.id);
          const event = await storage.getEventById(parseInt(session.metadata!.eventId));
          const table = await storage.getTableById(parseInt(session.metadata!.tableId));
          const venue = await storage.getVenueById(parseInt(session.metadata!.selectedVenue || '4'));
          
          if (createdBooking && event && table && venue) {
            const emailData = {
              booking: {
                id: createdBooking.id.toString(),
                customerEmail: createdBooking.customerEmail,
                partySize: createdBooking.partySize || 1,
                status: createdBooking.status,
                notes: createdBooking.notes || undefined,
                stripePaymentId: createdBooking.stripePaymentId || undefined,
                createdAt: createdBooking.createdAt,
                guestNames: createdBooking.guestNames || []
              },
              event: {
                id: event.id.toString(),
                title: event.title,
                date: event.date,
                description: event.description || ''
              },
              table: {
                id: table.id.toString(),
                tableNumber: table.tableNumber,
                floor: table.floor,
                capacity: table.capacity
              },
              venue: {
                id: venue.id.toString(),
                name: venue.name,
                address: '2 E Congress St, Ste 100'
              }
            };
            
            const emailSent = await EmailService.sendBookingConfirmation(emailData);
            if (emailSent) {
              console.log(`✓ SUCCESS: Booking confirmation email sent to ${bookingData.customerEmail}`);
              console.log(`  Booking ID: ${bookingId}`);
              console.log(`  Event: ${event.title}`);
              console.log(`  Table: ${table.tableNumber}`);
            } else {
              console.error(`❌ CRITICAL EMAIL FAILURE: Failed to send confirmation email`);
              console.error(`  Customer: ${bookingData.customerEmail}`);
              console.error(`  Booking ID: ${bookingId}`);
              console.error(`  Event: ${event.title}`);
              console.error(`  This customer will NOT receive their ticket!`);
            }
          }
        } catch (emailError) {
          console.error('❌ CRITICAL ERROR: Booking confirmation email system failure');
          console.error('  This means customers are not receiving their tickets!');
          console.error('  Booking was created but email failed');
          console.error('  Email Error Details:', emailError);
          console.error('  Time:', new Date().toISOString());
          // Don't fail the booking creation if email fails, but log extensively
        }
        
        // Sync availability after booking creation
        const { AvailabilitySync } = await import('./availability-sync.js');
        await AvailabilitySync.syncEventAvailability(parseInt(session.metadata!.eventId));
        console.log(`✅ Availability synced for event ${session.metadata!.eventId} after direct booking creation`);
        
        res.json({ success: true, booking: bookingId });
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
  
  // Recovery endpoint to manually process a Stripe session
  app.post("/api/admin/recover-booking", async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      const stripe = getStripe();
      if (!stripe) {
        return res.status(500).json({ error: "Stripe not initialized" });
      }

      console.log(`Attempting to recover booking for session: ${sessionId}`);
      
      // Retrieve the session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.payment_status !== 'paid') {
        return res.status(400).json({ 
          error: 'Session payment is not completed',
          paymentStatus: session.payment_status 
        });
      }

      if (!session.metadata) {
        return res.status(400).json({ error: 'Session has no metadata' });
      }

      const metadata = session.metadata;
      // Check if booking already exists
      const existingBookings = await storage.getBookingsByEventId(parseInt(metadata.eventId));
      const existingBooking = existingBookings.find(booking => 
        booking.stripePaymentId === session.payment_intent ||
        booking.tableId === parseInt(metadata.tableId)
      );

      if (existingBooking) {
        return res.json({ 
          message: 'Booking already exists',
          bookingId: existingBooking.id,
          status: 'already_exists'
        });
      }

      // Create the missing booking
      const booking = await createBookingFromStripeSession(session);
      
      // The createBookingFromStripeSession function now automatically syncs availability
      
      // Send confirmation email
      const { EmailService } = await import('./email-service');
      
      const event = await storage.getEventById(parseInt(metadata.eventId));
      const table = await storage.getTableById(parseInt(metadata.tableId));
      const venue = await storage.getVenueById(table?.venueId || 0);
      
      let emailSent = false;
      if (event && table && venue) {
        const emailData = {
          booking: {
            id: booking.toString(),
            customerEmail: session.customer_details?.email || metadata.customerEmail || '',
            partySize: metadata.seats ? metadata.seats.split(',').length : 1,
            status: 'confirmed',
            stripePaymentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
            createdAt: new Date(),
            guestNames: metadata.guestNames ? JSON.parse(metadata.guestNames) : []
          },
          event: {
            id: event.id.toString(),
            title: event.title,
            date: event.date,
            description: event.description || ''
          },
          table: {
            id: table.id.toString(),
            tableNumber: table.tableNumber,
            floor: metadata.selectedVenue || 'Main Floor',
            capacity: table.capacity
          },
          venue: {
            id: venue.id.toString(),
            name: venue.name,
            address: '2 E Congress St, Ste 100'
          }
        };
        
        emailSent = await EmailService.sendBookingConfirmation(emailData);
      }

      res.json({ 
        message: 'Booking recovered successfully',
        bookingId: booking,
        emailSent,
        status: 'recovered'
      });

    } catch (error) {
      console.error("Error recovering booking:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Recovery failed',
        status: 'error'
      });
    }
  });

  // Admin endpoint to view all bookings (for debugging)
  app.get("/api/admin/bookings", async (req, res) => {
    try {
      const bookings = await storage.getBookings();
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch bookings'
      });
    }
  });

  // Manual booking creation from payment details (for missing Stripe bookings)
  app.post("/api/admin/create-missing-booking", async (req, res) => {
    try {
      const { customerEmail, paymentId, sessionId, eventId, tableId, partySize, amount, guestNames, foodSelections, wineSelections } = req.body;
      
      if (!customerEmail || !eventId || !tableId) {
        return res.status(400).json({
          error: 'Customer email, event ID, and table ID are required',
          status: 'error'
        });
      }
      
      // Check if booking already exists
      const existingBookings = await storage.getBookings();
      const existing = existingBookings.find(b => 
        b.customerEmail === customerEmail && b.eventId === parseInt(eventId)
      );
      
      if (existing) {
        return res.json({
          message: 'Booking already exists for this customer and event',
          bookingId: existing.id,
          status: 'already_exists'
        });
      }
      
      // Create booking manually
      const bookingData = {
        eventId: parseInt(eventId),
        tableId: parseInt(tableId),
        userId: null, // Manual creation, no user account required
        partySize: parseInt(partySize) || 1,
        customerEmail: customerEmail,
        stripePaymentId: paymentId || 'manual_recovery_' + Date.now(),
        stripeSessionId: sessionId || null,
        amount: parseInt(amount) || 0,
        status: 'confirmed' as const,
        guestNames: guestNames ? JSON.parse(guestNames) : [],
        foodSelections: foodSelections ? JSON.parse(foodSelections) : [],
        wineSelections: wineSelections ? JSON.parse(wineSelections) : [],
        selectedVenue: 'Main Floor',
        holdStartTime: new Date()
      };
      
      console.log('Creating manual booking:', bookingData);
      const bookingId = await storage.createBooking(bookingData);
      
      // Sync availability after manual booking creation
      const { AvailabilitySync } = await import('./availability-sync.js');
      await AvailabilitySync.syncEventAvailability(parseInt(eventId));
      
      // Send confirmation email
      const { EmailService } = await import('./email-service');
      const booking = await storage.getBookingWithDetails(bookingId.id);
      
      let emailSent = false;
      if (booking) {
        const table = await storage.getTableById(parseInt(tableId));
        const venue = table ? await storage.getVenueById(table.venueId) : null;
        
        const emailData = {
          booking: {
            id: bookingId.toString(),
            customerEmail: customerEmail,
            partySize: parseInt(partySize) || 1,
            status: 'confirmed',
            stripePaymentId: paymentId || 'manual_recovery',
            createdAt: new Date(),
            guestNames: guestNames ? JSON.parse(guestNames) : [],
            foodSelections: foodSelections ? JSON.parse(foodSelections) : [],
            wineSelections: wineSelections ? JSON.parse(wineSelections) : []
          },
          event: {
            id: booking.event.id.toString(),
            title: booking.event.title,
            date: booking.event.date,
            description: booking.event.description || ''
          },
          table: {
            id: booking.table.id.toString(),
            tableNumber: booking.table.tableNumber,
            floor: 'Main Floor',
            capacity: booking.table.capacity
          },
          venue: {
            id: venue?.id.toString() || '1',
            name: venue?.name || 'The Treasury 1929',
            address: '2 E Congress St, Ste 100'
          }
        };
        
        emailSent = await EmailService.sendBookingConfirmation(emailData);
      }
      
      res.json({
        message: 'Missing booking created successfully',
        bookingId: bookingId,
        customerEmail: customerEmail,
        emailSent: emailSent,
        status: 'manual_recovery_success'
      });
      
    } catch (error) {
      console.error("Error creating missing booking:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create booking',
        status: 'error'
      });
    }
  });

  // Resend confirmation email for existing booking
  app.post("/api/admin/resend-email", async (req, res) => {
    try {
      const { bookingId, email } = req.body;
      
      let booking;
      
      if (bookingId) {
        booking = await storage.getBookingWithDetails(bookingId);
      } else if (email) {
        const allBookings = await storage.getBookings();
        booking = allBookings.find(b => b.customerEmail === email);
      }
      
      if (!booking) {
        return res.status(404).json({
          error: 'Booking not found',
          status: 'not_found'
        });
      }
      
      const { EmailService } = await import('./email-service');
      
      // Get venue info for the booking
      const table = await storage.getTableById(booking.tableId);
      const venue = table ? await storage.getVenueById(table.venueId) : null;
      
      const emailData = {
        booking: {
          id: booking.id.toString(),
          customerEmail: booking.customerEmail,
          partySize: booking.partySize || 1,
          status: booking.status,
          stripePaymentId: booking.stripePaymentId || undefined,
          createdAt: booking.createdAt,
          guestNames: booking.guestNames || [],
          foodSelections: booking.foodSelections || [],
          wineSelections: booking.wineSelections || []
        },
        event: {
          id: booking.event.id.toString(),
          title: booking.event.title,
          date: booking.event.date,
          description: booking.event.description || ''
        },
        table: {
          id: booking.table.id.toString(),
          tableNumber: booking.table.tableNumber,
          floor: booking.selectedVenue || 'Main Floor',
          capacity: booking.table.capacity
        },
        venue: {
          id: venue?.id.toString() || '1',
          name: venue?.name || 'The Treasury 1929',
          address: '2 E Congress St, Ste 100'
        }
      };
      
      const emailSent = await EmailService.sendBookingConfirmation(emailData);
      
      res.json({
        message: 'Confirmation email resent successfully',
        bookingId: booking.id,
        customerEmail: booking.customerEmail,
        emailSent,
        status: booking.status,
        action: 'email_resent'
      });
      
    } catch (error) {
      console.error("Error resending email:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to resend email',
        status: 'error'
      });
    }
  });

  // Emergency system sync endpoint to fix availability after missing bookings
  app.post("/api/admin/sync-all-availability", async (req, res) => {
    try {
      console.log('🔄 Starting emergency availability sync for all events...');
      
      const { AvailabilitySync } = await import('./availability-sync.js');
      await AvailabilitySync.syncAllEventsAvailability();
      
      // Get updated availability for verification
      const events = await storage.getAllEvents();
      const availabilityReport = [];
      
      for (const event of events) {
        const realTimeData = await AvailabilitySync.getRealTimeAvailability(event.id);
        availabilityReport.push({
          eventId: event.id,
          title: event.title,
          ...realTimeData
        });
      }
      
      res.json({
        message: 'All event availability synchronized successfully',
        syncedEvents: events.length,
        availabilityReport,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("Error during emergency availability sync:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Sync failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Add a webhook endpoint for Stripe events with deduplication
  app.post("/api/stripe-webhook", async (req, res) => {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).send("Stripe not initialized");
    }
    
    let webhookEvent;
    
    try {
      // Verify webhook signature
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (webhookSecret && req.headers['stripe-signature']) {
        webhookEvent = stripe.webhooks.constructEvent(
          req.body,
          req.headers['stripe-signature'] as string,
          webhookSecret
        );
      } else {
        // For testing, just parse the JSON
        webhookEvent = req.body;
      }
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Check for duplicate webhook events using Stripe event ID
    try {
      const processedEvents = await storage.getProcessedWebhookEvents?.() || [];
      if (processedEvents.includes(webhookEvent.id)) {
        console.log(`[WEBHOOK] Event ${webhookEvent.id} already processed - skipping duplicate`);
        return res.json({ received: true, duplicate: true });
      }
    } catch (err) {
      console.warn('[WEBHOOK] Could not check for duplicate events, proceeding with processing');
    }
    
    // Handle specific webhook events
    if (webhookEvent.type === 'payment_intent.succeeded') {
      const paymentIntent = webhookEvent.data.object;
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
    
    // Handle checkout session completion
    if (webhookEvent.type === 'checkout.session.completed') {
      const session = webhookEvent.data.object;
      console.log(`Checkout session completed: ${session.id}`);
      
      try {
        if (session.payment_status === 'paid' && session.metadata) {
          // Create booking from session metadata
          console.log('Creating booking from webhook for session:', session.id);
          const booking = await createBookingFromStripeSession(session);
          console.log(`✅ Webhook created booking #${booking} - confirmation email sent automatically`);
        }
      } catch (error) {
        console.error("Error processing checkout session completion:", error);
        // Don't throw - we don't want to fail the webhook
      }
    }
    
    // Handle charge disputes and refunds
    if (webhookEvent.type === 'charge.dispute.created' || 
        webhookEvent.type === 'payment_intent.amount_capturable_updated' ||
        webhookEvent.type === 'payment_intent.refunded' ||
        webhookEvent.type === 'charge.refunded') {
      
      try {
        const chargeOrIntent = webhookEvent.data.object;
        console.log(`Refund/dispute event received: ${webhookEvent.type} for ${chargeOrIntent.id}`);
        
        // Extract refund amount correctly based on webhook type
        let refundAmount = 0;
        if (webhookEvent.type === 'charge.refunded' && chargeOrIntent.refunds?.data?.length > 0) {
          // For charge.refunded, get the amount from the latest refund
          const latestRefund = chargeOrIntent.refunds.data[0];
          refundAmount = latestRefund.amount;
          console.log(`Extracted refund amount from charge.refunded: ${refundAmount} cents ($${(refundAmount/100).toFixed(2)})`);
        } else if (webhookEvent.type === 'payment_intent.refunded') {
          // For payment_intent.refunded, use amount_received (total refunded)
          refundAmount = chargeOrIntent.amount_received || chargeOrIntent.amount_refunded || chargeOrIntent.amount || 0;
          console.log(`Extracted refund amount from payment_intent.refunded: ${refundAmount} cents ($${(refundAmount/100).toFixed(2)})`);
        } else {
          // Fallback for disputes and other events
          refundAmount = chargeOrIntent.amount_refunded || chargeOrIntent.amount || 0;
          console.log(`Using fallback refund amount: ${refundAmount} cents ($${(refundAmount/100).toFixed(2)})`);
        }
        
        // Find the booking associated with this payment
        let paymentId = '';
        if (webhookEvent.type.includes('payment_intent')) {
          paymentId = chargeOrIntent.id;
        } else if (webhookEvent.type.includes('charge')) {
          paymentId = chargeOrIntent.payment_intent || chargeOrIntent.id;
        }
        
        if (paymentId) {
          const allBookings = await storage.getBookings();
          const booking = allBookings.find(b => 
            b.stripePaymentId === paymentId || 
            b.stripePaymentId === chargeOrIntent.id
          );
          
          if (booking && booking.status === 'confirmed') {
            console.log(`Processing automatic refund for booking #${booking.id}`);
            
            // Update booking status to refunded
            await storage.updateBookingStatus(booking.id, 'refunded');
            
            // Sync availability - table becomes available again
            const { AvailabilitySync } = await import('./availability-sync.js');
            await AvailabilitySync.syncEventAvailability(booking.eventId);
            console.log(`✅ Table ${booking.tableId} released for event ${booking.eventId} after refund`);
            
            // Send refund notification email using centralized email service
            try {
              const { sendEmail } = await import('./email-service');
              
              // Get event, table, and venue details for email
              const event = await storage.getEventById(booking.eventId);
              const table = await storage.getTableById(booking.tableId);
              const venue = table ? await storage.getVenueById(table.venueId) : null;
              
              if (event && table && venue) {
                const emailData = {
                  booking: {
                    id: booking.id,
                    customerEmail: booking.customerEmail,
                    partySize: booking.partySize || 1,
                    status: 'refunded',
                    stripePaymentId: booking.stripePaymentId,
                    createdAt: booking.createdAt,
                    guestNames: booking.guestNames || []
                  },
                  event: {
                    id: event.id,
                    title: event.title,
                    date: event.date,
                    description: event.description || ''
                  },
                  table: {
                    id: table.id,
                    tableNumber: table.tableNumber, // Only use customer-facing label
                    floor: booking.selectedVenue || 'Main Floor',
                    capacity: table.capacity
                  },
                  venue: {
                    id: venue.id,
                    name: venue.name,
                    address: '2 E Congress St, Ste 100'
                  },
                  refund: {
                    amount: refundAmount,
                    currency: 'usd',
                    reason: webhookEvent.type.includes('dispute') ? 'Payment dispute filed' : 'Refund processed',
                    refundId: chargeOrIntent.id
                  }
                };
                
                const { EmailService } = await import('./email-service');
                const emailSent = await EmailService.sendRefundNotification(emailData);
                console.log(`[REFUND EMAIL] ${emailSent ? 'SUCCESS' : 'FAILED'} - Booking #${booking.id}, Customer: ${booking.customerEmail}`);
              } else {
                console.warn(`[REFUND EMAIL] Missing data - Event: ${!!event}, Table: ${!!table}, Venue: ${!!venue} for booking ${booking.id}`);
              }
            } catch (emailError) {
              console.error(`[REFUND EMAIL] Error sending notification for booking ${booking.id}:`, emailError);
              // Don't fail the webhook if email fails
            }
            
            // Log the automatic refund processing
            await storage.createAdminLog({
              userId: booking.userId || 0,
              action: "automatic_refund_processed",
              entityType: "booking",
              entityId: booking.id,
              details: JSON.stringify({
                eventType: webhookEvent.type,
                paymentId: paymentId,
                bookingId: booking.id,
                customerEmail: booking.customerEmail,
                refundAmount: refundAmount,
                refundAmountDollars: (refundAmount / 100).toFixed(2),
                processedAt: new Date().toISOString(),
                tableReleased: true
              })
            });
            
          } else if (booking) {
            console.log(`Booking #${booking.id} already has status: ${booking.status}, skipping refund processing`);
          } else {
            console.log(`No booking found for payment ID: ${paymentId}`);
          }
        }
        
      } catch (error) {
        console.error("Error processing refund webhook:", error);
        // Don't throw - we don't want to fail the webhook
      }
    }
    
    // Mark event as processed to prevent duplicates
    try {
      if (storage.markProcessedWebhookEvent) {
        await storage.markProcessedWebhookEvent(webhookEvent.id);
        console.log(`[WEBHOOK] Marked event ${webhookEvent.id} as processed`);
      }
    } catch (err) {
      console.warn('[WEBHOOK] Could not mark event as processed:', err);
    }
    
    res.json({ received: true, eventId: webhookEvent.id, type: webhookEvent.type });
  });

  // Test endpoint to simulate Stripe refund webhook (for testing)
  app.post("/api/test-refund-webhook", async (req, res) => {
    try {
      const { bookingId, refundAmount, reason } = req.body;
      
      if (!bookingId) {
        return res.status(400).json({ error: 'Booking ID is required' });
      }
      
      // Get the booking
      const allBookings = await storage.getBookings();
      const booking = allBookings.find(b => b.id === parseInt(bookingId));
      
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      if (booking.status !== 'confirmed') {
        return res.status(400).json({ error: `Booking status is ${booking.status}, can only refund confirmed bookings` });
      }
      
      console.log(`TEST: Processing refund for booking #${booking.id}`);
      
      // Update booking status to refunded
      await storage.updateBookingStatus(booking.id, 'refunded');
      
      // Sync availability - table becomes available again
      const { AvailabilitySync } = await import('./availability-sync.js');
      await AvailabilitySync.syncEventAvailability(booking.eventId);
      console.log(`✅ TEST: Table ${booking.tableId} released for event ${booking.eventId} after refund`);
      
      // Send refund notification email
      const { EmailService } = await import('./email-service');
      
      // Get event, table, and venue details for email
      const event = await storage.getEventById(booking.eventId);
      const table = await storage.getTableById(booking.tableId);
      const venue = table ? await storage.getVenueById(table.venueId) : null;
      
      let emailSent = false;
      if (event && table && venue) {
        const emailData = {
          booking: {
            id: booking.id.toString(),
            customerEmail: booking.customerEmail,
            partySize: booking.partySize || 1,
            status: 'refunded',
            stripePaymentId: booking.stripePaymentId,
            createdAt: booking.createdAt,
            guestNames: booking.guestNames || []
          },
          event: {
            id: event.id.toString(),
            title: event.title,
            date: event.date,
            description: event.description || ''
          },
          table: {
            id: table.id.toString(),
            tableNumber: table.tableNumber,
            floor: booking.selectedVenue || 'Main Floor',
            capacity: table.capacity
          },
          venue: {
            id: venue.id.toString(),
            name: venue.name,
            address: '2 E Congress St, Ste 100'
          },
          refund: {
            amount: (refundAmount || 13000), // Default $130 if not specified
            reason: reason || 'Test refund',
            processedAt: new Date(),
            refundId: `test_refund_${Date.now()}`
          }
        };
        
        emailSent = await EmailService.sendRefundNotification(emailData);
        console.log(`TEST: Refund notification email ${emailSent ? 'sent' : 'failed'} for booking #${booking.id}`);
      }
      
      res.json({
        message: 'Test refund processed successfully',
        bookingId: booking.id,
        previousStatus: 'confirmed',
        newStatus: 'refunded',
        tableReleased: true,
        emailSent: emailSent,
        refundAmount: (refundAmount || 13000) / 100,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("Error in test refund webhook:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Test refund failed'
      });
    }
  });

  // Ticket-only checkout route
  app.post("/api/stripe/ticket-only-checkout", async (req, res) => {
    try {
      const { eventId, quantity, guestNames, totalAmount } = req.body;
      
      if (!eventId || !quantity || !totalAmount) {
        return res.status(400).json({ 
          error: "Missing required fields: eventId, quantity, totalAmount" 
        });
      }

      // Get event details
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Check if it's a ticket-only event
      if (event.eventType !== 'ticket-only') {
        return res.status(400).json({ error: "This endpoint is only for ticket-only events" });
      }

      // Check ticket availability using AvailabilitySync
      const { AvailabilitySync } = await import('./availability-sync.js');
      const availability = await AvailabilitySync.getRealTimeAvailability(eventId);
      if (availability.availableSeats < quantity) {
        return res.status(400).json({ error: "Not enough tickets available" });
      }

      const stripe = getStripe();
      if (!stripe) {
        return res.status(500).json({ error: "Payment system not initialized" });
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${event.title} - Tickets`,
                description: `${quantity} ticket${quantity > 1 ? 's' : ''} for ${event.title}`,
              },
              unit_amount: Math.round(totalAmount / quantity), // Price per ticket in cents
            },
            quantity: quantity,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.CLIENT_URL || 'http://localhost:5000'}/ticket-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5000'}/booking-cancel`,
        metadata: {
          eventId: eventId.toString(),
          quantity: quantity.toString(),
          guestNames: JSON.stringify(guestNames || []),
          eventType: 'ticket-only'
        }
      });

      res.json({ sessionId: session.id });
    } catch (error) {
      console.error("Ticket-only checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Ticket-only success page
  app.get("/ticket-success", async (req, res) => {
    try {
      const { session_id } = req.query;
      
      if (!session_id) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Invalid Session</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: red; }
            </style>
          </head>
          <body>
            <h1 class="error">Invalid Session</h1>
            <p>Missing session ID. Please try again.</p>
            <button onclick="window.location.href='/'">Return Home</button>
          </body>
          </html>
        `);
      }

      const stripe = getStripe();
      if (!stripe) {
        return res.status(500).send(`
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
        // Create ticket booking from session metadata
        const metadata = session.metadata;
        if (metadata && metadata.eventId && metadata.quantity) {
          const bookingData = {
            eventId: parseInt(metadata.eventId),
            tableId: null, // No table for ticket-only events
            userId: 1, // Anonymous user for now
            partySize: parseInt(metadata.quantity),
            seatNumbers: [],
            customerEmail: session.customer_details?.email || 'anonymous@example.com',
            stripePaymentId: session.payment_intent,
            stripeSessionId: session.id,
            amount: session.amount_total || 0,
            status: 'confirmed' as const,
            foodSelections: [],
            wineSelections: [],
            guestNames: metadata.guestNames ? JSON.parse(metadata.guestNames) : [],
            selectedVenue: null,
            holdStartTime: new Date()
          };

          try {
            const booking = await storage.createBooking(bookingData);
            console.log("Ticket-only booking created:", booking);
          } catch (error) {
            console.error("Error creating ticket booking:", error);
          }
        }
        
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Tickets Confirmed</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; max-width: 600px; margin: 0 auto; }
              .success { color: green; font-size: 2em; }
              .ticket-details { background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
              button { background: #0070f3; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; margin: 10px; }
              button:hover { background: #0056b3; }
            </style>
          </head>
          <body>
            <h1 class="success">🎟️ Tickets Confirmed!</h1>
            <p>Thank you! Your tickets have been purchased successfully.</p>
            
            <div class="ticket-details">
              <h3>Ticket Details</h3>
              <p><strong>Quantity:</strong> ${metadata?.quantity || 1} ticket${Number(metadata?.quantity || 1) > 1 ? 's' : ''}</p>
              <p><strong>Amount:</strong> $${((session.amount_total || 0) / 100).toFixed(2)}</p>
            </div>
            
            <button onclick="window.location.href='/'">Back to Events</button>
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
      console.error("Ticket success page error:", error);
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
          <p>Unable to verify your payment. Please contact support.</p>
          <button onclick="window.location.href='/'">Return Home</button>
        </body>
        </html>
      `);
    }
  });
}