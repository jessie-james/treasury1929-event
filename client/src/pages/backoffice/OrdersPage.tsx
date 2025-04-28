import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { EventFoodTotals } from "@/components/backoffice/EventFoodTotals";
import { type Event } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export default function OrdersPage() {
  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  if (eventsLoading) {
    return (
      <BackofficeLayout>
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </BackofficeLayout>
    );
  }

  // Sort events by date (newest first)
  const sortedEvents = [...(events || [])].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Food Selections by Event</h1>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Events</TabsTrigger>
            <TabsTrigger value="active">Active Events</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid grid-cols-1 gap-6">
              {sortedEvents.map((event) => (
                <Card key={event.id} className="overflow-hidden">
                  <CardHeader className="bg-secondary/30">
                    <div className="flex flex-col md:flex-row justify-between">
                      <div>
                        <CardTitle className="text-xl mb-1">{event.title}</CardTitle>
                        <CardDescription>
                          {new Date(event.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </CardDescription>
                      </div>
                      <div className="mt-2 md:mt-0 md:text-right">
                        <span className="font-medium text-sm inline-block bg-primary/10 text-primary px-3 py-1 rounded-full">
                          {event.totalSeats - event.availableSeats} orders / {event.totalSeats} seats
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <EventFoodTotals eventId={event.id} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <div className="grid grid-cols-1 gap-6">
              {sortedEvents
                .filter(event => event.availableSeats < event.totalSeats)
                .map((event) => (
                  <Card key={event.id} className="overflow-hidden">
                    <CardHeader className="bg-secondary/30">
                      <div className="flex flex-col md:flex-row justify-between">
                        <div>
                          <CardTitle className="text-xl mb-1">{event.title}</CardTitle>
                          <CardDescription>
                            {new Date(event.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </CardDescription>
                        </div>
                        <div className="mt-2 md:mt-0 md:text-right">
                          <span className="font-medium text-sm inline-block bg-primary/10 text-primary px-3 py-1 rounded-full">
                            {event.totalSeats - event.availableSeats} orders / {event.totalSeats} seats
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <EventFoodTotals eventId={event.id} />
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </BackofficeLayout>
  );
}