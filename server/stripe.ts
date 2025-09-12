// Simple Stripe integration - just swap keys between test/live mode
import Stripe from "stripe";

let stripe: Stripe | null = null;
let stripeInitialized = false;

// Track which key is actually being used
let usedSecretKey: string | null = null;

// Initialize Stripe with the appropriate key
export function initializeStripe(): boolean {
  if (stripeInitialized) {
    return true;
  }

  try {
    const testKey = process.env.TRE_STRIPE_TEST_SECRET_KEY || null;
    const liveKey = process.env.STRIPE_SECRET_KEY_NEW || process.env.STRIPE_SECRET_KEY || null;
    // Detect actual production vs development environment 
    // In Replit, NODE_ENV can be 'production' even in development
    const isActualProduction = process.env.REPL_DEPLOYMENT === 'production' || 
                               (process.env.NODE_ENV === 'production' && process.env.REPL_DEPLOYMENT);
    
    let secretKey: string | null = null;
    
    if (isActualProduction) {
      // In production, prefer live key, fallback to test
      secretKey = liveKey || testKey;
    } else {
      // In development, ONLY use test keys for safety
      if (liveKey && !testKey) {
        console.error('🚨 SAFETY ERROR: Live Stripe keys detected in development but no test key available!');
        console.error('🚨 Please set TRE_STRIPE_TEST_SECRET_KEY to safely test payments.');
        return false;
      }
      
      if (liveKey && testKey) {
        console.warn('⚠️  WARNING: Both live and test Stripe keys detected in development.');
        console.warn('⚠️  Using TEST key for safety. Remove live keys from development environment.');
      }
      
      secretKey = testKey; // Force test key in development
    }
    
    if (!secretKey) {
      console.error("Missing Stripe secret key");
      return false;
    }

    // Store the key being used for accurate mode detection
    usedSecretKey = secretKey;

    stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
      timeout: 20000,
      maxNetworkRetries: 3,
    });

    const mode = secretKey.startsWith('sk_test_') ? 'TEST' : 'LIVE';
    console.log(`✓ Stripe initialized in ${mode} mode`);
    
    // Extra safety check in development
    if (!isActualProduction && mode === 'LIVE') {
      console.error('🚨 CRITICAL SAFETY ERROR: Live Stripe mode detected in development!');
      stripe = null;
      stripeInitialized = false;
      usedSecretKey = null;
      return false;
    }
    
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
  return !!(usedSecretKey && usedSecretKey.startsWith('sk_test_'));
}

// Get the publishable key for frontend
export function getPublishableKey(): string | null {
  const testKey = process.env.TRE_STRIPE_TEST_PUBLISHABLE_KEY;
  const liveKey = process.env.STRIPE_PUBLISHABLE_KEY_NEW || process.env.STRIPE_PUBLISHABLE_KEY;
  const isActualProduction = process.env.REPL_DEPLOYMENT === 'production' || 
                             (process.env.NODE_ENV === 'production' && process.env.REPL_DEPLOYMENT);
  
  if (isActualProduction) {
    // In production, prefer live key, fallback to test
    return liveKey || testKey || null;
  } else {
    // In development, ONLY use test keys for safety
    return testKey || null;
  }
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