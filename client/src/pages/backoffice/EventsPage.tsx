import { useQuery } from "@tanstack/react-query";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { Button } from "@/components/ui/button";
import { PlusCircle, CalendarDays, SortAsc } from "lucide-react";
import { useState, useMemo } from "react";
import { EventForm } from "@/components/backoffice/EventForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type Event } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type SortOption = "date-asc" | "date-desc" | "title-asc" | "title-desc" | "seats-asc" | "seats-desc" | "id-asc" | "id-desc";

export default function EventsPage() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("date-asc");

  const { data: events } = useQuery<Event[]>({
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
        case "seats-asc":
          return a.availableSeats - b.availableSeats;
        case "seats-desc":
          return b.availableSeats - a.availableSeats;
        case "id-asc":
          return a.id - b.id;
        case "id-desc":
          return b.id - a.id;
        default:
          return 0;
      }
    });
  }, [events, sortBy]);

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Events</h1>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-[220px]">
              <Label htmlFor="event-sort" className="whitespace-nowrap">Sort by:</Label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger id="event-sort">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-asc">Date (Earliest first)</SelectItem>
                  <SelectItem value="date-desc">Date (Latest first)</SelectItem>
                  <SelectItem value="title-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="title-desc">Name (Z-A)</SelectItem>
                  <SelectItem value="seats-asc">Available Seats (Low to High)</SelectItem>
                  <SelectItem value="seats-desc">Available Seats (High to Low)</SelectItem>
                  <SelectItem value="id-asc">Created (Oldest first)</SelectItem>
                  <SelectItem value="id-desc">Created (Newest first)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setIsCreating(true)} className="whitespace-nowrap">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>
        </div>

        {(isCreating || selectedEvent) && (
          <EventForm 
            event={selectedEvent}
            onClose={() => {
              setSelectedEvent(null);
              setIsCreating(false);
            }}
          />
        )}

        <div className="grid gap-6">
          {sortedEvents.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{event.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(event.date).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => setSelectedEvent(event)}
                  >
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <img 
                      src={event.image} 
                      alt={event.title}
                      className="rounded-lg w-full aspect-video object-cover"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {event.description}
                    </p>
                    <div className="flex justify-between text-sm">
                      <span>Available Seats: {event.availableSeats}</span>
                      <span>Total Seats: {event.totalSeats}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </BackofficeLayout>
  );
}
