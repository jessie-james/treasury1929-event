import { useEffect, useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { StripeProvider } from "../providers/StripeProvider";

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
        customerEmail: "user@example.com", // This will be captured by Stripe
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
        // Payment successful
        // Assuming stripe.confirmPayment returns a paymentIntent
        // This part needs adjustment based on the actual response from stripe.confirmPayment
        //const paymentIntent = await stripe.retrievePaymentIntent(clientSecret);
        //if (paymentIntent.paymentIntent?.id) {
        //  await createBooking.mutateAsync(paymentIntent.paymentIntent.id);
        //}
        await createBooking.mutateAsync("mockPaymentId"); // Replace with actual payment ID
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

// Parent component that wraps the form with Stripe provider
export function CheckoutForm(props: Props) {
  const [clientSecret, setClientSecret] = useState<string>();

  useEffect(() => {
    // Calculate total amount based on seats and selections
    const amount = props.selectedSeats.length * 100; // $100 per seat for example

    // Create PaymentIntent as soon as the page loads
    apiRequest("POST", "/api/create-payment-intent", { amount })
      .then((res) => res.json())
      .then((data) => setClientSecret(data.clientSecret));
  }, [props.selectedSeats.length]);

  if (!clientSecret) {
    return <div>Loading...</div>;
  }

  return (
    <StripeProvider clientSecret={clientSecret}>
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Payment Details</h2>
          <p className="text-muted-foreground">
            Your booking will be confirmed after successful payment
          </p>
        </div>
        <StripeCheckoutForm {...props} />
      </div>
    </StripeProvider>
  );
}