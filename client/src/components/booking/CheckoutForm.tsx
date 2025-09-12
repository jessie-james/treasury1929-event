import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { getEffectivePriceCents } from '@/lib/price';
import { type Event as FullEvent } from '@shared/schema';
import { ArrowLeft } from 'lucide-react';

interface CheckoutFormProps {
  eventId: number;
  tableId: number;
  selectedSeats: number[];
  foodSelections?: any[];
  wineSelections?: any[];
  guestNames?: Record<number, string>;
  selectedVenue?: string;
  onSuccess?: () => void;
  onBack?: () => void;
}

interface Event {
  id: number;
  title: string;
  basePrice: number;
  ticketPrice: number;
  eventType: string;
  includeFoodService: boolean;
  includeBeverages: boolean;
  includeAlcohol: boolean;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ 
  eventId, 
  tableId, 
  selectedSeats, 
  foodSelections = [], 
  wineSelections = [],
  guestNames = {},
  selectedVenue,
  onSuccess,
  onBack
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch event details for pricing
  const { data: event } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
  });

  // Fetch table details to get the actual table number
  const { data: table } = useQuery({
    queryKey: [`/api/tables/${tableId}`],
    enabled: tableId > 0,
  });

  // Calculate pricing based on event type
  const calculatePricing = () => {
    // Use the centralized price logic
    const basePrice = event ? getEffectivePriceCents(event as FullEvent) * selectedSeats.length : 13000 * selectedSeats.length;
    
    const winePrice = wineSelections.reduce((total, wine) => {
      return total + (wine.price * wine.quantity);
    }, 0);
    
    return {
      basePrice,
      winePrice,
      totalPrice: basePrice + winePrice,
      basePriceFormatted: `$${(basePrice / 100).toFixed(2)}`,
      winePriceFormatted: `$${(winePrice / 100).toFixed(2)}`,
      totalPriceFormatted: `$${((basePrice + winePrice) / 100).toFixed(2)}`
    };
  };

  const pricing = calculatePricing();

  const handleStripeCheckout = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 CHECKOUT DEBUG: Guest names being sent:', guestNames);
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
          amount: pricing.totalPrice, // NEW: $130 per person + wine
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
      {/* Back Button */}
      {onBack && (
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Wine Selection
          </Button>
        </div>
      )}
      
      <div className="booking-summary bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Booking Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Event:</span>
            <span>{event?.title || `#${eventId}`}</span>
          </div>
          {tableId > 0 && (
            <div className="flex justify-between">
              <span>Table:</span>
              <span>{(table as any)?.tableNumber}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>{tableId > 0 ? 'Seats' : 'Tickets'}:</span>
            <span>{selectedSeats.length}</span>
          </div>
          {selectedVenue && (
            <div className="flex justify-between">
              <span>Floor Level:</span>
              <span>{selectedVenue}</span>
            </div>
          )}
          
          {/* NEW PRICING BREAKDOWN */}
          <div className="border-t pt-2 space-y-1">
            <div className="flex justify-between">
              <span>
                {selectedSeats.length} {event?.eventType === 'ticket-only' ? 'ticket' : 'person'}{selectedSeats.length > 1 ? 's' : ''} × 
                ${event ? (getEffectivePriceCents(event as FullEvent) / 100).toFixed(2) : '130.00'}:
              </span>
              <span>{pricing.basePriceFormatted}</span>
            </div>
            {event?.eventType !== 'ticket-only' && (
              <div className="text-sm text-gray-600 ml-4">
                (Includes salad + entrée + dessert selection)
              </div>
            )}
            
            {wineSelections.length > 0 && (
              <>
                <div className="flex justify-between">
                  <span>Wine & Beverages:</span>
                  <span>{pricing.winePriceFormatted}</span>
                </div>
                {wineSelections.map((wine, index) => (
                  <div key={index} className="text-sm text-gray-600 ml-4 flex justify-between">
                    <span>{wine.name} × {wine.quantity}</span>
                    <span>${((wine.price * wine.quantity) / 100).toFixed(2)}</span>
                  </div>
                ))}
              </>
            )}
            
            <div className="border-t pt-2 flex justify-between font-semibold text-lg">
              <span>Total:</span>
              <span>{pricing.totalPriceFormatted}</span>
            </div>
          </div>
          
          {/* SERVICE NOTICES - Only show for full events */}
          {event?.eventType !== 'ticket-only' && (
            <div className="text-xs text-gray-500 space-y-1 pt-2">
              <p>• Water provided with all meals</p>
              {wineSelections.length > 0 && (
                <>
                  <p>• Must be 21+ to purchase alcohol</p>
                  <p>• ID verification required at venue</p>
                </>
              )}
              <p>• Mixed drinks available at venue - arrive 10 minutes early to order</p>
            </div>
          )}
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