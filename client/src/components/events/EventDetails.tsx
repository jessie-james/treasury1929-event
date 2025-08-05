import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type Event, type Booking } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Calendar, MapPin, Ticket, AlertTriangle, ArrowLeft } from "lucide-react";
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
      {/* Back Button */}
      <div className="flex items-center gap-3">
        <Button 
          variant="outline" 
          onClick={() => setLocation("/")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Button>
      </div>
      
      <div className="aspect-[21/9] relative rounded-lg overflow-hidden">
        <img
          src={event.image || ''}
          alt={event.title}
          className="object-cover w-full h-full"
        />
      </div>

      <div className="space-y-4">
        {/* ELDERLY-FRIENDLY: Much larger text for easy reading */}
        <h1 className="text-4xl md:text-5xl font-bold font-serif leading-tight">{event.title}</h1>

        <div className="flex flex-col gap-6 text-muted-foreground">
          <div className="flex items-center gap-4">
            <Calendar className="h-8 w-8 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-2xl md:text-3xl leading-relaxed font-semibold">
                Event Date: Aug 14
              </span>
              <span className="text-xl md:text-2xl leading-relaxed text-muted-foreground">
                Time: Guest Arrival 5:45 PM, show starts 6:30 PM
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <MapPin className="h-8 w-8 flex-shrink-0" />
            <span className="text-2xl md:text-3xl">The Treasury 1929, 2 E Congress St, Tucson, AZ 85701</span>
          </div>
        </div>

        {/* Top Booking Section with Tables Info */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 p-8 bg-muted rounded-xl">
          <div className="flex flex-col sm:flex-row gap-8">
            {event.eventType === 'ticket-only' ? (
              <>
                <div className="text-center">
                  <p className="text-xl text-muted-foreground">Available Tickets</p>
                  <p className="text-4xl font-bold">{(realTimeAvailability as any)?.availableSeats || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xl text-muted-foreground">Total Tickets</p>
                  <p className="text-4xl font-bold">{event.ticketCapacity || 0}</p>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-xl text-muted-foreground">Available Tables</p>
                  <p className="text-4xl font-bold">{event.availableTables || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xl text-muted-foreground">Total Seats</p>
                  <p className="text-4xl font-bold">
                    {(event as any).venueLayout ? 
                      (event as any).venueLayout.tables.reduce((total: number, table: any) => total + table.capacity, 0) : 
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
            disabled={(realTimeAvailability as any)?.isSoldOut ?? event.availableTables === 0}
            className="w-full lg:w-auto py-6 px-12 text-2xl font-semibold"
          >
            {((realTimeAvailability as any)?.isSoldOut ?? event.availableTables === 0) 
              ? "Sold Out" 
              : hasBooking 
                ? "Book More Tickets" 
                : "Book Now"
            }
          </Button>
        </div>

        <div className="text-2xl md:text-3xl leading-relaxed whitespace-pre-line">{event.description}</div>

        {hasBooking && (
          <Alert className="bg-yellow-50 border-yellow-200 p-6">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
            <AlertTitle className="text-yellow-800 text-2xl font-semibold">You have tickets for this event</AlertTitle>
            <AlertDescription className="text-yellow-700 text-xl">
              <Link href="/dashboard" className="underline font-semibold text-2xl">
                View your tickets
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* ELDERLY-FRIENDLY: Much larger booking area with bigger buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 p-8 bg-muted rounded-xl">
          <div className="flex flex-col sm:flex-row gap-8">
            {event.eventType === 'ticket-only' ? (
              <>
                <div className="text-center">
                  <p className="text-xl text-muted-foreground">Available Tickets</p>
                  <p className="text-4xl font-bold">{(realTimeAvailability as any)?.availableSeats || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xl text-muted-foreground">Total Tickets</p>
                  <p className="text-4xl font-bold">{event.ticketCapacity || 0}</p>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-xl text-muted-foreground">Available Tables</p>
                  <p className="text-4xl font-bold">{event.availableTables || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xl text-muted-foreground">Total Seats</p>
                  <p className="text-4xl font-bold">
                    {(event as any).venueLayout ? 
                      (event as any).venueLayout.tables.reduce((total: number, table: any) => total + table.capacity, 0) : 
                      event.totalSeats || 0
                    }
                  </p>
                </div>
              </>
            )}
          </div>
          {/* ELDERLY-FRIENDLY: Extra large booking button */}
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
            disabled={(realTimeAvailability as any)?.isSoldOut ?? event.availableTables === 0}
            className="w-full lg:w-auto py-6 px-12 text-2xl font-semibold"
          >
            {((realTimeAvailability as any)?.isSoldOut ?? event.availableTables === 0) 
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