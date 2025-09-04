import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { type Server } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function mountViteDevMiddleware(app: Express, server: Server) {
  try {
    // Dynamic import with proper error handling for production safety
    const { createServer: createViteServer, createLogger } = await import("vite");
    const viteConfig = await import("../vite.config.js").then(m => m.default);
    
    const viteLogger = createLogger();
    const serverOptions = {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const, // Fix TypeScript error
    };

    const vite = await createViteServer({
      ...viteConfig,
      configFile: false,
      customLogger: {
        ...viteLogger,
        error: (msg, options) => {
          viteLogger.error(msg, options);
          process.exit(1);
        },
      },
      server: serverOptions,
      appType: "custom",
    });

    app.use(vite.middlewares);

    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;

      try {
        if (url.endsWith(".css") || url.endsWith(".ico") || url.startsWith("/api/")) {
          return next();
        }

        let template = fs.readFileSync(
          path.resolve(__dirname, "../client/index.html"),
          "utf-8"
        );

        template = await vite.transformIndexHtml(url, template);

        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });

    return vite;
  } catch (error) {
    console.error("Failed to set up Vite development middleware:", error);
    throw error;
  }
}

export function serveStatic(app: Express) {
  const clientDist = path.resolve(__dirname, "../dist/public");
  app.use(express.static(clientDist));
  
  // Add catch-all route for SPA routing
  app.get('*', (req, res, next) => {
    // Skip API routes and assets
    if (req.path.startsWith('/api/') || 
        req.path.startsWith('/assets/') ||
        req.path.startsWith('/booking-success') ||
        req.path.includes('.')) {
      return next();
    }
    
    try {
      const indexPath = path.resolve(clientDist, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error serving index.html:', err);
          res.status(404).send('Page not found');
        }
      });
    } catch (error) {
      console.error('Error in SPA fallback:', error);
      res.status(500).send('Internal server error');
    }
  });
}