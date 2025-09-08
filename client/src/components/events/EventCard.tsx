import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { type Event } from "@shared/schema";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

export function EventCard({ event }: { event: Event }) {
  const [_, setLocation] = useLocation();

  // Check if event has venue layouts to determine actual booking type
  const { data: venueLayouts } = useQuery({
    queryKey: [`/api/events/${event.id}/venue-layouts`],
    enabled: !!event.id,
    retry: false,
  });

  const hasVenueLayouts = venueLayouts && Array.isArray(venueLayouts) && venueLayouts.length > 0;
  const isTicketOnly = event.eventType === 'ticket-only' || !hasVenueLayouts;

  // Real-time availability check
  const { data: realTimeAvailability } = useQuery({
    queryKey: [`/api/events/${event.id}/availability`],
    enabled: !!event.id,
    refetchInterval: 5 * 60 * 1000,
  });
  
  const isSoldOut = (realTimeAvailability as any)?.isSoldOut ?? event.availableSeats === 0;

  // Format the date properly
  const eventDate = new Date(event.date);
  const formattedDate = format(eventDate, "EEEE, MMMM d, yyyy");
  const timeText = "Guest Arrival 5:45 PM, show starts 6:30 PM";

  return (
    <Card className="overflow-hidden max-w-2xl mx-auto">
      <CardContent className="p-0">
        <div className="flex">
          {/* Image Section */}
          <div className="w-48 h-64 flex-shrink-0">
            <img
              src={event.image || '/assets/placeholder-event.jpg'}
              alt={event.title || 'Event'}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/assets/placeholder-event.jpg';
              }}
            />
          </div>
          
          {/* Content Section */}
          <div className="flex-1 p-6 relative">
            {/* Table Service Badge */}
            {!isTicketOnly && (
              <Badge 
                variant="secondary" 
                className="absolute top-4 right-4 bg-gray-600 text-white"
              >
                Table Service
              </Badge>
            )}
            
            <div className="space-y-4">
              {/* Event Title */}
              <h3 className="text-xl font-semibold leading-tight pr-20">
                {event.title}
              </h3>
              
              {/* Date and Time */}
              <div className="space-y-1">
                <div className="font-medium text-gray-900">
                  {formattedDate}
                </div>
                <div className="text-sm text-gray-600">
                  Time: {timeText}
                </div>
              </div>
              
              {/* Availability Status */}
              <div className="text-sm">
                {event.isActive === false || isSoldOut ? (
                  <span className="text-red-600 font-medium">Sold out</span>
                ) : (
                  <span className="text-green-600 font-medium">Tickets available</span>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setLocation(`/events/${event.id}`)}
                >
                  View Details
                </Button>
                <Button 
                  className="w-full bg-slate-700 hover:bg-slate-800 text-white"
                  onClick={() => {
                    if (isTicketOnly) {
                      setLocation(`/events/${event.id}/tickets`);
                    } else {
                      setLocation(`/events/${event.id}/book`);
                    }
                  }}
                  disabled={event.isActive === false || isSoldOut || event.isPrivate}
                >
                  {event.isActive === false || isSoldOut
                    ? "Sold Out" 
                    : event.isPrivate 
                      ? "Private Event" 
                      : isTicketOnly 
                        ? "Buy Tickets" 
                        : "Book Table"
                  }
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}