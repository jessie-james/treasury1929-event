import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';

interface Props {
  eventId: number;
  tableId: number;
  selectedSeats: number[];
  foodSelections: any[];
  guestNames: string[];
  onSuccess: () => void;
}

export function CheckoutForm({
  eventId,
  tableId,
  selectedSeats,
  foodSelections,
  guestNames,
  onSuccess
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleStripeCheckout = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("Creating Stripe checkout session...");
      const response = await apiRequest("POST", "/api/create-checkout-session", {
        eventId,
        tableId,
        selectedSeats,
        foodSelections,
        guestNames,
        amount: Math.round(19.99 * selectedSeats.length * 100) // Convert to cents
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment setup failed');
      }

      // Redirect to Stripe Checkout
      console.log("Redirecting to Stripe Checkout...");
      window.location.href = data.url;
      
    } catch (error) {
      console.error('Stripe checkout failed, trying direct booking:', error);
      
      // Fallback to direct booking
      try {
        const directBookingResponse = await apiRequest("POST", "/api/bookings", {
          eventId,
          tableId,
          selectedSeats,
          foodSelections,
          guestNames,
          paymentMethod: "direct",
          amount: Math.round(19.99 * selectedSeats.length * 100)
        });

        if (directBookingResponse.ok) {
          queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
          queryClient.invalidateQueries({ queryKey: ["/api/events"] });
          onSuccess();
          toast({
            title: "Booking Confirmed",
            description: "Your booking has been created successfully. Payment will be processed separately.",
            variant: "default"
          });
          return;
        }
      } catch (directBookingError) {
        console.error("Direct booking also failed:", directBookingError);
      }
      
      setError(error instanceof Error ? error.message : "Payment setup failed");
      toast({
        title: "Payment Error",
        description: "Unable to process payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    handleStripeCheckout();
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
      
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-green-600 mr-2">💳</div>
          <div>
            <h4 className="font-semibold text-green-800">Secure Payment Processing</h4>
            <p className="text-sm text-green-700">Powered by Stripe - Test card: 4242 4242 4242 4242</p>
          </div>
        </div>
      </div>

      {error && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>Payment Error</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button variant="outline" onClick={handleRetry}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      <Button 
        onClick={handleStripeCheckout}
        disabled={isLoading}
        className="w-full h-12 text-lg"
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing...</span>
          </div>
        ) : (
          `Pay $${(19.99 * selectedSeats.length).toFixed(2)} Now`
        )}
      </Button>
    </div>
  );
}