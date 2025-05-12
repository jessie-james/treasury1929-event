import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Load Stripe outside of component rendering to avoid recreating it
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Inner Payment Form component that handles the actual payment submission
function PaymentForm({ onSuccess, onError }: { onSuccess: () => void; onError: (message: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return; // Stripe.js has not loaded yet
    }

    setIsProcessing(true);

    try {
      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/payment-success',
        },
        redirect: 'if_required',
      });

      if (error) {
        // Show error to user
        toast({
          title: 'Payment Failed',
          description: error.message || 'An unknown error occurred',
          variant: 'destructive',
        });
        onError(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded
        toast({
          title: 'Payment Successful',
          description: 'Thank you for your purchase!',
        });
        onSuccess();
      } else if (paymentIntent) {
        // Handle other payment status
        toast({
          title: 'Payment Status',
          description: `Payment status: ${paymentIntent.status}`,
        });
      }
    } catch (err: any) {
      toast({
        title: 'Payment Error',
        description: err.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
      onError(err.message || 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement className="mb-6" options={{
        layout: { type: 'tabs', defaultCollapsed: false }
      }} />
      
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
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
    </form>
  );
}

// Main standalone payment page component
export default function StandalonePaymentPage() {
  const [params] = useRoute('/standalone-payment/:reference');
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<{
    amount: number;
    clientSecret: string;
    reference: string;
  } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const { toast } = useToast();

  // Get reference from URL
  const reference = params ? params.reference : '';

  // Initialize payment on component mount
  useEffect(() => {
    if (!reference) {
      setError('Invalid payment reference');
      setIsLoading(false);
      return;
    }

    async function initializePayment() {
      try {
        setIsLoading(true);
        
        // Create a direct payment intent with the reference
        const response = await fetch('/api/payment/direct', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reference }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to initialize payment');
        }

        const data = await response.json();
        
        if (!data.success || !data.clientSecret) {
          throw new Error('Invalid payment response');
        }

        setPaymentData({
          amount: data.amount || 0,
          clientSecret: data.clientSecret,
          reference,
        });
      } catch (err: any) {
        console.error('Payment initialization error:', err);
        setError(err.message || 'Failed to initialize payment');
        toast({
          title: 'Payment Error',
          description: err.message || 'Failed to initialize payment',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    initializePayment();
  }, [reference, toast]);

  // Handle successful payment
  const handlePaymentSuccess = () => {
    setPaymentStatus('success');
    // Redirect after a short delay
    setTimeout(() => {
      navigate('/payment-success');
    }, 2000);
  };

  // Handle payment error
  const handlePaymentError = (message: string) => {
    setPaymentStatus('error');
    setError(message);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container max-w-md mx-auto my-12">
        <Card>
          <CardHeader>
            <CardTitle>Initializing Payment</CardTitle>
            <CardDescription>Please wait while we set up your payment...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error && paymentStatus !== 'success') {
    return (
      <div className="container max-w-md mx-auto my-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <XCircle className="mr-2 h-5 w-5" />
              Payment Error
            </CardTitle>
            <CardDescription>We encountered a problem with your payment</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <p className="mt-4 text-sm text-gray-600">
              Please try again or contact support for assistance.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Success state
  if (paymentStatus === 'success') {
    return (
      <div className="container max-w-md mx-auto my-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-green-600">
              <CheckCircle className="mr-2 h-5 w-5" />
              Payment Successful
            </CardTitle>
            <CardDescription>Thank you for your purchase!</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center my-6">
              Your payment has been processed successfully.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate('/')} className="w-full">
              Return to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Payment form state
  if (paymentData && paymentData.clientSecret) {
    return (
      <div className="container max-w-md mx-auto my-12">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Payment</CardTitle>
            <CardDescription>
              {paymentData.amount > 0 
                ? `Total amount: $${paymentData.amount.toFixed(2)}`
                : 'Please complete your payment details below'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise} options={{ clientSecret: paymentData.clientSecret }}>
              <PaymentForm
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </Elements>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            <p>Your payment is processed securely by Stripe.</p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Fallback error state
  return (
    <div className="container max-w-md mx-auto my-12">
      <Card>
        <CardHeader>
          <CardTitle>Payment Unavailable</CardTitle>
          <CardDescription>Unable to initialize payment</CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            We're unable to process your payment at this time. Please try again later
            or contact support for assistance.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => navigate('/')} className="w-full">
            Return to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}