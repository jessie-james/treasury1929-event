// Dedicated Stripe integration module
import Stripe from "stripe";

// Keep track of Stripe initialization status
let stripe: Stripe | null = null;
let stripeInitialized = false;
let initAttempts = 0;

// Initialize Stripe client
export function initializeStripe(): boolean {
  if (stripe) {
    return true; // Already initialized
  }
  
  if (initAttempts >= 3) {
    console.error(`Failed to initialize Stripe after ${initAttempts} attempts`);
    return false;
  }
  
  try {
    initAttempts++;
    console.log(`Initializing Stripe (attempt ${initAttempts})...`);
    
    // Check for required environment variable - Treasury test account
    const stripeSecretKey = process.env.TRE_STRIPE_TEST_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error("Missing TRE_STRIPE_TEST_SECRET_KEY environment variable");
      return false;
    }
    
    // Log first few characters of the key for debugging (never full key)
    const keyPrefix = stripeSecretKey.substring(0, 12);
    console.log(`Using Stripe key with prefix: ${keyPrefix}... (TREASURY_TEST)`);
    
    // Create Stripe instance - without specifying API version to avoid type conflicts
    stripe = new Stripe(stripeSecretKey);
    
    stripeInitialized = true;
    console.log("✓ Stripe initialized successfully");
    return true;
  } catch (error) {
    console.error("Error initializing Stripe:", error);
    stripe = null;
    stripeInitialized = false;
    return false;
  }
}

// Get the Stripe instance (initializing if needed)
export function getStripe(): Stripe | null {
  if (!stripe && !stripeInitialized) {
    initializeStripe();
  }
  return stripe;
}

// Simple helper to create a payment intent
export async function createPaymentIntent(options: {
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.PaymentIntent> {
  const stripeClient = getStripe();
  if (!stripeClient) {
    throw new Error("Stripe is not initialized");
  }
  
  const { amount, currency = "usd", metadata = {} } = options;
  
  return stripeClient.paymentIntents.create({
    amount,
    currency,
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  });
}

// Helper to format Stripe errors
export function formatStripeError(error: any): { message: string, code: string } {
  let message = "Payment processing failed";
  let code = "PAYMENT_ERROR";
  
  if (!error) {
    return { message, code };
  }
  
  // Handle Stripe-specific error types
  if (error.type === 'StripeCardError') {
    message = error.message || "Your card was declined. Please try another payment method.";
    code = "CARD_DECLINED";
  } else if (error.type === 'StripeInvalidRequestError') {
    message = error.message || "Invalid payment request. Please check your information.";
    code = "INVALID_REQUEST";
  } else if (error.type === 'StripeAPIError') {
    message = "Payment service is experiencing technical difficulties. Please try again later.";
    code = "API_ERROR";
  } else if (error.type === 'StripeConnectionError') {
    message = "Could not connect to payment service. Please check your internet connection and try again.";
    code = "CONNECTION_ERROR";
  } else if (error.type === 'StripeAuthenticationError') {
    message = "Payment system configuration error. Please contact support.";
    code = "AUTH_ERROR";
  } else {
    // Generic error
    message = error.message || message;
  }
  
  return { message, code };
}

// Initialize Stripe on module load
initializeStripe();