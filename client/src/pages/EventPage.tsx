import { useParams, useLocation } from "wouter";
import { EventDetails } from "@/components/events/EventDetails";

export default function EventPage() {
  const [_, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const eventId = parseInt(params.id);

  return (
    <div className="container py-8">
      <EventDetails
        eventId={eventId}
        onBookNow={() => setLocation(`/events/${eventId}/book`)}
      />
    </div>
  );
}
