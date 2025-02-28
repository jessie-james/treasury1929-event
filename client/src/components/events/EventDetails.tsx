import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type Event, type Booking } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Calendar, MapPin, Ticket } from "lucide-react";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "wouter";

export function EventDetails({ 
  eventId,
  onBookNow 
}: { 
  eventId: number;
  onBookNow: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: event, isLoading } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
  });

  // Query user's bookings to check if they have already booked this event
  const { data: bookings } = useQuery<Booking[]>({
    queryKey: ["/api/user/bookings"],
  });

  const hasBooking = bookings?.some(booking => booking.eventId === eventId);

  useEffect(() => {
    // Setup WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'availability_update' && data.eventId === eventId) {
        // Update the cached event data with new availability
        queryClient.setQueryData([`/api/events/${eventId}`], (oldData: Event | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            availableSeats: data.availableSeats
          };
        });
      }
    };

    return () => {
      socket.close();
    };
  }, [eventId, queryClient]);

  if (isLoading) {
    return <div className="animate-pulse h-96 bg-muted rounded-lg" />;
  }

  if (!event) {
    return <div>Event not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="aspect-[21/9] relative rounded-lg overflow-hidden">
        <img
          src={event.image}
          alt={event.title}
          className="object-cover w-full h-full"
        />
      </div>

      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{event.title}</h1>

        <div className="flex flex-wrap gap-4 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {format(new Date(event.date), "PPP 'at' p")}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Elegant Events Venue
          </div>
        </div>

        <p className="text-lg">{event.description}</p>

        {hasBooking && (
          <Alert>
            <Ticket className="h-4 w-4" />
            <AlertTitle>You have tickets for this event</AlertTitle>
            <AlertDescription>
              <Link href="/dashboard" className="underline">
                View your tickets
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Available Seats</p>
            <p className="text-2xl font-bold">{event.availableSeats}</p>
          </div>
          <Button 
            size="lg"
            onClick={onBookNow}
            disabled={event.availableSeats === 0}
          >
            {event.availableSeats === 0 ? "Sold Out" : hasBooking ? "Book More Tickets" : "Book Now"}
          </Button>
        </div>
      </div>
    </div>
  );
}