import { EventList } from "@/components/events/EventList";

export default function HomePage() {
  return (
    <div className="container py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Upcoming Events</h1>
        <p className="text-lg text-muted-foreground">
          Book your spot at our most exclusive gatherings
        </p>
      </div>
      <EventList />
    </div>
  );
}
