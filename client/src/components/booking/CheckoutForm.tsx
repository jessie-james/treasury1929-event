import { useEffect, useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
  Elements
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";

// Add debug logging to check the environment variable
console.log("VITE_STRIPE_PUBLISHABLE_KEY exists:", !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
console.log("VITE_STRIPE_PUBLISHABLE_KEY type:", typeof import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
  throw new Error("Missing Stripe publishable key");
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface Props {
  eventId: number;
  selectedSeats: number[];
  foodSelections: Record<string, number>;
  onSuccess: () => void;
}

function StripeCheckoutForm({ 
  eventId, 
  selectedSeats, 
  foodSelections,
  onSuccess 
}: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createBooking = useMutation({
    mutationFn: async (stripePaymentId: string) => {
      const booking = {
        eventId,
        seatNumbers: selectedSeats,
        foodSelections,
        customerEmail: "user@example.com", 
        stripePaymentId,
      };

      await apiRequest("POST", "/api/bookings", booking);
    },
    onSuccess: () => {
      toast({
        title: "Booking Confirmed!",
        description: "Check your email for the confirmation.",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process booking",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin,
        },
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        await createBooking.mutateAsync("stripe_payment_confirmed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || !stripe || !elements}
      >
        {isLoading ? "Processing..." : "Pay Now"}
      </Button>
    </form>
  );
}

export function CheckoutForm(props: Props) {
  const [clientSecret, setClientSecret] = useState<string>();

  useEffect(() => {
    const amount = props.selectedSeats.length * 100; 

    apiRequest("POST", "/api/create-payment-intent", { amount })
      .then((res) => res.json())
      .then((data) => setClientSecret(data.clientSecret));
  }, [props.selectedSeats.length]);

  if (!clientSecret) {
    return <div>Loading...</div>;
  }

  return (
    <Elements stripe={stripePromise} options={{
      clientSecret,
      appearance: {
        theme: 'stripe' as const,
      },
    }}>
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Payment Details</h2>
          <p className="text-muted-foreground">
            Your booking will be confirmed after successful payment
          </p>
        </div>
        <StripeCheckoutForm {...props} />
      </div>
    </Elements>
  );
}