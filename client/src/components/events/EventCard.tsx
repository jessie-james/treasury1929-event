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
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square relative" style={{ aspectRatio: '1 / 1' }}>
        <img
          src={event.image || '/assets/placeholder-event.jpg'}
          alt={event.title || 'Event'}
          className="object-cover w-full h-full"
          style={{ objectPosition: '50% 10%' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/assets/placeholder-event.jpg';
          }}
        />
      </div>
      {/* ELDERLY-FRIENDLY: Much larger text, bigger touch targets, clear contrast */}
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-2xl md:text-3xl font-bold flex-1 leading-snug">{event.title}</h3>
            <EventTypeIndicator 
              eventType={event.eventType || 'full'} 
              isPrivate={event.isPrivate || false}
            />
          </div>
          <div className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
            <div className="font-semibold text-foreground">{formatEventDateForCard(event.date)}</div>
            <div>Time: Guest Arrival 5:45 PM, show starts 6:30 PM</div>
          </div>
          {/* PHASE 0: Price Display */}
          <div className="text-xl md:text-2xl font-semibold text-foreground">
            {(typeof formatPriceDisplay === 'function' && formatPriceDisplay(event)) || "$130 per guest — tax & gratuity included"}
          </div>
          <Badge variant={availability.color as any} className="text-lg px-4 py-2">
            {availability.text}
          </Badge>
        </div>
        
        {/* ELDERLY-FRIENDLY: Much larger buttons, easier to tap */}
        <div className="flex flex-col gap-4">
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => setLocation(`/events/${event.id}`)}
            className="w-full py-4 text-xl font-semibold"
          >
            View Details
          </Button>
          <Button 
            size="lg"
            onClick={() => {
              if (isTicketOnly) {
                setLocation(`/events/${event.id}/tickets`);
              } else {
                setLocation(`/events/${event.id}/book`);
              }
            }}
            className="w-full py-4 text-xl font-semibold"
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
                  : "Book Table"
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
