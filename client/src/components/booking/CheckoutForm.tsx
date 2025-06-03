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
import { Loader2, AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Robust Stripe loader with comprehensive error handling
class StripeLoader {
  private static instance: StripeLoader;
  private stripePromise: Promise<any> | null = null;
  private isLoading = false;
  private lastError: Error | null = null;

  static getInstance(): StripeLoader {
    if (!StripeLoader.instance) {
      StripeLoader.instance = new StripeLoader();
    }
    return StripeLoader.instance;
  }

  async loadStripe(): Promise<any> {
    if (this.stripePromise && !this.lastError) {
      return this.stripePromise;
    }

    if (!stripeKey) {
      throw new Error("Stripe publishable key is missing from environment variables");
    }

    if (this.isLoading) {
      throw new Error("Stripe is already loading");
    }

    this.isLoading = true;
    this.lastError = null;

    try {
      console.log("Loading Stripe.js library...");
      
      this.stripePromise = loadStripe(stripeKey, {
        locale: 'en',
        apiVersion: '2023-10-16'
      });

      const stripe = await this.stripePromise;
      
      if (!stripe) {
        throw new Error("Stripe.js loaded but returned null - this may indicate network issues or an invalid key");
      }

      console.log("Stripe.js loaded successfully");
      this.isLoading = false;
      return stripe;
    } catch (error) {
      this.isLoading = false;
      this.lastError = error as Error;
      this.stripePromise = null;
      console.error("Failed to load Stripe.js:", error);
      throw error instanceof Error ? error : new Error("Unknown error loading Stripe");
    }
  }

  reset(): void {
    this.stripePromise = null;
    this.lastError = null;
    this.isLoading = false;
  }
}

interface Props {
  eventId: number;
  tableId: number;
  selectedSeats: number[];
  foodSelections: any[];
  guestNames: string[];
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

  const createBookingMutation = useMutation({
    mutationFn: async (paymentIntentId: string) => {
      const response = await apiRequest("POST", "/api/bookings", {
        eventId,
        tableId,
        selectedSeats,
        foodSelections,
        guestNames,
        paymentIntentId
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      onSuccess();
    }
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Payment System Loading",
        description: "Please wait for the payment system to load completely.",
        variant: "default"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { paymentIntent, error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/success`,
        },
        redirect: 'if_required'
      });

      if (error) {
        throw new Error(error.message || "Payment confirmation failed");
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        if (!user) {
          throw new Error("User authentication required");
        }

        await createBookingMutation.mutateAsync(paymentIntent.id);
        
        toast({
          title: "Payment Successful",
          description: "Your booking has been confirmed!",
          variant: "default"
        });
      } else {
        toast({
          title: "Payment Processing",
          description: "Your payment is being processed. You'll receive a confirmation email shortly.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred during payment.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Payment Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Event Tickets ({selectedSeats.length} seats)</span>
            <span>${(19.99 * selectedSeats.length).toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>${(19.99 * selectedSeats.length).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="border border-gray-300 rounded-lg p-4">
          <PaymentElement 
            options={{
              layout: 'tabs',
              business: {name: 'Event Booking'}
            }}
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full"
          disabled={!stripe || !elements || isProcessing}
        >
          {isProcessing ? (
            <span className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing Payment...
            </span>
          ) : (
            `Complete Payment - $${(19.99 * selectedSeats.length).toFixed(2)}`
          )}
        </Button>
      </form>

      <div className="text-center text-sm text-gray-600">
        <p>Test card: 4242 4242 4242 4242, any future date, any CVC</p>
      </div>
    </div>
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
  const [stripeInstance, setStripeInstance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();
  const [_, setLocation] = useLocation();

  const maxRetryAttempts = 3;
  const stripeLoader = StripeLoader.getInstance();

  const loadStripeAndPayment = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!user) {
        setError("Please log in to continue with payment");
        toast({
          title: "Authentication Required",
          description: "Please log in to complete your booking",
          variant: "destructive"
        });
        return;
      }

      // Load Stripe first
      console.log("Loading Stripe payment system...");
      const stripe = await stripeLoader.loadStripe();
      setStripeInstance(stripe);

      // Get payment intent
      console.log("Creating payment intent...");
      const response = await apiRequest("POST", "/api/create-payment-intent", {
        eventId,
        tableId,
        selectedSeats,
        amount: Math.round(19.99 * selectedSeats.length * 100) // Convert to cents
      });

      const responseData = await response.json() as { clientSecret: string };

      if (!responseData.clientSecret) {
        throw new Error("Failed to create payment intent");
      }

      setClientSecret(responseData.clientSecret);
      console.log("Payment system ready");
    } catch (error) {
      console.error("Failed to initialize payment:", error);
      setError(error instanceof Error ? error.message : "Failed to load payment system");
      
      if (retryAttempts < maxRetryAttempts) {
        toast({
          title: "Loading Payment System",
          description: `Retrying... (${retryAttempts + 1}/${maxRetryAttempts})`,
          variant: "default"
        });
      } else {
        toast({
          title: "Payment System Error",
          description: "Unable to load payment system. Please refresh the page or try again later.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (retryAttempts < maxRetryAttempts) {
      setRetryAttempts(prev => prev + 1);
      stripeLoader.reset(); // Reset Stripe loader state
      loadStripeAndPayment();
    } else {
      window.location.reload(); // Force page reload as last resort
    }
  };

  useEffect(() => {
    loadStripeAndPayment();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Payment Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Event Tickets ({selectedSeats.length} seats)</span>
              <span>${(19.99 * selectedSeats.length).toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>${(19.99 * selectedSeats.length).toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-green-600 mr-2">💳</div>
            <div>
              <h4 className="font-semibold text-green-800">Secure Payment Processing</h4>
              <p className="text-sm text-green-700">Test environment - Use card: 4242 4242 4242 4242</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-gray-600">Loading secure payment system...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>Payment System Error</span>
            </CardTitle>
            <CardDescription>
              There was a problem loading the payment system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              {retryAttempts < maxRetryAttempts ? (
                <Button onClick={handleRetry} className="w-full" variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry Loading Payment System
                </Button>
              ) : (
                <Button onClick={() => window.location.reload()} className="w-full" variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Page
                </Button>
              )}
              <Button onClick={() => setLocation("/events")} className="w-full" variant="ghost">
                Return to Events
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientSecret || !stripeInstance) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Elements stripe={stripeInstance} options={{ clientSecret }}>
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
  );
}