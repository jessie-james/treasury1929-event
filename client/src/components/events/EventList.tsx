import { useQuery } from "@tanstack/react-query";
import { EventCard } from "./EventCard";
import { type Event } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState, useMemo } from "react";

type SortOption = "date-asc" | "date-desc" | "title-asc" | "title-desc" | "availability-asc" | "availability-desc";

export function EventList() {
  const [sortBy, setSortBy] = useState<SortOption>("date-asc");
  
  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const sortedEvents = useMemo(() => {
    if (!events) return [];
    
    // Only show active events that haven't passed yet
    const now = new Date();
    const activeEvents = events.filter(event => {
      // Check if event is active
      if (event.isActive === false) return false;
      
      // Check if event date hasn't passed yet (compare just the date, not time)
      const eventDate = new Date(event.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of today
      eventDate.setHours(0, 0, 0, 0); // Set to start of event day
      
      return eventDate >= today;
    });
    
    return [...activeEvents].sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "date-desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "title-desc":
          return b.title.localeCompare(a.title);
        case "availability-asc":
          return (a.availableSeats ?? 0) - (b.availableSeats ?? 0);
        case "availability-desc":
          return (b.availableSeats ?? 0) - (a.availableSeats ?? 0);
        default:
          return 0;
      }
    });
  }, [events, sortBy]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-muted animate-pulse rounded-md"></div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-[300px] rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ELDERLY-FRIENDLY: Larger sorting controls and better card layout */}
      <div className="flex flex-col gap-4 max-w-2xl mx-auto">
        <Label htmlFor="event-sort" className="text-2xl font-semibold text-center">Sort events by:</Label>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger id="event-sort" className="w-full h-14 text-xl">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-asc" className="text-xl py-3">Date (Earliest first)</SelectItem>
            <SelectItem value="date-desc" className="text-xl py-3">Date (Latest first)</SelectItem>
            <SelectItem value="title-asc" className="text-xl py-3">Name (A-Z)</SelectItem>
            <SelectItem value="title-desc" className="text-xl py-3">Name (Z-A)</SelectItem>
            <SelectItem value="availability-asc" className="text-xl py-3">Availability (Least first)</SelectItem>
            <SelectItem value="availability-desc" className="text-xl py-3">Availability (Most first)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid gap-6 max-w-2xl mx-auto md:grid-cols-2 lg:max-w-6xl lg:grid-cols-3">
        {sortedEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
