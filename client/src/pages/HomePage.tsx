import { EventList } from "@/components/events/EventList";
import { Header } from "@/components/Header";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto py-8 space-y-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-2 max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold">Upcoming Events</h2>
            <p className="text-lg text-muted-foreground">
              Book your spot at our most exclusive gatherings
            </p>
          </div>
          <EventList />
        </div>
      </main>
    </div>
  );
}