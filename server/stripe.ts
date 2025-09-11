// Simple Stripe integration - just swap keys between test/live mode
import Stripe from "stripe";

let stripe: Stripe | null = null;
let stripeInitialized = false;

// Initialize Stripe with the appropriate key
export function initializeStripe(): boolean {
  if (stripeInitialized) {
    return true;
  }

  try {
    // Use test key if available, otherwise use live key
    const testKey = process.env.TRE_STRIPE_TEST_SECRET_KEY;
    const liveKey = process.env.STRIPE_SECRET_KEY_NEW || process.env.STRIPE_SECRET_KEY;
    
    // Prefer test key for testing, fallback to live
    const secretKey = testKey || liveKey;
    
    if (!secretKey) {
      console.error("Missing Stripe secret key");
      return false;
    }

    stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
      timeout: 20000,
      maxNetworkRetries: 3,
    });

    const mode = secretKey.startsWith('sk_test_') ? 'TEST' : 'LIVE';
    console.log(`✓ Stripe initialized in ${mode} mode`);
    
    stripeInitialized = true;
    return true;
  } catch (error) {
    console.error("Error initializing Stripe:", error);
    stripe = null;
    stripeInitialized = false;
    return false;
  }
}

// Get the Stripe instance
export function getStripe(): Stripe | null {
  if (!stripeInitialized) {
    initializeStripe();
  }
  return stripe;
}

// Check if running in test mode
export function isTestMode(): boolean {
  const key = process.env.TRE_STRIPE_TEST_SECRET_KEY;
  return !!(key && stripe);
}

// Get the publishable key for frontend
export function getPublishableKey(): string | null {
  const testKey = process.env.TRE_STRIPE_TEST_PUBLISHABLE_KEY;
  const liveKey = process.env.STRIPE_PUBLISHABLE_KEY_NEW || process.env.STRIPE_PUBLISHABLE_KEY;
  
  // Use test if available, otherwise live
  return testKey || liveKey || null;
}

// Backward compatibility helpers
export function getStripeForPayment(): Stripe | null {
  return getStripe();
}

export async function getStripeForPaymentVerified(): Promise<Stripe | null> {
  return getStripe();
}

export function isLiveMode(): boolean {
  return !isTestMode();
}

// Get Stripe API version for consistency
export function getStripeApiVersion(): string {
  return "2025-02-24.acacia";
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

// Simple helper to create a payment intent
export async function createPaymentIntent(options: {
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.PaymentIntent> {
  const { amount, currency = "usd", metadata = {} } = options;
  const stripeClient = getStripe();
  
  if (!stripeClient) {
    throw new Error(`Stripe is not initialized`);
  }
  
  return stripeClient.paymentIntents.create({
    amount,
    currency,
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  });
}

// Initialize on module load
initializeStripe();