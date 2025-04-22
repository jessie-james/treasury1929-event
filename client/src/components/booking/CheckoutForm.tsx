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
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render
// This is your test publishable API key.
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY as string);

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

        await apiRequest("POST", "/api/bookings", booking);
        
        toast({
          title: "Booking Confirmed!",
          description: "Your payment was successful. Enjoy the event!",
        });
        
        onSuccess();
      } catch (err) {
        toast({
          title: "Booking Failed",
          description: "Payment successful but booking failed to save. Please contact support.",
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
  const { toast } = useToast();
  const { user } = useAuth();

  // Create Payment Intent as soon as the component loads
  useEffect(() => {
    // Get client secret from our API
    const getClientSecret = async () => {
      try {
        if (!user) return;

        const response = await apiRequest("POST", "/api/create-payment-intent", {
          seatCount: selectedSeats.length
        });
        
        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (error) {
        toast({
          title: "Payment Setup Failed",
          description: "Could not initialize payment system. Please try again.",
          variant: "destructive",
        });
      }
    };

    getClientSecret();
  }, [selectedSeats.length, toast, user]);

  if (!clientSecret) {
    return (
      <Card className="p-6">
        <CardHeader className="pb-2">
          <CardTitle>Preparing Payment</CardTitle>
          <CardDescription>Please wait while we connect to our payment provider...</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 flex justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle>Complete Your Booking</CardTitle>
        <CardDescription>
          Booking {selectedSeats.length} seat{selectedSeats.length > 1 ? 's' : ''} for ${(19.99 * selectedSeats.length).toFixed(2)}
        </CardDescription>
      </CardHeader>
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
  );
}