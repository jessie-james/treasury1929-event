import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerPaymentRoutes } from "./routes-payment";
import { registerPricingRoutes } from "./routes-pricing";
import { registerVenueRoutes } from "./routes-venue";
import { registerSeatSelectionRoutes } from "./routes-seat-selection";
import { setupVite, log, serveStatic } from "./vite";
import { storage } from "./storage";
import './api-server'; // Start the dedicated API server
import cors from 'cors';
import { setupAuth } from "./auth";
import { setupSecurity, validateInput, securityErrorHandler, validateEnvironment } from "./security";

const app = express();

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
    console.log('🟢 DIRECT BOOKING CREATED SUCCESSFULLY:', newBooking.id);
    
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
            details: {
              path: path,
              method: req.method,
              durationMs: duration,
              status: res.statusCode,
              timestamp: new Date().toISOString()
            }
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
    
    // Set up seat selection routes FIRST to ensure they handle venue-layout calls
    log("Setting up seat selection routes...");
    registerSeatSelectionRoutes(app);
    
    // Set up routes and error handling
    log("Setting up routes...");
    const server = await registerRoutes(app);
    
    // Set up dedicated payment routes
    log("Setting up payment routes...");
    registerPaymentRoutes(app);
    
    // Set up pricing routes
    log("Setting up pricing routes...");
    registerPricingRoutes(app);
    
    // Add catch-all route for React Router (after all API routes)
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      // Skip API routes, assets, Vite dev server routes, and payment success routes
      if (req.path.startsWith('/api/') || 
          req.path.startsWith('/src/') || 
          req.path.startsWith('/@') || 
          req.path.startsWith('/booking-success') ||
          req.path.startsWith('/payment-success') ||
          req.path.includes('.')) {
        return next();
      }
      // For frontend routes, let the frontend handle it
      req.url = '/';
      next();
    });

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
            details: {
              path: req.path,
              method: req.method,
              error: err.message,
              stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
              statusCode: err.status || err.statusCode || 500,
              timestamp: new Date().toISOString(),
              requestBody: req.body ? JSON.stringify(req.body).substring(0, 500) : undefined // Truncate long bodies
            }
          });
        } else {
          // Log unauthenticated errors with user ID 0 (system)
          await storage.createAdminLog({
            userId: 0, // System user ID for unauthenticated errors
            action: "system_error",
            entityType: "system",
            entityId: 0,
            details: {
              path: req.path,
              method: req.method,
              error: err.message,
              timestamp: new Date().toISOString(),
              ipAddress: req.ip
            }
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

    // Add specific routes for client-side routing in production
    const clientRoutes = ['/dashboard', '/auth', '/events', '/onboarding', '/backoffice'];
    clientRoutes.forEach(route => {
      app.get(route, (req, res, next) => {
        req.url = '/';
        next();
      });
      app.get(`${route}/*`, (req, res, next) => {
        req.url = '/';
        next();
      });
    });

    // Set up serving mode based on environment BEFORE starting server
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