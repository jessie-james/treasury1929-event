import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, log, serveStatic } from "./vite";
import { storage } from "./storage";
import cors from 'cors';
import { setupAuth } from "./auth";

const app = express();

// Configure CORS for deployments
const corsOptions = {
  // Allow requests from any origin when deployed
  origin: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true, // Allow cookies to be sent in cross-domain requests
  maxAge: 86400 // Cache preflight requests for 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Standard middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Basic health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "healthy" });
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

    // First set up routes and error handling
    log("Setting up routes...");
    const server = await registerRoutes(app);

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

    // Force port 5000 for Replit
    const port = 5000;
    log(`Attempting to start server on port ${port}...`);

    server.listen(port, "0.0.0.0", () => {
      log(`Server successfully started on port ${port}`);

      // Set up serving mode based on environment
      if (app.get("env") === "development") {
        log("Setting up Vite development server...");
        setupVite(app, server).catch(error => {
          console.error("Failed to setup Vite:", error);
          process.exit(1); // Exit if Vite setup fails
        });
      } else {
        log("Setting up static file serving for production...");
        serveStatic(app);
      }
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