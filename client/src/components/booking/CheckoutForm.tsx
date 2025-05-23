import { useEffect, useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { Link, useLocation } from "wouter";
import { StandaloneCheckout } from "./StandaloneCheckout";
import { OtpPaymentForm } from "./OtpPaymentForm";

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render
// This is your test publishable API key.
// Get the Stripe publishable key
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripeKey) {
  console.error("Stripe publishable key is not defined. Expected VITE_STRIPE_PUBLISHABLE_KEY in environment.");
}

// Create a stable Stripe promise
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

if (stripeKey) {
  console.log("Stripe initialized with key prefix:", stripeKey.substring(0, 7));
}

interface Props {
  eventId: number;
  tableId: number;
  selectedSeats: number[];
  foodSelections: Record<string, number>[];
  guestNames: Record<number, string>;
  onSuccess: () => void;
}

function StripeCheckoutForm({
  eventId,
  tableId,
  selectedSeats,
  foodSelections,
  guestNames,
  onSuccess,
  clientSecret
}: Props & { clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      return;
    }

    setIsProcessing(true);

    // Confirm payment with Stripe
    const { paymentIntent, error } = await stripe.confirmPayment({
      //`Elements` instance that was used to create the Payment Element
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/success`,
      },
      redirect: 'if_required'
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Payment succeeded, now create booking in our system
      try {
        if (!user) throw new Error("User not authenticated");

        const booking = {
          eventId,
          tableId,
          partySize: selectedSeats.length,
          seatNumbers: selectedSeats,
          foodSelections,
          guestNames,
          customerEmail: user.email,
          stripePaymentId: paymentIntent.id,
          userId: user.id,
        };

        console.log("Creating booking with:", booking);

        // Using try/catch with more detailed error handling
        try {
          // Helper to get the absolute base URL in the current environment
          const getBaseUrl = () => {
            // Check if we're in a deployed environment by looking at the hostname
            const hostname = window.location.hostname;
            const isDeployed = hostname.includes('.replit.app') || hostname.includes('.repl.co');

            if (isDeployed) {
              // Use the current location's origin for deployed environments
              return window.location.origin;
            } else {
              // Use relative paths for development/preview
              return '';
            }
          };

          // Use dedicated API server to bypass Vite
          const API_BASE = process.env.NODE_ENV === 'development' 
            ? 'http://localhost:3001' 
            : getBaseUrl();
          
          const bookingUrl = `${API_BASE}/create-booking`;
          console.log(`Using booking URL: ${bookingUrl}`);

          const response = await apiRequest("POST", bookingUrl, booking);

          if (!response.ok) {
            // Read the error response from the server
            const errorData = await response.json();
            throw new Error(errorData.message || "Server error during booking creation");
          }

          const bookingData = await response.json();
          console.log("Booking created successfully:", bookingData);

          // Invalidate user bookings query to refresh the My Tickets page
          try {
            // Force a refetch instead of just invalidating
            await queryClient.refetchQueries({ queryKey: ["/api/user/bookings"] });

            toast({
              title: "Booking Confirmed!",
              description: "Your payment was successful. Enjoy the event!",
            });

            // Navigate to dashboard after successful refetch
            onSuccess();
          } catch (refetchError) {
            console.error("Error refetching bookings:", refetchError);

            // Fallback to basic invalidation if refetch fails
            queryClient.invalidateQueries({ queryKey: ["/api/user/bookings"] });

            toast({
              title: "Booking Confirmed!",
              description: "Your payment was successful. Enjoy the event!",
            });

            onSuccess();
          }
        } catch (apiError: any) {
          console.error("API Error during booking creation:", apiError);
          toast({
            title: "Booking Failed",
            description: `Payment successful but booking failed: ${apiError.message}`,
            variant: "destructive",
          });
        }
      } catch (err: any) {
        console.error("Error in booking process:", err);
        toast({
          title: "Booking Failed",
          description: `Payment successful but booking failed: ${err.message}`,
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Payment Processing",
        description: "Your payment is being processed. We'll notify you when it's complete.",
      });
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full"
        disabled={!stripe || !elements || isProcessing}
      >
        {isProcessing ? (
          <span className="flex items-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </span>
        ) : (
          `Pay $${(19.99 * selectedSeats.length).toFixed(2)}`
        )}
      </Button>
    </form>
  );
}

export function CheckoutForm({
  eventId,
  tableId,
  selectedSeats,
  foodSelections,
  guestNames,
  onSuccess
}: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [_, setLocation] = useLocation();

  // Function to retrieve the client secret for Stripe payment
  const getClientSecret = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // More verbose client-side authentication check
      if (!user) {
        console.error("Payment attempt failed: No user found in auth context");
        setError("You must be logged in to make a payment");

        // Check if we can detect a possible cause
        const userAuthState = localStorage.getItem("user_auth_state");
        if (!userAuthState || userAuthState === "logged_out") {
          console.log("Auth state indicates user is not logged in or session expired");

          // Suggest redirection to login
          toast({
            title: "Session expired",
            description: "Your login session may have expired. Please log in again to continue.",
            variant: "destructive",
            action: (
              <Button variant="outline" size="sm" onClick={() => setLocation("/auth")}>
                Log In
              </Button>
            ),
          });
        }
        return;
      }

      // Store auth state flag for future reference
      localStorage.setItem("user_auth_state", "logged_in");

      console.log(`Requesting payment intent for ${selectedSeats.length} seats (attempt ${retryCount + 1})`);

      // First check if Stripe is loaded by verifying the public key
      const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      if (!stripeKey) {
        setError("Stripe publishable key is missing. Payment processing is unavailable.");
        throw new Error("Stripe publishable key is missing. Payment processing is unavailable.");
      }

      // Helper to get the absolute base URL in the current environment
      const getBaseUrl = () => {
        // Check if we're in a deployed environment by looking at the hostname
        const hostname = window.location.hostname;
        const isDeployed = hostname.includes('.replit.app') || hostname.includes('.repl.co');

        if (isDeployed) {
          // Use the current location's origin for deployed environments
          return window.location.origin;
        } else {
          // Use relative paths for development/preview
          return '';
        }
      };

      // Step 1: Get a payment token to use in case the session is lost
      console.log("Requesting payment token...");
      let paymentToken = null;

      try {
        const baseUrl = getBaseUrl();
        const tokenUrl = `${baseUrl}/api/generate-payment-token`;
        console.log(`Using token URL: ${tokenUrl}`);

        // Include user email in the request to support additional fallback auth methods
        // If session is lost, the server can still generate a token using email
        const tokenRequest = {
          email: user?.email
        };

        // First try with credentials included (for session auth)
        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tokenRequest),
          credentials: 'include' // Important: send cookies for session auth
        });

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          paymentToken = tokenData.paymentToken;

          // Check if this is a limited access token
          const isLimitedToken = tokenData.limitedAccess === true;
          console.log(`Payment token received (${isLimitedToken ? 'limited access' : 'full access'})`);

          // Store important information in localStorage as fallbacks
          localStorage.setItem("payment_token", paymentToken);
          localStorage.setItem("user_email", user?.email || '');

          // Store auth state for future reference
          localStorage.setItem("user_auth_state", "logged_in");
          localStorage.setItem("payment_auth_time", Date.now().toString());
        } else {
          console.warn("Could not get payment token with credentials, trying simplified request");

          // Try again without credentials (in case CORS is blocking credentialed request)
          const simpleResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: user?.email,
              userId: user?.id,
              noCredentials: true // Signal to server this is a non-credentialed request
            })
          });

          if (simpleResponse.ok) {
            const simpleData = await simpleResponse.json();
            paymentToken = simpleData.paymentToken;
            console.log("Got payment token via simplified request");

            localStorage.setItem("payment_token", paymentToken);
          } else {
            console.warn("Both token requests failed, proceeding with fallback mechanisms");
          }
        }
      } catch (tokenError) {
        console.warn("Error getting payment token:", tokenError);
        // Continue with session auth only
      }

      // Step 2: Request payment intent with the token as backup auth
      const baseUrl = getBaseUrl();
      const paymentIntentUrl = `${baseUrl}/api/create-payment-intent`;
      console.log(`Using payment intent URL: ${paymentIntentUrl}`);

      // Try direct fetch with credentials first
      let response;
      try {
        console.log("Trying payment intent with credentials and token");
        // Make a direct fetch call with credentials
        response = await fetch(paymentIntentUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            seatCount: selectedSeats.length,
            paymentToken: paymentToken,
            userEmail: user?.email,
            userId: user?.id
          }),
          credentials: 'include' // Important: include credentials/cookies
        });
      } catch (fetchError) {
        console.error("Error with credentialed payment intent request:", fetchError);
        // If the direct fetch fails, try the apiRequest helper as fallback
        console.log("Falling back to apiRequest method for payment intent");
        response = await apiRequest("POST", paymentIntentUrl, {
          seatCount: selectedSeats.length,
          paymentToken: paymentToken,
          userEmail: user?.email,
          userId: user?.id
        });
      }

      // Handle our custom network error response
      if ('isNetworkError' in response) {
        const isTimeout = 'isTimeoutError' in response;
        const errorMsg = isTimeout 
          ? "Payment system request timed out. The server might be experiencing high load."
          : "Payment system is unreachable. Please check your connection and try again.";

        setError(errorMsg);

        // Log detailed error for debugging
        console.error(`Stripe payment error (attempt ${retryCount + 1}):`, { 
          isTimeout, 
          error: response
        });

        throw new Error(errorMsg);
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Payment intent creation failed:", errorData);
        setError(errorData.error || "Failed to initialize payment");
        throw new Error(errorData.error || "Failed to initialize payment");
      }

      const data = await response.json();

      if (!data.clientSecret) {
        console.error("Missing client secret in response:", data);
        setError("Invalid payment setup response from server");
        throw new Error("Invalid payment setup response from server");
      }

      console.log("Payment intent created successfully");
      setClientSecret(data.clientSecret);
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error("Payment setup error:", error);
      toast({
        title: "Payment Setup Failed",
        description: error instanceof Error 
          ? error.message 
          : "Could not initialize payment system. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Retry handler for payment intent creation
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);

    // Check if we need to try authentication recovery first
    const userAuthState = localStorage.getItem("user_auth_state");
    if (!userAuthState || userAuthState === "logged_out") {
      console.log("Detected logged out state during retry, will attempt to restore session");

      toast({
        title: "Session recovery",
        description: "Attempting to restore your session before retrying...",
      });

      // Force reload auth state before retry
      setTimeout(() => {
        // Reset auth state to trigger a new authentication check
        localStorage.setItem("user_auth_state", "checking");

        // After a short delay, try the payment intent creation again
        setTimeout(getClientSecret, 500);
      }, 1000);
    } else {
      // Standard retry without auth recovery
      getClientSecret();
    }
  };

  // Create Payment Intent as soon as the component loads
  useEffect(() => {
    // Only attempt to get client secret if we have a user
    if (user && user.id) {
      console.log("Getting client secret with valid user");
      getClientSecret();
    } else {
      console.log("Waiting for user authentication before getting client secret");

      // Additional authentication recovery attempt for edge cases
      const userAuthState = localStorage.getItem("user_auth_state");
      const userEmail = localStorage.getItem("user_email");

      if (userAuthState === "logged_in" && userEmail && !user) {
        console.log("User state mismatch detected. Auth claims logged in but no user object.");

        // Force auth state check in React Query
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });

        // Set a timeout to retry after a short delay to allow auth refresh
        setTimeout(() => {
          if (!user) {
            setError("Authentication issue detected. Please try logging in again.");

            toast({
              title: "Authentication Issue",
              description: "Please log out and back in to continue with your payment.",
              variant: "destructive",
              action: (
                <Button variant="outline" size="sm" onClick={() => setLocation("/auth")}>
                  Log In
                </Button>
              ),
            });
          }
        }, 2000);
      }
    }
  }, [selectedSeats.length, user]);

  if (!clientSecret) {
    return (
      <Card className="p-6">
        <CardHeader className="pb-2">
          <CardTitle>
            {error ? "Payment Setup Issue" : "Preparing Payment"}
          </CardTitle>
          <CardDescription>
            {error 
              ? "We encountered a problem connecting to our payment provider." 
              : "Please wait while we connect to our payment provider..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 flex flex-col items-center gap-4">
          {isLoading ? (
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          ) : error ? (
            <div className="space-y-4 w-full">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
                <div className="flex gap-2 items-start">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-amber-800">Payment System Error</p>
                    <p className="text-sm text-amber-700 mt-1">{error}</p>

                    {/* Add troubleshooting help based on common error cases */}
                    {error?.includes("Unauthorized") || error?.includes("logged in") ? (
                      <div className="mt-3 p-2 bg-amber-100 rounded text-xs text-amber-900">
                        <p className="font-semibold">Troubleshooting:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>Your session may have expired - try logging out and back in</li>
                          <li>Refresh the page and try again</li>
                        </ul>
                      </div>
                    ) : error?.includes("connect") || error?.includes("unavailable") ? (
                      <div className="mt-3 p-2 bg-amber-100 rounded text-xs text-amber-900">
                        <p className="font-semibold">Troubleshooting:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>Check your internet connection</li>
                          <li>Our payment service might be temporarily unavailable</li>
                          <li>Wait a few moments and try again</li>
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <Button onClick={handleRetry} className="w-full" variant="default">
                Retry Payment Setup
              </Button>

              {/* Show admin diagnostic link if this might be a system/connectivity issue */}
              {user?.role === 'admin' && retryCount >= 2 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    Admin options:
                  </p>
                  <Link href="/backoffice/stripe-diagnostics">
                    <Button variant="outline" size="sm" className="w-full text-xs flex items-center gap-1">
                      <span>Payment System Diagnostics</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          )}
        </CardContent>
      </Card>
    );
  }

  // If we have multiple failed payment attempts, use the OTP payment form
  if (retryCount >= 2) {
    return (
      <div className="space-y-4">
        {/* Notice about fallback payment method */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <p className="font-medium">Using alternative payment method</p>
          <p className="mt-1 text-amber-700">
            We've switched to an alternative payment method for better reliability.
          </p>
        </div>

        {/* OTP Payment Form */}
        <OtpPaymentForm
          amount={selectedSeats.length * 19.99}
          metadata={{
            eventId,
            tableId,
            selectedSeats: selectedSeats.join(','),
            userEmail: user?.email,
            userId: user?.id
          }}
          onSuccess={onSuccess}
          onCancel={() => setRetryCount(0)} // Reset retry count if cancelled
        />
      </div>
    );
  }

  // Default standard payment form
  return (
    <div>      
      <Card className="p-4">
        <CardContent>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <StripeCheckoutForm
              eventId={eventId}
              tableId={tableId}
              selectedSeats={selectedSeats}
              foodSelections={foodSelections}
              guestNames={guestNames}
              onSuccess={onSuccess}
              clientSecret={clientSecret}
            />
          </Elements>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          <p>Test card details: 4242 4242 4242 4242, any future date, any CVC</p>
        </CardFooter>
      </Card>
    </div>
  );
}