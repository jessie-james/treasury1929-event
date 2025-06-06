import express from "express";
import { testConnection } from "./db-simple";

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Test database connection
app.get("/api/db-test", async (req, res) => {
  try {
    const connected = await testConnection();
    res.json({ 
      status: connected ? "success" : "failed",
      message: connected ? "Database connection successful" : "Database connection failed"
    });
  } catch (error) {
    res.status(500).json({ 
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Start server
async function startServer() {
  try {
    console.log("Testing database connection...");
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error("Failed to connect to database. Exiting...");
      process.exit(1);
    }
    
    app.listen(PORT, () => {
      console.log(`✓ Minimal server running on port ${PORT}`);
      console.log(`✓ Health check: http://localhost:${PORT}/api/health`);
      console.log(`✓ DB test: http://localhost:${PORT}/api/db-test`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();