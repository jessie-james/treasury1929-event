import { Express } from "express";
import crypto from "crypto";
import Stripe from "stripe";

// Simple in-memory store for one-time tokens
// In production, you would use Redis or similar
interface TokenData {
  created: Date;
  expires: Date;
  used: boolean;
  metadata: Record<string, any>;
}

class OneTimeTokenManager {
  private tokens: Map<string, TokenData> = new Map();
  
  // Generate a new one-time token
  generateToken(metadata: Record<string, any> = {}, expiresInMinutes: number = 15): string {
    // Create a unique token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Store token data
    this.tokens.set(token, {
      created: new Date(),
      expires: new Date(Date.now() + expiresInMinutes * 60 * 1000),
      used: false,
      metadata
    });
    
    // Return the token
    return token;
  }
  
  // Validate and consume a token
  validateToken(token: string): TokenData | null {
    // Check if token exists
    if (!this.tokens.has(token)) {
      return null;
    }
    
    const tokenData = this.tokens.get(token)!;
    
    // Check if token is expired
    if (tokenData.expires < new Date()) {
      this.tokens.delete(token);
      return null;
    }
    
    // Check if token has already been used
    if (tokenData.used) {
      return null;
    }
    
    // Mark token as used
    tokenData.used = true;
    this.tokens.set(token, tokenData);
    
    return tokenData;
  }
  
  // Clean up expired tokens
  cleanupExpiredTokens(): void {
    const now = new Date();
    // Use Array.from to convert the entries to an array first to avoid iterator issues
    Array.from(this.tokens.entries()).forEach(([token, data]) => {
      if (data.expires < now) {
        this.tokens.delete(token);
      }
    });
  }
}

// Create token manager instance
const tokenManager = new OneTimeTokenManager();

// Schedule cleanup every hour
setInterval(() => {
  tokenManager.cleanupExpiredTokens();
}, 60 * 60 * 1000);

// Register OTP routes
export function registerOtpRoutes(app: Express): void {
  // Create a new Stripe instance
  let stripe: Stripe | null = null;
  
  // Initialize Stripe
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      console.log("OTP routes: Stripe initialized successfully");
    } catch (error) {
      console.error("OTP routes: Failed to initialize Stripe:", error);
    }
  } else {
    console.error("OTP routes: Missing STRIPE_SECRET_KEY environment variable");
  }
  
  // Generate OTP route
  app.post("/api/payment/token", (req, res) => {
    // Extract metadata from request
    const { amount, metadata = {} } = req.body;
    
    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid amount"
      });
    }
    
    // Generate and return token
    const token = tokenManager.generateToken({
      amount,
      ...metadata,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      token,
      expiresIn: 15 * 60 // 15 minutes in seconds
    });
  });
  
  // Create payment intent with OTP
  app.post("/api/payment/process", async (req, res) => {
    try {
      // Verify Stripe is initialized
      if (!stripe) {
        return res.status(500).json({
          success: false,
          error: "Payment service unavailable"
        });
      }
      
      // Extract token from request
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          error: "Missing payment token"
        });
      }
      
      // Validate token
      const tokenData = tokenManager.validateToken(token);
      
      if (!tokenData) {
        return res.status(401).json({
          success: false,
          error: "Invalid or expired payment token"
        });
      }
      
      // Extract amount from token metadata
      const amount = tokenData.metadata.amount;
      
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: "Invalid payment amount"
        });
      }
      
      // Convert to cents for Stripe
      const amountInCents = Math.round(amount * 100);
      
      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "usd",
        automatic_payment_methods: {
          enabled: true
        },
        metadata: {
          ...tokenData.metadata,
          tokenId: token.substring(0, 8), // Include part of token for reference
          source: "otp_payment"
        }
      });
      
      // Log the successful creation
      console.log(`OTP payment intent created: ${paymentIntent.id} for $${amount}`);
      
      // Return client secret to client
      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret
      });
      
    } catch (error: any) {
      console.error("Error creating OTP payment intent:", error);
      
      // Format error response
      let errorMessage = "Payment processing failed";
      
      if (error instanceof Stripe.errors.StripeError) {
        errorMessage = error.message;
      }
      
      res.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  });
  
  console.log("✓ OTP payment routes registered successfully");
}