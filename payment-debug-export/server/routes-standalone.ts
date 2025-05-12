// Standalone payment processing routes
import { Express } from "express";
import Stripe from "stripe";
import { storage } from "./storage";

// Standalone Stripe initialization
const initializeStripe = (): Stripe | null => {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("Missing STRIPE_SECRET_KEY environment variable");
    return null;
  }
  
  try {
    console.log("Initializing Stripe for standalone payment...");
    return new Stripe(process.env.STRIPE_SECRET_KEY);
  } catch (error) {
    console.error("Failed to initialize Stripe:", error);
    return null;
  }
};

// Register standalone payment routes
export function registerStandalonePaymentRoutes(app: Express): void {
  // Check if Stripe is available
  const stripe = initializeStripe();
  if (!stripe) {
    console.error("Stripe initialization failed. Standalone payment routes will not work.");
    return;
  }
  
  // Simple standalone payment endpoint that doesn't rely on authentication
  app.post('/api/standalone-payment', async (req, res) => {
    try {
      // Log request details for debugging
      console.log("Standalone payment request received:", {
        amount: req.body.amount,
        hasDescription: !!req.body.description,
        hasMetadata: !!req.body.metadata && Object.keys(req.body.metadata).length > 0,
        ip: req.ip
      });
      
      // Validate the amount
      const amount = req.body.amount;
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          error: "Invalid amount. Please provide a positive number."
        });
      }
      
      // Convert to cents for Stripe (safest way to handle amounts)
      const amountInCents = Math.round(amount * 100);
      
      // Prepare metadata from request
      const metadata: Record<string, string> = {
        created: new Date().toISOString(),
        ip: req.ip || 'unknown',
        source: 'standalone_checkout'
      };
      
      // Add optional metadata from request
      if (req.body.metadata) {
        Object.entries(req.body.metadata).forEach(([key, value]) => {
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            metadata[key] = String(value);
          }
        });
      }
      
      // Create a payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        description: req.body.description || 'Venue booking',
        metadata,
        automatic_payment_methods: {
          enabled: true
        }
      });
      
      // Log successful creation
      console.log(`Standalone payment intent created: ${paymentIntent.id} for $${amount} (${amountInCents} cents)`);
      
      // Return client secret to frontend
      return res.json({
        clientSecret: paymentIntent.client_secret,
        amount: amount,
        status: 'success'
      });
      
    } catch (error: any) {
      // Handle and log errors
      console.error("Error creating standalone payment intent:", error);
      
      let errorMessage = "Payment setup failed";
      let statusCode = 500;
      
      // Format Stripe-specific errors
      if (error instanceof Stripe.errors.StripeError) {
        if (error.type === 'StripeCardError') {
          errorMessage = error.message || "Your card was declined";
          statusCode = 400;
        } else if (error.type === 'StripeInvalidRequestError') {
          errorMessage = error.message || "Invalid payment request";
          statusCode = 400;
        } else if (error.type === 'StripeAPIError') {
          errorMessage = "Payment service temporarily unavailable";
          statusCode = 503;
        } else if (error.type === 'StripeConnectionError') {
          errorMessage = "Could not connect to payment service";
          statusCode = 503;
        } else if (error.type === 'StripeAuthenticationError') {
          errorMessage = "Payment service configuration error";
          statusCode = 500;
        }
      }
      
      return res.status(statusCode).json({
        error: errorMessage,
        status: 'error'
      });
    }
  });
  
  // Webhook endpoint for Stripe events
  app.post('/api/stripe-webhook', async (req, res) => {
    try {
      let event;
      
      // Verify webhook signature if secret is available
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (webhookSecret && req.headers['stripe-signature']) {
        event = stripe.webhooks.constructEvent(
          req.body,
          req.headers['stripe-signature'] as string,
          webhookSecret
        );
      } else {
        // For testing, just use the raw body
        event = req.body;
      }
      
      // Handle payment events
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        console.log(`Payment succeeded: ${paymentIntent.id}`);
        
        // Create a log entry
        if (paymentIntent.metadata?.userId) {
          try {
            await storage.createAdminLog({
              userId: Number(paymentIntent.metadata.userId) || 0,
              action: 'payment_succeeded',
              entityType: 'payment',
              entityId: 0,
              details: {
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount / 100,
                metadata: paymentIntent.metadata
              }
            });
          } catch (logError) {
            console.error("Failed to log payment success:", logError);
          }
        }
      } else if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object;
        console.log(`Payment failed: ${paymentIntent.id}`);
      }
      
      // Return a success response
      res.json({ received: true });
    } catch (err: any) {
      console.error(`Webhook error: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });
  
  console.log("✓ Standalone payment routes registered successfully");
}