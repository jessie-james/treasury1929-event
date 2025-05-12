import { Express } from "express";
import Stripe from "stripe";
import crypto from "crypto";
import { storage } from "./storage";

// In-memory temporary storage for payment references
// In production this would be in a database
interface PaymentRecord {
  reference: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  metadata: Record<string, any>;
  created: Date;
  paymentIntentId?: string;
}

class DirectPaymentManager {
  private payments: Map<string, PaymentRecord> = new Map();
  
  // Create a payment record with a unique reference
  createPayment(amount: number, metadata: Record<string, any> = {}): string {
    // Generate a unique reference
    const reference = crypto.randomBytes(12).toString('hex');
    
    // Store the payment record
    this.payments.set(reference, {
      reference,
      amount,
      status: "pending",
      metadata,
      created: new Date()
    });
    
    return reference;
  }
  
  // Get a payment record by reference
  getPayment(reference: string): PaymentRecord | undefined {
    return this.payments.get(reference);
  }
  
  // Update a payment record
  updatePayment(reference: string, updates: Partial<PaymentRecord>): boolean {
    if (!this.payments.has(reference)) {
      return false;
    }
    
    const payment = this.payments.get(reference)!;
    this.payments.set(reference, { ...payment, ...updates });
    return true;
  }
  
  // Clean up old payment records (call this periodically)
  cleanupOldPayments(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    Array.from(this.payments.entries()).forEach(([ref, payment]) => {
      if (payment.created < cutoff) {
        this.payments.delete(ref);
      }
    });
  }
}

// Create a manager instance
const paymentManager = new DirectPaymentManager();

// Schedule cleanup every hour
setInterval(() => {
  paymentManager.cleanupOldPayments();
}, 60 * 60 * 1000);

// Register direct payment routes
export function registerDirectPaymentRoutes(app: Express): void {
  // Create a new Stripe instance
  let stripe: Stripe | null = null;
  
  // Initialize Stripe
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      console.log("Direct payment routes: Stripe initialized successfully");
    } catch (error) {
      console.error("Direct payment routes: Failed to initialize Stripe:", error);
    }
  } else {
    console.error("Direct payment routes: Missing STRIPE_SECRET_KEY environment variable");
  }
  
  // Create payment reference endpoint - for internal use
  app.post("/api/payment/reference", (req, res) => {
    try {
      // Get amount and metadata from request
      const { amount, metadata = {} } = req.body;
      
      // Validate amount
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: "Invalid amount"
        });
      }
      
      // Create a payment reference
      const reference = paymentManager.createPayment(amount, metadata);
      
      // Return the reference
      res.json({
        success: true,
        reference,
        amount
      });
    } catch (error: any) {
      console.error("Error creating payment reference:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to create payment reference"
      });
    }
  });
  
  // Process direct payment endpoint - used by standalone payment page
  app.post("/api/payment/direct", async (req, res) => {
    try {
      // Verify Stripe is initialized
      if (!stripe) {
        return res.status(503).json({
          success: false,
          error: "Payment service unavailable"
        });
      }
      
      // Get reference from request
      const { reference } = req.body;
      
      if (!reference) {
        return res.status(400).json({
          success: false,
          error: "Missing payment reference"
        });
      }
      
      // Lookup the payment by reference
      const payment = paymentManager.getPayment(reference);
      
      if (!payment) {
        return res.status(404).json({
          success: false,
          error: "Invalid payment reference"
        });
      }
      
      // Check if a payment intent already exists
      if (payment.paymentIntentId) {
        try {
          // Retrieve the existing payment intent
          const intent = await stripe.paymentIntents.retrieve(payment.paymentIntentId);
          
          // If it's still valid and not expired, return it
          if (intent.status !== 'canceled' && intent.status !== 'succeeded') {
            return res.json({
              success: true,
              clientSecret: intent.client_secret,
              amount: payment.amount,
              reference
            });
          }
          // Otherwise continue to create a new one
        } catch (err) {
          // If retrieval fails, create a new payment intent
          console.log("Failed to retrieve existing payment intent, creating new one");
        }
      }
      
      // Convert amount to cents
      const amountInCents = Math.round(payment.amount * 100);
      
      // Create a payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "usd",
        automatic_payment_methods: {
          enabled: true
        },
        metadata: {
          reference,
          ...payment.metadata,
          createdAt: new Date().toISOString()
        }
      });
      
      // Update the payment record with the payment intent ID
      paymentManager.updatePayment(reference, {
        paymentIntentId: paymentIntent.id
      });
      
      // Log successful creation
      console.log(`Direct payment intent created: ${paymentIntent.id} for reference ${reference}`);
      
      // Return client secret to the frontend
      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        amount: payment.amount,
        reference
      });
    } catch (error: any) {
      console.error("Error creating direct payment intent:", error);
      
      // Format Stripe-specific errors
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
  
  // Verify payment endpoint
  app.post("/api/payment/verify", async (req, res) => {
    try {
      // Verify Stripe is initialized
      if (!stripe) {
        return res.status(503).json({
          success: false,
          error: "Payment service unavailable"
        });
      }
      
      const { paymentIntentId, reference } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({
          success: false,
          error: "Missing payment intent ID"
        });
      }
      
      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      // Get the reference from the payment intent metadata if not provided
      const paymentReference = reference || paymentIntent.metadata?.reference;
      
      // If we have a reference, update the payment record
      if (paymentReference && paymentManager.getPayment(paymentReference)) {
        paymentManager.updatePayment(paymentReference, {
          status: paymentIntent.status === "succeeded" ? "completed" : 
                 paymentIntent.status === "canceled" ? "failed" : "pending",
          paymentIntentId: paymentIntent.id
        });
      }
      
      // Create a log entry
      try {
        const userId = parseInt(paymentIntent.metadata?.userId || '0');
        
        if (userId > 0) {
          await storage.createAdminLog({
            userId,
            action: 'payment_verified',
            entityType: 'payment',
            entityId: 0,
            details: {
              paymentIntentId,
              reference: paymentReference,
              status: paymentIntent.status,
              amount: paymentIntent.amount / 100,
              metadata: paymentIntent.metadata
            }
          });
        }
      } catch (logError) {
        console.error("Failed to log payment verification:", logError);
      }
      
      // Return the payment status
      res.json({
        success: true,
        status: paymentIntent.status,
        reference: paymentReference,
        amount: paymentIntent.amount / 100
      });
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      
      res.status(500).json({
        success: false,
        error: error.message || "Failed to verify payment"
      });
    }
  });
  
  // Additional convenience endpoint to check payment status by reference
  app.get("/api/payment/status/:reference", async (req, res) => {
    try {
      const { reference } = req.params;
      
      if (!reference) {
        return res.status(400).json({
          success: false,
          error: "Missing payment reference"
        });
      }
      
      // Get payment record
      const payment = paymentManager.getPayment(reference);
      
      if (!payment) {
        return res.status(404).json({
          success: false,
          error: "Payment reference not found"
        });
      }
      
      // If we have a payment intent ID and Stripe is available, get the latest status
      if (payment.paymentIntentId && stripe) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(payment.paymentIntentId);
          
          // Update payment record with latest status
          paymentManager.updatePayment(reference, {
            status: paymentIntent.status === "succeeded" ? "completed" : 
                   paymentIntent.status === "canceled" ? "failed" : "pending"
          });
          
          // Return updated payment details
          const updatedPayment = paymentManager.getPayment(reference)!;
          
          return res.json({
            success: true,
            reference,
            status: updatedPayment.status,
            amount: updatedPayment.amount,
            created: updatedPayment.created
          });
        } catch (stripeError) {
          console.error("Error retrieving payment intent:", stripeError);
        }
      }
      
      // Return current payment details from local storage
      res.json({
        success: true,
        reference,
        status: payment.status,
        amount: payment.amount,
        created: payment.created
      });
    } catch (error: any) {
      console.error("Error checking payment status:", error);
      
      res.status(500).json({
        success: false,
        error: error.message || "Failed to check payment status"
      });
    }
  });
  
  console.log("✓ Direct payment routes registered successfully");
}