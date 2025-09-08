import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import { setupAuth } from "./auth";
import { setupSecurity } from "./security";
import { registerRoutes } from "./routes";
import { registerPaymentRoutes } from "./routes-payment";
import { registerAdminRoutes } from "./routes-admin";
import { registerVenueRoutes } from "./routes-venue";
import { registerSeatSelectionRoutes } from "./routes-seat-selection";
import { registerPricingRoutes } from "./routes-pricing";
import { pool } from "./db";
import { getStripe } from "./stripe";

const app = express();
const PgSession = connectPgSimple(session);

// CORS configuration for both dev servers
const corsOptions = {
  origin: true, // Allow all origins for Replit hosting
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
};

app.use(cors(corsOptions));

// Booking success route (BEFORE all middleware)
app.get('/booking-success', async (req, res) => {
  console.log("🎯 BOOKING SUCCESS ROUTE HIT - BYPASSING ALL MIDDLEWARE");
  console.log("Request URL:", req.url);
  console.log("Query params:", req.query);
  
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
          <p>No session ID provided.</p>
          <a href="http://localhost:5000">Return to Home</a>
        </body>
        </html>
      `);
    }

    const stripe = getStripe();
    if (!stripe) {
      throw new Error("Stripe not initialized");
    }

    const session = await stripe.checkout.sessions.retrieve(session_id as string);
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Successful</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
          }
          .container {
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 15px;
            max-width: 600px;
            margin: 0 auto;
            backdrop-filter: blur(10px);
          }
          .success { color: #4CAF50; font-size: 48px; margin-bottom: 20px; }
          .details { background: rgba(255,255,255,0.9); color: #333; padding: 20px; border-radius: 10px; margin: 20px 0; }
          .button { 
            background: #4CAF50; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            display: inline-block; 
            margin-top: 20px;
            font-weight: bold;
          }
          .button:hover { background: #45a049; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✓</div>
          <h1>Payment Successful!</h1>
          <p>Your booking has been confirmed.</p>
          
          <div class="details">
            <h3>Booking Details</h3>
            <p><strong>Session ID:</strong> ${session.id}</p>
            <p><strong>Payment ID:</strong> ${session.payment_intent}</p>
            <p><strong>Event ID:</strong> ${session.metadata?.eventId || 'N/A'}</p>
            <p><strong>Amount:</strong> $${((session.amount_total || 0) / 100).toFixed(2)}</p>
            <p><strong>Email:</strong> ${session.customer_details?.email || session.metadata?.customerEmail || 'N/A'}</p>
            <p><strong>Status:</strong> ${session.payment_status}</p>
          </div>
          
          <a href="http://localhost:5000" class="button">Return to Home</a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).send(`
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
        <h1 class="error">Error Loading Payment Details</h1>
        <p>There was an error retrieving your payment information.</p>
        <a href="http://localhost:5000">Return to Home</a>
      </body>
      </html>
    `);
  }
});

// Booking cancel route (BEFORE all middleware)
app.get('/booking-cancel', (req, res) => {
  console.log("BOOKING CANCEL ROUTE HIT - EXPRESS ONLY SERVER");
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Cancelled</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 50px; 
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
          color: white;
          margin: 0;
        }
        .container {
          background: rgba(255,255,255,0.1);
          padding: 40px;
          border-radius: 15px;
          max-width: 600px;
          margin: 0 auto;
          backdrop-filter: blur(10px);
        }
        .cancel { color: #ff4757; font-size: 48px; margin-bottom: 20px; }
        .button { 
          background: #3742fa; 
          color: white; 
          padding: 15px 30px; 
          text-decoration: none; 
          border-radius: 5px; 
          display: inline-block; 
          margin-top: 20px;
          font-weight: bold;
        }
        .button:hover { background: #2f3542; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="cancel">✗</div>
        <h1>Payment Cancelled</h1>
        <p>Your payment was cancelled. No charges were made.</p>
        <p>You can try again or contact support if you need assistance.</p>
        
        <a href="http://localhost:5000" class="button">Return to Home</a>
      </div>
    </body>
    </html>
  `);
});

// Security middleware
setupSecurity(app);

// Standard middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  store: new PgSession({ pool }),
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize authentication
setupAuth(app);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', port: 3002, timestamp: new Date().toISOString() });
});

// Register all routes
registerRoutes(app);
registerPaymentRoutes(app);
registerAdminRoutes(app);
registerVenueRoutes(app);
registerSeatSelectionRoutes(app);
registerPricingRoutes(app);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = 3002;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✓ Express-only server running on port ${PORT}`);
  console.log(`✓ Booking success URL: http://localhost:${PORT}/booking-success`);
  console.log(`✓ Booking cancel URL: http://localhost:${PORT}/booking-cancel`);
});