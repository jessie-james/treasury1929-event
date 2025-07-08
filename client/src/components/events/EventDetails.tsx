import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type Event, type Booking } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Calendar, MapPin, Ticket, AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link, useLocation } from "wouter";

export function EventDetails({ 
  eventId,
  onBookNow 
}: { 
  eventId: number;
  onBookNow?: () => void;
}) {
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: event, isLoading } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
  });

  // Query user's bookings to check if they have already booked this event
  const { data: bookings } = useQuery<Booking[]>({
    queryKey: ["/api/user/bookings"],
  });

  const hasBooking = bookings?.some(booking => booking.eventId === eventId);

  // Check if event has venue layouts to determine booking type
  const { data: venueLayouts } = useQuery({
    queryKey: [`/api/events/${eventId}/venue-layouts`],
    enabled: !!eventId,
    retry: false, // Don't retry on 404
  });

  const hasVenueLayouts = venueLayouts && Array.isArray(venueLayouts) && venueLayouts.length > 0;

  // Real-time availability check to prevent sold-out bypass
  const { data: realTimeAvailability } = useQuery({
    queryKey: [`/api/events/${eventId}/availability`],
    enabled: !!eventId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

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
        <h1 className="text-3xl font-bold font-serif">{event.title}</h1>

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
          <Alert variant="warning" className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">You have tickets for this event</AlertTitle>
            <AlertDescription className="text-yellow-700">
              <Link href="/dashboard" className="underline">
                View your tickets
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex gap-6">
            {event.eventType === 'ticket-only' ? (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Available Tickets</p>
                  <p className="text-2xl font-bold">{realTimeAvailability?.availableSeats || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Tickets</p>
                  <p className="text-2xl font-bold">{event.ticketCapacity || 0}</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Available Tables</p>
                  <p className="text-2xl font-bold">{event.availableTables || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Seats</p>
                  <p className="text-2xl font-bold">
                    {event.venueLayout ? 
                      event.venueLayout.tables.reduce((total: number, table: any) => total + table.capacity, 0) : 
                      event.totalSeats || 0
                    }
                  </p>
                </div>
              </>
            )}
          </div>
          <Button 
            size="lg"
            onClick={() => {
              if (onBookNow) {
                onBookNow();
              } else {
                // Smart routing based on venue layout availability
                const bookingPath = hasVenueLayouts 
                  ? `/events/${eventId}/book`
                  : `/events/${eventId}/tickets`;
                setLocation(bookingPath);
              }
            }}
            disabled={realTimeAvailability?.isSoldOut ?? event.availableTables === 0}
          >
            {(realTimeAvailability?.isSoldOut ?? event.availableTables === 0) 
              ? "Sold Out" 
              : hasBooking 
                ? "Book More Tickets" 
                : "Book Now"
            }
          </Button>
        </div>
      </div>
    </div>
  );
}