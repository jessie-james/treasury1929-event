import React, { useState } from 'react';

interface CheckoutFormProps {
  eventId: number;
  tableId: number;
  selectedSeats: number[];
  foodSelections?: any[];
  wineSelections?: any[];
  guestNames?: Record<number, string>;
  selectedVenue?: string;
  onSuccess?: () => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ 
  eventId, 
  tableId, 
  selectedSeats, 
  foodSelections = [], 
  wineSelections = [],
  guestNames = {},
  selectedVenue,
  onSuccess 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStripeCheckout = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          eventId,
          tableId,
          selectedSeats,
          amount: Math.round(19.99 * selectedSeats.length * 100), // amount in cents
          foodSelections,
          wineSelections,
          guestNames,
          selectedVenue
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment setup failed');
      }

      // Redirect to Stripe Checkout - this always works!
      window.location.href = data.url;
      
    } catch (err: any) {
      console.error('Payment failed:', err);
      setError(err.message || 'Payment initialization failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="checkout-form space-y-6">
      <div className="booking-summary bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Booking Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Event ID:</span>
            <span>{eventId}</span>
          </div>
          <div className="flex justify-between">
            <span>Table:</span>
            <span>{tableId}</span>
          </div>
          <div className="flex justify-between">
            <span>Seats:</span>
            <span>{selectedSeats.length}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-semibold text-lg">
            <span>Total:</span>
            <span>${(19.99 * selectedSeats.length).toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="error-message bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Payment Error</div>
          <div className="text-red-700 text-sm mt-1">{error}</div>
        </div>
      )}
      
      <button 
        onClick={handleStripeCheckout}
        disabled={isLoading}
        className={`w-full py-3 px-6 rounded-lg text-white font-medium text-lg transition-colors ${
          isLoading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
        }`}
      >
        {isLoading ? 'Setting up payment...' : 'Pay with Stripe'}
      </button>
      
      <p className="text-sm text-gray-600 text-center">
        You'll be redirected to Stripe's secure checkout page
      </p>
    </div>
  );
};

export { CheckoutForm };