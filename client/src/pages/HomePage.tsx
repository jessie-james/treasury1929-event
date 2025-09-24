import { EventList } from "@/components/events/EventList";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {/* ELDERLY-FRIENDLY: Larger text, bigger spacing, easier navigation */}
        <div className="container mx-auto py-8 space-y-12 px-6">
          <div className="text-center space-y-4 max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold leading-tight">
              TEST This is live
            </h2>
            <p className="text-2xl md:text-3xl text-muted-foreground leading-relaxed">
              Book your spot at our most exclusive gatherings
            </p>
          </div>
          <EventList />
        </div>
      </main>
    </div>
  );
}
