import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, Users, Calendar, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Event } from "@shared/schema";

interface TicketOnlyFlowProps {
  eventId: number;
  onComplete: (ticketData: {
    quantity: number;
    guestNames: string[];
    totalAmount: number;
  }) => void;
}

export function TicketOnlyFlow({ eventId, onComplete }: TicketOnlyFlowProps) {
  const [quantity, setQuantity] = useState(1);
  const [guestNames, setGuestNames] = useState<string[]>(['']);

  // Fetch event details
  const { data: event, isLoading } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`]
  });

  const ticketPrice = 25.00; // Base ticket price
  const totalAmount = quantity * ticketPrice;

  const updateQuantity = (newQuantity: number) => {
    const validQuantity = Math.max(1, Math.min(10, newQuantity));
    setQuantity(validQuantity);
    
    // Update guest names array
    const newNames = Array.from({ length: validQuantity }, (_, i) => 
      guestNames[i] || ''
    );
    setGuestNames(newNames);
  };

  const updateGuestName = (index: number, name: string) => {
    const newNames = [...guestNames];
    newNames[index] = name;
    setGuestNames(newNames);
  };

  const canProceed = guestNames.every(name => name.trim().length > 0);

  const handleComplete = () => {
    if (canProceed) {
      onComplete({
        quantity,
        guestNames: guestNames.filter(name => name.trim().length > 0),
        totalAmount: totalAmount * 100 // Convert to cents
      });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading event details...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Purchase Tickets</h2>
        <p className="text-muted-foreground">
          Select the number of tickets and provide guest information
        </p>
      </div>

      {/* Event Information */}
      {event && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {event.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {new Date(event.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              General Admission - Standing Room
            </div>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {event.description}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ticket Quantity Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Number of Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => updateQuantity(quantity - 1)}
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <div className="text-3xl font-bold">{quantity}</div>
              <div className="text-sm text-muted-foreground">
                {quantity === 1 ? 'ticket' : 'tickets'}
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => updateQuantity(quantity + 1)}
              disabled={quantity >= 10}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-center mt-4">
            <p className="text-lg font-medium">
              ${ticketPrice.toFixed(2)} per ticket
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Guest Information */}
      <Card>
        <CardHeader>
          <CardTitle>Guest Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {guestNames.map((name, index) => (
            <div key={index} className="space-y-2">
              <Label htmlFor={`guest-${index}`}>
                {index === 0 ? 'Primary Guest' : `Guest ${index + 1}`}
              </Label>
              <Input
                id={`guest-${index}`}
                value={name}
                onChange={(e) => updateGuestName(index, e.target.value)}
                placeholder="Enter full name"
                required
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Price Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>{quantity} ticket{quantity !== 1 ? 's' : ''}</span>
              <span>${(quantity * ticketPrice).toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 font-medium">
              <div className="flex justify-between text-lg">
                <span>Total</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Continue Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleComplete}
          disabled={!canProceed}
          className="w-full sm:w-auto"
        >
          Continue to Payment
        </Button>
      </div>
    </div>
  );
}