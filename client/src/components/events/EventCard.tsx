import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { parseEventDate } from "@/utils/dateUtils";
import { formatEventDateForCard } from "@/lib/datetime";
import { type Event } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { EventTypeIndicator } from "./EventTypeIndicator";
import { formatPriceDisplay } from "@/lib/price";
import { useQuery } from "@tanstack/react-query";

export function EventCard({ event }: { event: Event }) {
  const [_, setLocation] = useLocation();

  // Check if event has venue layouts to determine actual booking type
  const { data: venueLayouts } = useQuery({
    queryKey: [`/api/events/${event.id}/venue-layouts`],
    enabled: !!event.id,
    retry: false, // Don't retry on 404
  });

  const hasVenueLayouts = venueLayouts && Array.isArray(venueLayouts) && venueLayouts.length > 0;
  const isTicketOnly = event.eventType === 'ticket-only' || !hasVenueLayouts;

  // Real-time availability check to prevent sold-out bypass
  const { data: realTimeAvailability } = useQuery({
    queryKey: [`/api/events/${event.id}/availability`],
    enabled: !!event.id,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes for cards
  });
  
  // Use real-time availability if available, otherwise fall back to event data
  const isSoldOut = (realTimeAvailability as any)?.isSoldOut ?? event.availableSeats === 0;
  const availableSeats = (realTimeAvailability as any)?.availableSeats ?? event.availableSeats;
  const totalSeats = (realTimeAvailability as any)?.totalSeats ?? event.totalSeats;
  
  const availability = 
    event.isActive === false
      ? { text: "Sold out", color: "destructive" }
      : isSoldOut
      ? { text: "Sold out", color: "destructive" }
      : availableSeats < totalSeats * 0.2
      ? { text: "Selling fast – Buy now!", color: "warning" }
      : { text: "Tickets available", color: "success" };

  return (
    <Card className="w-full">
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-2xl md:text-3xl font-bold flex-1 leading-snug text-slate-700">
              {event.title}
            </h3>
            <EventTypeIndicator 
              eventType={event.eventType || 'full'} 
              isPrivate={event.isPrivate || false}
            />
          </div>
          
          <div className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            <div className="font-medium text-foreground">
              {formatEventDateForCard(event.date)}
            </div>
          </div>
          
          <div className="space-y-2 text-sm md:text-base text-muted-foreground leading-relaxed">
            <p>
              {event.description ? event.description.substring(0, 120) + '...' : 
               'Dinner Concert Series Premiere: An Evening of Fine Dining and Live Music Presented at The Treasury 1929 Join us for the launch of our Dinner Concert Series, an elegant evening where culinary artistry...'}
            </p>
          </div>
          
          <div className="text-xl md:text-2xl font-semibold text-foreground">
            Price: {(typeof formatPriceDisplay === 'function' && formatPriceDisplay(event)) || "$130 per guest — tax & gratuity included"}
          </div>
          
          <Badge variant={availability.color as any} className="text-base px-3 py-1">
            {availability.text}
          </Badge>
        </div>
        
        <Button 
          size="lg"
          onClick={() => {
            if (isTicketOnly) {
              setLocation(`/events/${event.id}/tickets`);
            } else {
              setLocation(`/events/${event.id}/book`);
            }
          }}
          className="w-full py-3 text-lg font-medium bg-blue-500 hover:bg-blue-600"
          disabled={event.isActive === false || isSoldOut || event.isPrivate}
        >
          {event.isActive === false
            ? "Sold Out"
            : isSoldOut
            ? "Sold Out" 
            : event.isPrivate 
              ? "Private Event" 
              : isTicketOnly 
                ? "Buy Tickets" 
                : "Book Now"
          }
        </Button>
      </CardContent>
    </Card>
  );
}
