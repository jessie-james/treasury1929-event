import { useState, useEffect } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Make sure to load Stripe outside of component rendering
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Inner payment form that uses Stripe Elements
function PaymentForm({ 
  onSuccess, 
  onCancel 
}: { 
  onSuccess: () => void; 
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/booking-confirmation',
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'An unexpected error occurred');
        toast({
          title: "Payment Failed",
          description: error.message || 'An unexpected error occurred',
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast({
          title: "Payment Successful!",
          description: "Your booking has been confirmed.",
        });
        onSuccess();
      } else {
        // Payment requires additional steps
        toast({
          title: "Payment Processing",
          description: "Please complete any additional steps if required.",
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred');
      toast({
        title: "Payment Error",
        description: err.message || 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement options={{
        layout: {
          type: 'tabs',
          defaultCollapsed: false,
        },
      }} />
      
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-md text-red-800 text-sm">
          {errorMessage}
        </div>
      )}
      
      <div className="flex gap-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || isProcessing} 
          className="flex-1"
        >
          {isProcessing ? (
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

// Main OTP payment component with token-based flow
export function OtpPaymentForm({
  amount,
  metadata = {},
  onSuccess,
  onCancel,
}: {
  amount: number;
  metadata?: Record<string, any>;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize payment on component mount
  useEffect(() => {
    async function setupPayment() {
      setIsLoading(true);
      setError(null);
      
      try {
        // Step 1: Get a one-time payment token
        const tokenResponse = await fetch('/api/payment/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            metadata: {
              ...metadata,
              timestamp: new Date().toISOString(),
            },
          }),
        });
        
        if (!tokenResponse.ok) {
          const tokenError = await tokenResponse.json();
          throw new Error(tokenError.error || 'Failed to create payment token');
        }
        
        const tokenData = await tokenResponse.json();
        
        if (!tokenData.success || !tokenData.token) {
          throw new Error('Invalid token response');
        }
        
        // Step 2: Use the token to create a payment intent
        const paymentResponse = await fetch('/api/payment/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: tokenData.token,
          }),
        });
        
        if (!paymentResponse.ok) {
          const paymentError = await paymentResponse.json();
          throw new Error(paymentError.error || 'Failed to process payment');
        }
        
        const paymentData = await paymentResponse.json();
        
        if (!paymentData.success || !paymentData.clientSecret) {
          throw new Error('Invalid payment response');
        }
        
        // Set the client secret for Stripe Elements
        setClientSecret(paymentData.clientSecret);
        
      } catch (err: any) {
        console.error('Payment setup error:', err);
        setError(err.message || 'Failed to set up payment');
        toast({
          title: "Payment Setup Error",
          description: err.message || 'Failed to set up payment',
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    setupPayment();
  }, [amount, metadata, toast]);

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Setting Up Payment</CardTitle>
          <CardDescription>Please wait while we connect to our payment processor...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Payment Error</CardTitle>
          <CardDescription>We encountered a problem setting up your payment</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-sm text-gray-600">Please try again later or contact support.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={onCancel} className="w-full">Go Back</Button>
        </CardFooter>
      </Card>
    );
  }

  // No client secret
  if (!clientSecret) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Payment Unavailable</CardTitle>
          <CardDescription>We're unable to process payments at this time</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Please try again later or contact our support team for assistance.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={onCancel} className="w-full">Go Back</Button>
        </CardFooter>
      </Card>
    );
  }

  // Ready to collect payment
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Complete Your Payment</CardTitle>
        <CardDescription>
          Total: ${amount.toFixed(2)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        <p>Test card: 4242 4242 4242 4242, any future date, any CVC</p>
      </CardFooter>
    </Card>
  );
}