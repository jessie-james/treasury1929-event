import { useParams, useLocation } from "wouter";
import { EventDetails } from "@/components/events/EventDetails";

export default function EventPage() {
  const params = useParams<{ id: string }>();
  const eventId = parseInt(params.id);

  return (
    <div className="container py-8">
      <EventDetails
        eventId={eventId}
        // No onBookNow prop - let EventDetails handle smart routing
      />
    </div>
  );
}
