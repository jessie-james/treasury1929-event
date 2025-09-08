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
        <div className="h-10 w-48 bg-gray-200 animate-pulse rounded-md"></div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-[300px] rounded-lg bg-gray-200 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sort Controls */}
      <div className="max-w-xs">
        <Label htmlFor="event-sort" className="text-sm font-medium text-gray-700 mb-2 block">Sort events by:</Label>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger id="event-sort" className="w-full">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-asc">Date (Earliest first)</SelectItem>
            <SelectItem value="date-desc">Date (Latest first)</SelectItem>
            <SelectItem value="title-asc">Name (A-Z)</SelectItem>
            <SelectItem value="title-desc">Name (Z-A)</SelectItem>
            <SelectItem value="availability-asc">Availability (Least first)</SelectItem>
            <SelectItem value="availability-desc">Availability (Most first)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Event Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sortedEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}