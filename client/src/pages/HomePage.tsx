import { EventList } from "@/components/events/EventList";
import { Header } from "@/components/Header";

export default function HomePage() {
  return (
    <div>
      <Header />
      <div className="container py-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-bold">Upcoming Events</h2>
          <p className="text-lg text-muted-foreground">
            Book your spot at our most exclusive gatherings
          </p>
        </div>
        <EventList />
      </div>
    </div>
  );
}