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
    
    return [...events].sort((a, b) => {
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
          return a.availableSeats - b.availableSeats;
        case "availability-desc":
          return b.availableSeats - a.availableSeats;
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <Label htmlFor="event-sort" className="text-sm font-medium">Sort events by:</Label>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger id="event-sort" className="w-full sm:w-[220px]">
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
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sortedEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
