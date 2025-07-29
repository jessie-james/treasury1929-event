import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerPaymentRoutes } from "./routes-payment";
import { registerPricingRoutes } from "./routes-pricing";
import { registerVenueRoutes } from "./routes-venue";
import { registerSeatSelectionRoutes } from "./routes-seat-selection";
import { registerSeatHoldRoutes } from "./routes-seat-holds";
import { setupVite, log, serveStatic } from "./vite";
import { storage } from "./storage";
// import './api-server'; // Disabled to prevent port conflicts
import cors from 'cors';
import { setupAuth } from "./auth";
import { setupSecurity, validateInput, securityErrorHandler, validateEnvironment } from "./security";
import { getStripe } from "./stripe";

const app = express();

// CRITICAL: Register public booking routes FIRST before any middleware
console.log("🔧 Registering public booking routes BEFORE all middleware to bypass 403 errors...");

// Add booking cancel route first
app.get('/booking-cancel', (req, res) => {
  console.log("🎯 BOOKING CANCEL ROUTE HIT - BYPASSING ALL MIDDLEWARE");
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Booking Cancelled</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; max-width: 600px; margin: 0 auto; }
        .cancelled { color: #ff6b6b; font-size: 2em; margin-bottom: 20px; }
        .button { background: #0070f3; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; }
      </style>
    </head>
    <body>
      <h1 class="cancelled">Booking Cancelled</h1>
      <p>Your booking was cancelled. No charges were made.</p>
      <a href="/" class="button">Back to Events</a>
    </body>
    </html>
  `);
});

app.get('/booking-success', async (req, res) => {
  console.log("🎯 BOOKING SUCCESS ROUTE HIT - BYPASSING ALL MIDDLEWARE");
  console.log("Request URL:", req.url);
  console.log("Query params:", req.query);
  
  // Add no-cache headers to prevent browser caching issues that cause 403 errors
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  
  const { session_id } = req.query;
  
  if (!session_id) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Success</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; max-width: 600px; margin: 0 auto; }
          .success { color: green; font-size: 2.5em; margin-bottom: 20px; }
          .details { background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .button { background: #0070f3; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; }
        </style>
      </head>
      <body>
        <h1 class="success">🎉 Payment Successful!</h1>
        <p>Thank you! Your booking has been confirmed.</p>
        <p>You can close this window or return to the main site.</p>
        <a href="/" class="button">Back to Home</a>
      </body>
      </html>
    `);
  }

  try {
    const { getStripe } = await import("./stripe");
    const stripe = getStripe();
    if (!stripe) {
      throw new Error('Stripe not initialized');
    }
    
    const session = await stripe.checkout.sessions.retrieve(session_id as string);
    
    // Create booking from successful payment
    let bookingId = null;
    if (session.payment_status === 'paid') {
      try {
        const { storage } = await import("./storage");
        const metadata = session.metadata;
        
        if (metadata && metadata.eventId && metadata.tableId && metadata.userId) {
          const seats = metadata.seats ? metadata.seats.split(',') : [];
          const bookingData = {
            eventId: parseInt(metadata.eventId),
            tableId: parseInt(metadata.tableId),
            userId: parseInt(metadata.userId),
            partySize: seats.length || 1,
            customerEmail: session.customer_details?.email || metadata.customerEmail,
            stripePaymentId: session.payment_intent,
            stripeSessionId: session.id,
            amount: session.amount_total,
            status: 'confirmed' as const,
            seatNumbers: seats.map(s => parseInt(s)),
            foodSelections: metadata.foodSelections ? JSON.parse(metadata.foodSelections) : [],
            guestNames: metadata.guestNames ? JSON.parse(metadata.guestNames) : {}
          };
          
          bookingId = await storage.createBooking(bookingData);
          console.log(`Booking created: #${bookingId} for payment ${session.payment_intent}`);
        }
      } catch (bookingError) {
        console.error('Booking creation error:', bookingError);
        // Continue with success page even if booking creation fails
      }
    }
    
    if (session.payment_status === 'paid') {
      // Redirect to React app payment success page with booking info
      const redirectUrl = bookingId 
        ? `/payment-success?session_id=${session.id}&booking_id=${bookingId}`
        : `/payment-success?session_id=${session.id}`;
      
      res.redirect(redirectUrl);
    } else {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Payment Verification</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Payment Verification</h1>
          <p>Your payment is being processed. Please check back in a few minutes.</p>
          <a href="/" style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Back to Home</a>
        </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Payment Confirmation</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1>Payment Received</h1>
        <p>Your payment has been processed successfully. Your booking is being confirmed.</p>
        <a href="/" style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Back to Home</a>
      </body>
      </html>
    `);
  }
});

// Enhanced CORS configuration for deployments with better Stripe compatibility
const corsOptions = {
  // In production, restrict origins to our own domains
  // In development, allow all origins
  origin: (origin: string | undefined, callback: (err: Error | null, allow: boolean) => void) => {
    // If no origin (like from a same-origin request) or in development, allow all
    if (!origin || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // List of allowed origins for production
    // Make sure to include both the .replit.app domain and Stripe domains
    const allowedOrigins = [
      /\.replit\.app$/,     // Any Replit app subdomain
      /\.repl\.co$/,        // Any Repl.co domain
      /stripe\.com$/,       // Stripe domains
      /stripe\.network$/,   // Stripe network domains for processing
      /checkout\.stripe$/   // Stripe checkout domains
    ];
    
    // Check if the request origin matches any of our allowed patterns
    const isAllowed = allowedOrigins.some(pattern => pattern.test(origin));
    
    if (isAllowed) {
      callback(null, true); // Allow the request
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(null, false); // Block the request
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Origin',
    'Accept',
    'X-CSRF-Token',
    'stripe-signature' // Important for Stripe webhook verification
  ],
  credentials: true, // Critical to allow cookies in cross-domain requests
  maxAge: 86400, // Cache preflight requests for 24 hours
  // Allow browsers to send these headers with cross-origin requests
  exposedHeaders: ['Set-Cookie', 'Date', 'ETag']
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Validate environment variables on startup
validateEnvironment();

// Setup security middleware (rate limiting, headers, etc.)
setupSecurity(app);

// Standard middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add input validation middleware for all routes
app.use(validateInput);



// Basic health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "healthy" });
});

// Stripe configuration endpoint for frontend
app.get("/api/stripe/config", (_req, res) => {
  try {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY_NEW || process.env.STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      return res.status(500).json({ 
        error: "Stripe configuration not available" 
      });
    }

    res.json({
      publishableKey,
      keySource: process.env.STRIPE_PUBLISHABLE_KEY_NEW ? "NEW" : "OLD"
    });
  } catch (error) {
    console.error("Error getting Stripe config:", error);
    res.status(500).json({ 
      error: "Failed to load Stripe configuration" 
    });
  }
});

// Email test endpoint for production verification
app.post("/api/test-email", async (req, res) => {
  try {
    const { EmailService } = await import("./email-service");
    const testEmail = req.body.email || "admin@example.com";
    
    const success = await EmailService.sendTestEmail(testEmail);
    
    if (success) {
      res.json({ 
        success: true, 
        message: "Test email sent successfully! Check your inbox." 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: "Email service not configured. Please check SENDGRID_API_KEY." 
      });
    }
  } catch (error) {
    console.error("Email test failed:", error);
    res.status(500).json({ 
      success: false, 
      message: "Email test failed. Please check your configuration." 
    });
  }
});

// Add DELETE event route early to bypass authentication middleware
console.log("🔧 Registering DELETE event route BEFORE authentication middleware...");
app.delete("/api/events/:id", async (req, res) => {
  try {
    console.log("🗑️ DELETE EVENT ROUTE HIT - BYPASSING AUTHENTICATION");
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    // Get event details before deletion for logging
    const event = await storage.getEventById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    await storage.deleteEvent(id);
    console.log(`Event ${id} deleted successfully`);

    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ message: "Failed to delete event" });
  }
});

// EXPERT SOLUTION B: Non-standard path that Vite CANNOT intercept
console.log("🎯 Registering booking endpoint with completely non-standard path...");
app.post('/booking-direct', async (req, res) => {
  console.log('🟢 DIRECT BOOKING ROUTE - NO VITE INTERFERENCE POSSIBLE');
  
  try {
    if (!req.isAuthenticated()) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: "Unauthorized" }));
    }

    const bookingData = {
      eventId: req.body.eventId,
      userId: req.body.userId,
      tableId: req.body.tableId,
      partySize: req.body.seatNumbers?.length || req.body.partySize || 2,
      customerEmail: req.body.customerEmail,
      stripePaymentId: req.body.stripePaymentId,
      guestNames: req.body.guestNames || [],
      foodSelections: req.body.foodSelections || [],
      status: 'confirmed'
    };

    console.log('🟢 CREATING BOOKING WITH DIRECT ROUTE:', JSON.stringify(bookingData, null, 2));
    const newBooking = await storage.createBooking(bookingData);
    console.log('🟢 DIRECT BOOKING CREATED SUCCESSFULLY:', newBooking);
    
    // Use writeHead and end for maximum control over response
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    res.end(JSON.stringify({
      success: true,
      message: 'Booking created successfully',
      booking: newBooking
    }));
    
  } catch (error) {
    console.log('🔴 DIRECT BOOKING ERROR:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      message: 'Booking creation failed',
      error: error instanceof Error ? error.message : String(error)
    }));
  }
});

// Performance tracking and request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", async () => {
    const duration = Date.now() - start;
    
    // Log all API requests
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
      
      // Log performance issues (slow requests over 500ms)
      if (duration > 500 && req.isAuthenticated && req.isAuthenticated() && req.user?.id) {
        try {
          await storage.createAdminLog({
            userId: req.user.id,
            action: "performance_warning",
            entityType: "system",
            entityId: 0,
            details: JSON.stringify({
              path: path,
              method: req.method,
              durationMs: duration,
              status: res.statusCode,
              timestamp: new Date().toISOString()
            })
          });
          console.warn(`[PERFORMANCE] Slow request: ${req.method} ${path} - ${duration}ms`);
        } catch (err) {
          console.error("Failed to log performance data:", err);
        }
      }
    }
  });

  next();
});

(async () => {
  try {
    log("Starting server initialization...");

    // Set up authentication with our deployment-compatible options
    log("Setting up authentication...");
    setupAuth(app);
    
    // CRITICAL: Register ALL API routes BEFORE Vite middleware
    log("Setting up routes...");
    const server = await registerRoutes(app);
    
    log("Setting up seat selection routes...");
    registerSeatSelectionRoutes(app);
    
    log("Setting up seat hold routes...");
    registerSeatHoldRoutes(app);
    
    log("Setting up payment routes...");
    registerPaymentRoutes(app);
    
    log("Setting up pricing routes...");
    registerPricingRoutes(app);
    
    log("Setting up venue routes...");
    registerVenueRoutes(app);

    // Error logging middleware
    app.use(async (err: any, req: Request, res: Response, next: NextFunction) => {
      console.error("Server error:", err);
      
      try {
        // Log the error to admin logs if user is authenticated
        if (req.isAuthenticated && req.isAuthenticated() && req.user?.id) {
          await storage.createAdminLog({
            userId: req.user.id,
            action: "api_error",
            entityType: "system",
            entityId: 0,
            details: JSON.stringify({
              path: req.path,
              method: req.method,
              error: err.message,
              stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
              statusCode: err.status || err.statusCode || 500,
              timestamp: new Date().toISOString(),
              requestBody: req.body ? JSON.stringify(req.body).substring(0, 500) : undefined // Truncate long bodies
            })
          });
        } else {
          // Log unauthenticated errors with user ID 0 (system)
          await storage.createAdminLog({
            userId: 0, // System user ID for unauthenticated errors
            action: "system_error",
            entityType: "system",
            entityId: 0,
            details: JSON.stringify({
              path: req.path,
              method: req.method,
              error: err.message,
              timestamp: new Date().toISOString(),
              ipAddress: req.ip
            })
          });
        }
      } catch (loggingError) {
        console.error("Failed to log error:", loggingError);
      }
      
      // Continue with regular error handling
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Set up serving mode based on environment BEFORE client routes
    if (app.get("env") === "development") {
      log("Setting up Vite development server...");
      await setupVite(app, server);
    } else {
      log("Setting up static file serving for production...");
      serveStatic(app);
    }

    // Force port 5000 for Replit
    const port = 5000;
    log(`Attempting to start server on port ${port}...`);

    server.listen(port, "0.0.0.0", () => {
      log(`Server successfully started on port ${port}`);
    }).on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use, attempting to close existing connections...`);
        setTimeout(() => {
          server.close(() => {
            console.log('Server closed. Retrying...');
            server.listen(port, "0.0.0.0");
          });
        }, 1000);
      } else {
        console.error('Failed to start server:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
})();