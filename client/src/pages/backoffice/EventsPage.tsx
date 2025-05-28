import { useQuery, useMutation } from "@tanstack/react-query";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { Button } from "@/components/ui/button";
import { PlusCircle, CalendarDays, SortAsc, GripVertical, ArrowLeft } from "lucide-react";
import { useState, useMemo } from "react";
import { EventForm } from "@/components/backoffice/EventForm";
import { useLocation } from "wouter";
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
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SortOption = "display-order" | "date-asc" | "date-desc" | "title-asc" | "title-desc" | "seats-asc" | "seats-desc" | "id-asc" | "id-desc";

export default function EventsPage() {
  const [, setLocation] = useLocation();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("display-order");
  const [isReorderMode, setIsReorderMode] = useState(false);
  const { toast } = useToast();

  const handleBackToDashboard = () => {
    setLocation('/backoffice');
  };

  const { data: events, refetch } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });
  
  const updateOrderMutation = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      const res = await apiRequest("POST", "/api/events/order", { orderedIds });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Order updated",
        description: "Event display order has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      refetch(); // Explicitly refetch events data
      
      // Switch back to non-reordering mode and show custom order
      setTimeout(() => {
        setSortBy("display-order"); // Set sort to display custom order
        setIsReorderMode(false);
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update order",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const sortedEvents = useMemo(() => {
    if (!events) return [];
    
    // Create a copy of events to avoid modifying the original data
    const eventsCopy = [...events];
    
    if (isReorderMode) {
      // In reorder mode, always sort by display_order
      return eventsCopy.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }
    
    // Allow user to choose custom sort order, but we'll add a new display_order sort option
    switch (sortBy) {
      case "display-order":
        return eventsCopy.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      case "date-asc":
        return eventsCopy.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      case "date-desc":
        return eventsCopy.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case "title-asc":
        return eventsCopy.sort((a, b) => a.title.localeCompare(b.title));
      case "title-desc":
        return eventsCopy.sort((a, b) => b.title.localeCompare(a.title));
      case "seats-asc":
        return eventsCopy.sort((a, b) => a.availableSeats - b.availableSeats);
      case "seats-desc":
        return eventsCopy.sort((a, b) => b.availableSeats - a.availableSeats);
      case "id-asc":
        return eventsCopy.sort((a, b) => a.id - b.id);
      case "id-desc":
        return eventsCopy.sort((a, b) => b.id - a.id);
      default:
        // Default to display order if no sort is specified
        return eventsCopy.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }
  }, [events, sortBy, isReorderMode]);
  
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !events) return;
    
    const items = Array.from(sortedEvents);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Get the ordered IDs to send to the server
    const orderedIds = items.map(item => item.id);
    
    // Update the order in the database
    updateOrderMutation.mutate(orderedIds);
  };

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Events</h1>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {!isReorderMode ? (
              <>
                <div className="flex items-center gap-2 w-full sm:w-[220px]">
                  <Label htmlFor="event-sort" className="whitespace-nowrap">Sort by:</Label>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                    <SelectTrigger id="event-sort">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="display-order">Custom Order</SelectItem>
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
                <Button 
                  variant="outline" 
                  onClick={() => setIsReorderMode(true)}
                  className="whitespace-nowrap"
                >
                  <GripVertical className="h-4 w-4 mr-2" />
                  Reorder Events
                </Button>
                <Button onClick={() => setIsCreating(true)} className="whitespace-nowrap">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Drag and drop events to change their display order
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setIsReorderMode(false)}
                  className="whitespace-nowrap"
                >
                  Done Reordering
                </Button>
              </>
            )}
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

        {!isReorderMode ? (
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
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span>Available Seats: {event.availableSeats}</span>
                        <span>Total Seats: {event.totalSeats}</span>
                        <span>Available Tables: {event.availableTables}</span>
                        <span>Total Tables: {event.totalTables}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="events">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="grid gap-4"
                >
                  {sortedEvents.map((event, index) => (
                    <Draggable key={event.id} draggableId={String(event.id)} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`rounded-lg border p-4 transition-colors ${
                            snapshot.isDragging ? "border-primary bg-accent" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div {...provided.dragHandleProps} className="cursor-grab">
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div>
                                <h3 className="font-medium">{event.title}</h3>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" />
                                  {new Date(event.date).toLocaleDateString('en-US')}
                                </p>
                              </div>
                            </div>
                            <div className="h-16 w-24 overflow-hidden rounded">
                              <img
                                src={event.image}
                                alt={event.title}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </BackofficeLayout>
  );
}
