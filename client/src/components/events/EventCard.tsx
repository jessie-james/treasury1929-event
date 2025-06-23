import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { type Event } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { EventTypeIndicator } from "./EventTypeIndicator";

export function EventCard({ event }: { event: Event }) {
  const [_, setLocation] = useLocation();
  
  const availability = 
    event.availableSeats === 0
      ? { text: "Sold out", color: "destructive" }
      : event.availableSeats < event.totalSeats * 0.2
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
              if (event.eventType === 'ticket-only') {
                setLocation(`/events/${event.id}/tickets`);
              } else {
                setLocation(`/events/${event.id}/book`);
              }
            }}
            className="flex-1"
            disabled={event.availableSeats === 0 || event.isPrivate}
          >
            {event.availableSeats === 0 
              ? "Sold Out" 
              : event.isPrivate 
                ? "Private Event" 
                : event.eventType === 'ticket-only' 
                  ? "Buy Tickets" 
                  : "Book Table"
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
