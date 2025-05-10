import { useState, useEffect } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Make sure to call loadStripe outside of a component's render
// to avoid recreating the Stripe object on every render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// The actual payment form component that uses Stripe Elements
const StandalonePaymentForm = ({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const { toast } = useToast();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/booking-confirmed',
        },
        redirect: 'if_required',
      });

      if (error) {
        // Show error to customer
        setPaymentError(error.message || 'An unexpected error occurred');
        toast({
          title: "Payment Failed",
          description: error.message || 'An unexpected error occurred',
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment successful
        toast({
          title: "Payment Successful!",
          description: "Your booking has been confirmed.",
        });
        onSuccess();
      } else {
        // Payment requirems additional action or is in another state
        if (paymentIntent) {
          console.log(`Payment state: ${paymentIntent.status}`);
          toast({
            title: "Payment In Progress",
            description: "Please complete any additional steps if required.",
          });
        } else {
          toast({
            title: "Payment Status Unknown",
            description: "Please check your email for confirmation.",
          });
        }
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setPaymentError(err.message || 'An unexpected error occurred');
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
      
      {paymentError && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md text-sm">
          {paymentError}
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
};

// The main standalone checkout component that manages the payment intent setup
export function StandaloneCheckout({ 
  amount, 
  onSuccess, 
  onCancel,
  metadata = {},
}: { 
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
  metadata?: Record<string, any>;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Create a payment intent when the component mounts
  useEffect(() => {
    const createIntent = async () => {
      try {
        setLoading(true);
        
        // Create a simple payment intent on the server
        const response = await fetch('/api/standalone-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            description: 'Event booking',
            ...metadata,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create payment');
        }

        const data = await response.json();
        
        if (!data.clientSecret) {
          throw new Error('No client secret returned');
        }

        setClientSecret(data.clientSecret);
        
      } catch (err: any) {
        console.error('Failed to create payment intent:', err);
        setError(err.message || 'Failed to set up payment');
        toast({
          title: "Payment Setup Failed",
          description: err.message || 'Failed to set up payment',
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    createIntent();
  }, [amount, metadata, toast]);

  if (loading) {
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

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Payment Error</CardTitle>
          <CardDescription>We encountered a problem setting up your payment</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <p className="mt-4 text-sm text-gray-600">Please try again later or choose a different payment method.</p>
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
          <CardTitle>Payment Unavailable</CardTitle>
          <CardDescription>We're unable to process payments at this time.</CardDescription>
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

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Complete Your Payment</CardTitle>
        <CardDescription>
          Total amount: ${(amount).toFixed(2)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <StandalonePaymentForm onSuccess={onSuccess} onCancel={onCancel} />
        </Elements>
      </CardContent>
    </Card>
  );
}