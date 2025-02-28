import { useParams, useLocation } from "wouter";
import { EventDetails } from "@/components/events/EventDetails";
import { BackButton } from "@/components/ui/back-button"; // Added import for BackButton

export default function EventPage() {
  const [_, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const eventId = parseInt(params.id);

  return (
    <div className="container py-8">
      <BackButton /> {/* Added BackButton */}
      <EventDetails
        eventId={eventId}
        onBookNow={() => setLocation(`/events/${eventId}/book`)}
      />
    </div>
  );
}