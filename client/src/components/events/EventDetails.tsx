import { useQuery } from "@tanstack/react-query";
import { type Event } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Calendar, MapPin } from "lucide-react";

export function EventDetails({ 
  eventId,
  onBookNow 
}: { 
  eventId: number;
  onBookNow: () => void;
}) {
  const { data: event, isLoading } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
  });

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
            {event.availableSeats === 0 ? "Sold Out" : "Book Now"}
          </Button>
        </div>
      </div>
    </div>
  );
}
