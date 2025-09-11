// Simple Stripe integration - just swap keys between test/live mode
import Stripe from "stripe";

// Keep track of Stripe initialization status
let stripeLive: Stripe | null = null;
let stripeTest: Stripe | null = null;
let stripeInitialized = false;

// Initialize Stripe client with simple key selection
export function initializeStripe(): boolean {
  if (stripeInitialized) {
    return true; // Already initialized
  }
  
  try {
    console.log("Initializing Stripe instances...");
    
    // Collect all possible key sources
    const possibleKeys = [
      process.env.STRIPE_SECRET_KEY_NEW,
      process.env.STRIPE_SECRET_KEY,
      process.env.TRE_STRIPE_TEST_SECRET_KEY,
    ].filter(Boolean) as string[];
    
    if (possibleKeys.length === 0) {
      console.error("Missing Stripe keys - need at least one of STRIPE_SECRET_KEY_NEW, STRIPE_SECRET_KEY, or TRE_STRIPE_TEST_SECRET_KEY");
      return false;
    }
    
    // Initialize instances based on key prefix, not environment variable name
    for (const key of possibleKeys) {
      if (key.startsWith('sk_live_') && !stripeLive) {
        stripeLive = new Stripe(key, {
          apiVersion: '2023-10-16',
          timeout: 20000,
          maxNetworkRetries: 3,
        });
        console.log("✓ Stripe LIVE instance initialized");
      } else if (key.startsWith('sk_test_') && !stripeTest) {
        stripeTest = new Stripe(key, {
          apiVersion: '2023-10-16',
          timeout: 20000,
          maxNetworkRetries: 3,
        });
        console.log("✓ Stripe TEST instance initialized");
      }
    }
    
    stripeInitialized = true;
    console.log(`✓ Stripe initialization complete (Live: ${!!stripeLive}, Test: ${!!stripeTest})`);
    return stripeLive !== null || stripeTest !== null;
  } catch (error) {
    console.error("Error initializing Stripe:", error);
    stripeLive = null;
    stripeTest = null;
    stripeInitialized = false;
    return false;
  }
}

// Get the Stripe instance (initializing if needed)
export function getStripe(mode?: 'live' | 'test'): Stripe | null {
  if (!stripeInitialized) {
    initializeStripe();
  }
  
  // Return appropriate instance based on mode
  if (mode === 'test') {
    return stripeTest;
  } else if (mode === 'live') {
    return stripeLive;
  }
  
  // Default: return live if available, otherwise test
  return stripeLive || stripeTest;
}

// Synchronous helper for backward compatibility - safe fallback when uncertain
export function getStripeForPayment(paymentIdOrBooking: string | { stripePaymentId?: string | null }): Stripe | null {
  // For safety in dual-instance deployments, return the default instance
  // Use getStripeForPaymentVerified() for routing that requires correctness
  return getStripe();
}

// Async helper with PaymentIntent verification for correct routing (use for refunds/queries)
export async function getStripeForPaymentVerified(paymentIdOrBooking: string | { stripePaymentId?: string | null }): Promise<Stripe | null> {
  // Determine payment ID
  const paymentId = typeof paymentIdOrBooking === 'string' 
    ? paymentIdOrBooking 
    : paymentIdOrBooking.stripePaymentId;
    
  if (!paymentId) {
    // No payment ID available, return default instance
    return getStripe();
  }
  
  // First, try pattern-based detection for quick routing
  const looksLikeTest = paymentId.includes('test') || 
                       paymentId.startsWith('pi_test_') || 
                       paymentId.includes('_test');
  
  // If we have both instances, try to verify by actually retrieving the payment intent
  if (stripeLive && stripeTest) {
    try {
      const primaryClient = looksLikeTest ? stripeTest : stripeLive;
      const fallbackClient = looksLikeTest ? stripeLive : stripeTest;
      
      // Try primary client first
      try {
        await primaryClient.paymentIntents.retrieve(paymentId, { expand: [] });
        return primaryClient;
      } catch (primaryError: any) {
        // If auth error or not found, try fallback
        if (primaryError.statusCode === 401 || primaryError.statusCode === 404) {
          await fallbackClient.paymentIntents.retrieve(paymentId, { expand: [] });
          return fallbackClient;
        }
        throw primaryError;
      }
    } catch (error) {
      console.warn(`Could not verify payment intent ${paymentId}, falling back to pattern detection:`, error);
      // Fall through to pattern-based selection
    }
  }
  
  // Fallback to pattern-based selection
  return getStripe(looksLikeTest ? 'test' : 'live');
}

// Check if running in live mode (based on available instances)
export function isLiveMode(): boolean {
  return !!stripeLive;
}

// Check if test mode is available
export function isTestMode(): boolean {
  return !!stripeTest;
}

// Get the publishable key for frontend (mode-aware)
export function getPublishableKey(mode?: 'live' | 'test'): string | null {
  if (mode === 'test') {
    return process.env.TRE_STRIPE_TEST_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || null;
  } else if (mode === 'live') {
    return process.env.STRIPE_PUBLISHABLE_KEY_NEW || null;
  }
  
  // Default: prefer live key if live instance available, otherwise test
  if (stripeLive) {
    return process.env.STRIPE_PUBLISHABLE_KEY_NEW || null;
  } else if (stripeTest) {
    return process.env.TRE_STRIPE_TEST_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || null;
  }
  return null;
}

// Simple helper to create a payment intent
export async function createPaymentIntent(options: {
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
  mode?: 'live' | 'test';
}): Promise<Stripe.PaymentIntent> {
  const { amount, currency = "usd", metadata = {}, mode } = options;
  const stripeClient = getStripe(mode);
  
  if (!stripeClient) {
    const modeStr = mode ? ` (${mode} mode)` : "";
    throw new Error(`Stripe is not initialized${modeStr}`);
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

// Get Stripe API version for consistency
export function getStripeApiVersion(): string {
  return "2023-10-16";
}

// Initialize Stripe on module load
initializeStripe();