import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { type Event } from "@shared/schema";
import { Link } from "wouter";

export function EventCard({ event }: { event: Event }) {
  const availability = 
    event.availableSeats === 0
      ? { text: "Sold out", color: "destructive" }
      : event.availableSeats < event.totalSeats * 0.2
      ? { text: "Selling fast – Buy now!", color: "warning" }
      : { text: "Tickets available", color: "success" };

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        <div className="aspect-[16/9] relative">
          <img
            src={event.image}
            alt={event.title}
            className="object-cover w-full h-full"
          />
        </div>
        <CardContent className="p-4 space-y-2">
          <h3 className="event-card-title">{event.title}</h3>
          <p className="text-sm text-muted-foreground">
            {format(new Date(event.date), "PPP 'at' p")}
          </p>
          <Badge variant={availability.color as any}>
            {availability.text}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
