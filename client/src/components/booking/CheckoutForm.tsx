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

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render
// This is your test publishable API key.
// Check for both possible variable names
const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripeKey) {
  console.error("Stripe publishable key is not defined. Please check your environment variables (VITE_STRIPE_PUBLIC_KEY or VITE_STRIPE_PUBLISHABLE_KEY).");
}
const stripePromise = loadStripe(stripeKey as string);

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
          const response = await apiRequest("POST", "/api/bookings", booking);
          
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
      
      const response = await apiRequest("POST", "/api/create-payment-intent", {
        seatCount: selectedSeats.length
      });
      
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
    getClientSecret();
  };

  // Create Payment Intent as soon as the component loads
  useEffect(() => {
    getClientSecret();
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