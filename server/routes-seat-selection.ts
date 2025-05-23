import { type Express } from "express";
import { PgStorage } from "./storage";

export function registerSeatSelectionRoutes(app: Express): void {
  const storage = new PgStorage();

  // Debug endpoint to test route registration
  app.get("/api/venue-layout-test", (req, res) => {
    res.json({ message: "Venue layout routes are working!", timestamp: new Date().toISOString() });
  });


}