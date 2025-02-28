import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
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

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Server error:", err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Static file serving first, then Vite setup if needed
    log("Setting up static file serving...");
    serveStatic(app);

    // Function to attempt server startup
    const startServer = (retries = 3) => {
      log("Attempting to start server...");
      server.listen({
        port: 5000,
        host: "0.0.0.0",
      }, () => {
        log("Server successfully started on port 5000");

        // Only set up Vite after server is running
        if (app.get("env") === "development") {
          log("Setting up Vite development server...");
          setupVite(app, server).catch(error => {
            console.error("Vite setup error:", error);
          });
        }
      }).on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && retries > 0) {
          log(`Port 5000 in use, waiting before retry... (${retries} retries left)`);
          setTimeout(() => {
            log("Retrying server start...");
            server.close();
            startServer(retries - 1);
          }, 1000);
        } else {
          console.error('Failed to start server:', err);
          process.exit(1);
        }
      });
    };

    startServer();
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
})();