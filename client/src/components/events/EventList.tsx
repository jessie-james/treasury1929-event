import { useQuery } from "@tanstack/react-query";
import { EventCard } from "./EventCard";
import { type Event } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    const activeEvents = events.filter(event => {
      if (event.isActive === false) return false;
      
      const eventDate = new Date(event.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      eventDate.setHours(0, 0, 0, 0);
      
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
      <div className="space-y-6">
        <div className="text-center">
          <div className="h-6 w-32 bg-gray-200 animate-pulse rounded mx-auto mb-4"></div>
          <div className="h-10 w-64 bg-gray-200 animate-pulse rounded mx-auto"></div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="max-w-2xl mx-auto h-64 bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sort Controls */}
      <div className="text-center">
        <div className="mb-4">
          <span className="text-lg font-medium text-gray-900">Sort events by:</span>
        </div>
        <div className="max-w-xs mx-auto">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-full">
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
      </div>
      
      {/* Event Cards */}
      <div className="space-y-6">
        {sortedEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}