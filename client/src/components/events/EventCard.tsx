import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { type Event } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { EventTypeIndicator } from "./EventTypeIndicator";
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
    refetchInterval: 60000, // Refresh every minute for cards
  });
  
  // Use real-time availability if available, otherwise fall back to event data
  const isSoldOut = realTimeAvailability?.isSoldOut ?? event.availableSeats === 0;
  const availableSeats = realTimeAvailability?.availableSeats ?? event.availableSeats;
  const totalSeats = realTimeAvailability?.totalSeats ?? event.totalSeats;
  
  const availability = 
    isSoldOut
      ? { text: "Sold out", color: "destructive" }
      : availableSeats < totalSeats * 0.2
      ? { text: "Selling fast – Buy now!", color: "warning" }
      : { text: "Tickets available", color: "success" };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-[16/9] relative">
        <img
          src={event.image}
          alt={event.title}
          className="object-cover w-full h-full"
        />
      </div>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="event-card-title flex-1">{event.title}</h3>
            <EventTypeIndicator 
              eventType={event.eventType || 'full'} 
              isPrivate={event.isPrivate}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(event.date), "PPP 'at' p")}
          </p>
          <Badge variant={availability.color as any}>
            {availability.text}
          </Badge>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setLocation(`/events/${event.id}`)}
            className="flex-1"
          >
            View Details
          </Button>
          <Button 
            size="sm"
            onClick={() => {
              if (isTicketOnly) {
                setLocation(`/events/${event.id}/tickets`);
              } else {
                setLocation(`/events/${event.id}/book`);
              }
            }}
            className="flex-1"
            disabled={isSoldOut || event.isPrivate}
          >
            {isSoldOut
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
