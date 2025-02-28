import { EventList } from "@/components/events/EventList";
import { UserMenu } from "@/components/UserMenu";

export default function HomePage() {
  return (
    <div>
      <div className="border-b">
        <div className="container flex justify-between items-center h-16">
          <h1 className="text-xl font-semibold">Event Venue Booking</h1>
          <UserMenu />
        </div>
      </div>

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