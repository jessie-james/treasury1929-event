import { useState, useEffect } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
  Elements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}

// Load the Stripe publishable key 
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Direct payment form using Stripe Elements
function PaymentForm({ 
  clientSecret, 
  onSuccess,
  onCancel
}: { 
  clientSecret: string; 
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet. Make sure to disable
      // form submission until Stripe.js has loaded.
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Confirm the payment
      const { error } = await stripe.confirmPayment({
        // Elements instance that was used to create the Payment Element
        elements,
        confirmParams: {
          return_url: window.location.origin + "/booking-confirmed",
        },
        redirect: 'if_required',
      });

      if (error) {
        // Show error to your customer
        setErrorMessage(error.message || 'An unknown error occurred');
        toast({
          title: "Payment Failed",
          description: error.message || 'An unknown error occurred',
          variant: "destructive"
        });
      } else {
        // Payment succeeded
        toast({
          title: "Payment Successful",
          description: "Your booking is confirmed!",
        });
        onSuccess();
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'An unexpected error occurred');
      toast({
        title: "Payment Error",
        description: e.message || 'An unexpected error occurred',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-6">
      <PaymentElement options={{
        layout: {
          type: 'tabs',
          defaultCollapsed: false,
        },
      }} />
      
      {errorMessage && (
        <div className="text-red-500 text-sm mt-2">
          {errorMessage}
        </div>
      )}
      
      <div className="flex gap-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || isLoading} 
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Pay Now'
          )}
        </Button>
      </div>
    </form>
  );
}

// Wrapper component that handles loading the payment intent and Stripe Elements
export function DirectPaymentForm({
  userId,
  userEmail,
  seatCount,
  onSuccess,
  onCancel,
}: {
  userId?: number;
  userEmail?: string;
  seatCount: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Create a payment intent when the component mounts
    async function createPaymentIntent() {
      setIsLoading(true);
      setError(null);
      
      try {
        // Build request with maximum available authentication info
        const payload = {
          seatCount,
          // User identity info for direct auth
          ...(userId ? { userId } : {}),
          ...(userEmail ? { userEmail } : {})
        };
        
        console.log('Creating payment intent with payload:', payload);
        
        // Make the request directly, not using apiRequest helper
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          credentials: 'include' // Include cookies for session auth if available
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.message || 'Failed to create payment intent');
        }
        
        const data = await response.json();
        
        if (!data.clientSecret) {
          throw new Error('No client secret returned from server');
        }
        
        setClientSecret(data.clientSecret);
      } catch (e: any) {
        setError(e.message || 'Failed to set up payment. Please try again.');
        toast({
          title: "Payment Setup Failed",
          description: e.message || 'Failed to set up payment. Please try again.',
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    createPaymentIntent();
  }, [seatCount, userId, userEmail, toast]);

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Setting Up Payment</CardTitle>
          <CardDescription>Please wait while we connect to our payment provider...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Payment Error</CardTitle>
          <CardDescription>We encountered a problem setting up your payment</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error}</p>
        </CardContent>
        <CardFooter>
          <Button onClick={onCancel} className="w-full">Go Back</Button>
        </CardFooter>
      </Card>
    );
  }

  if (!clientSecret) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Payment Not Available</CardTitle>
          <CardDescription>We're unable to process payments at this time</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Please try again later or contact support for assistance.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={onCancel} className="w-full">Go Back</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Payment</CardTitle>
        <CardDescription>Complete your payment to confirm your booking</CardDescription>
      </CardHeader>
      <CardContent>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm 
            clientSecret={clientSecret} 
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>
      </CardContent>
    </Card>
  );
}