import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertBookingSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const checkoutSchema = z.object({
  customerEmail: z.string().email(),
  cardNumber: z.string().min(16).max(16),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/([0-9]{2})$/),
  cvc: z.string().min(3).max(4),
});

interface Props {
  eventId: number;
  selectedSeats: number[];
  foodSelections: Record<string, number>;
  onSuccess: () => void;
}

export function CheckoutForm({ 
  eventId, 
  selectedSeats, 
  foodSelections,
  onSuccess 
}: Props) {
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof checkoutSchema>>({
    resolver: zodResolver(checkoutSchema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: z.infer<typeof checkoutSchema>) => {
      // In a real app, we would process payment with Stripe here
      const booking = {
        eventId,
        seatNumbers: selectedSeats,
        foodSelections,
        customerEmail: data.customerEmail,
        stripePaymentId: "mock_payment_id",
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

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => mutate(data))}
        className="space-y-6"
      >
        <FormField
          control={form.control}
          name="customerEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cardNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Card Number</FormLabel>
              <FormControl>
                <Input {...field} placeholder="1234 5678 9012 3456" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="expiryDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expiry Date</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="MM/YY" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cvc"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CVC</FormLabel>
                <FormControl>
                  <Input {...field} type="password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button 
          type="submit" 
          className="w-full"
          disabled={isPending}
        >
          {isPending ? "Processing..." : "Complete Booking"}
        </Button>
      </form>
    </Form>
  );
}
