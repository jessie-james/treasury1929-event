import { useQuery, useMutation } from "@tanstack/react-query";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { Button } from "@/components/ui/button";
import { PlusCircle, CalendarDays, SortAsc, GripVertical, ArrowLeft, Archive } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Event } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatPhoenixDateShort } from "@/lib/timezone";

type SortOption = "display-order" | "date-asc" | "date-desc" | "title-asc" | "title-desc" | "seats-asc" | "seats-desc" | "id-asc" | "id-desc";

export default function EventsPage() {
  const [, setLocation] = useLocation();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("display-order");
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const { toast } = useToast();

  const handleBackToDashboard = () => {
    setLocation('/backoffice');
  };

  const { data: activeEvents, refetch: refetchActive } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: archivedEvents, refetch: refetchArchived } = useQuery<Event[]>({
    queryKey: ["/api/events/archived"],
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
      queryClient.invalidateQueries({ queryKey: ["/api/events/archived"] });
      refetchActive(); // Explicitly refetch active events data
      refetchArchived(); // Explicitly refetch archived events data
      
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
  
  // Get events for the current tab
  const currentTabEvents = activeTab === "active" ? activeEvents : archivedEvents;
  
  const sortedEvents = useMemo(() => {
    if (!currentTabEvents) return [];
    
    // Create a copy of events to avoid modifying the original data
    const eventsCopy = [...currentTabEvents];
    
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
        return eventsCopy.sort((a, b) => (a.availableSeats || 0) - (b.availableSeats || 0));
      case "seats-desc":
        return eventsCopy.sort((a, b) => (b.availableSeats || 0) - (a.availableSeats || 0));
      case "id-asc":
        return eventsCopy.sort((a, b) => a.id - b.id);
      case "id-desc":
        return eventsCopy.sort((a, b) => b.id - a.id);
      default:
        // Default to display order if no sort is specified
        return eventsCopy.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }
  }, [currentTabEvents, sortBy, isReorderMode]);
  
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !currentTabEvents) return;
    
    const items = Array.from(sortedEvents);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Get the ordered IDs to send to the server
    const orderedIds = items.map(item => item.id);
    
    // Update the order in the database
    updateOrderMutation.mutate(orderedIds);
  };

  const renderEventsContent = () => (
    <div>
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
                      {formatPhoenixDateShort(event.date)}
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
                      src={event.image || ''} 
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
          {sortedEvents.length === 0 && (
            <div className="text-center py-12">
              <Archive className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No {activeTab} events</h3>
              <p className="text-sm text-muted-foreground">
                {activeTab === "active" 
                  ? "Create your first event to get started." 
                  : "No events have been archived yet."
                }
              </p>
            </div>
          )}
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
                                {formatPhoenixDateShort(event.date)}
                              </p>
                            </div>
                          </div>
                          <div className="h-16 w-24 overflow-hidden rounded">
                            <img
                              src={event.image || ''}
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
  );

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBackToDashboard}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Events</h1>
          </div>
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
                  disabled={activeTab === "archived"}
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

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "active" | "archived")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Active Events
              {activeEvents && (
                <span className="ml-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {activeEvents.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Archived Events
              {archivedEvents && (
                <span className="ml-1 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {archivedEvents.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {renderEventsContent()}
          </TabsContent>
          
          <TabsContent value="archived" className="mt-6">
            {renderEventsContent()}
          </TabsContent>
        </Tabs>
      </div>
    </BackofficeLayout>
  );
}