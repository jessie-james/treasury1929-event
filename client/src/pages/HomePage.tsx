import { EventList } from "@/components/events/EventList";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <div className="container mx-auto py-8 px-4">
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Upcoming Events</h1>
            <p className="text-gray-600">
              Book your spot at our most exclusive gatherings
            </p>
          </div>
          <EventList />
        </div>
      </main>
    </div>
  );
}