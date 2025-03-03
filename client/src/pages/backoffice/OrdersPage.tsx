import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { EventFoodTotals } from "@/components/backoffice/EventFoodTotals";
import { type Event, type Booking } from "@shared/schema";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function OrdersPage() {
  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: bookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  // Calculate totals for each food category
  const foodStats = [
    {
      name: "Total Events",
      value: events?.length || 0,
    },
    {
      name: "Total Orders",
      value: bookings?.length || 0,
    },
    {
      name: "Active Events",
      value: events?.filter(e => e.availableSeats < e.totalSeats).length || 0,
    },
  ];

  return (
    <BackofficeLayout>
      <div className="space-y-8">
        <h1 className="text-4xl font-bold">Food & Drink Orders</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {foodStats.map((stat) => (
            <Card key={stat.name} className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">
                  {stat.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Orders By Event</h2>
          <div className="grid gap-6">
            {events?.map((event) => (
              <Card key={event.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="details" className="border-none">
                      <AccordionTrigger className="py-0 [&[data-state=open]>div]:pb-4">
                        <div className="flex flex-col lg:flex-row gap-6 w-full">
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="text-2xl font-bold mb-2">{event.title}</h3>
                                <p className="text-lg text-muted-foreground">
                                  {new Date(event.date).toLocaleDateString(undefined, {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-3xl font-bold text-primary">
                                  {event.totalSeats - event.availableSeats}
                                  <span className="text-lg font-normal text-muted-foreground ml-2">orders</span>
                                </p>
                                <p className="text-lg text-muted-foreground">
                                  out of {event.totalSeats} total seats
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                          <div className="space-y-8">
                            {['salad', 'entree', 'dessert', 'wine'].map((type) => (
                              <div key={type} className="space-y-4">
                                <h4 className="text-xl font-semibold capitalize border-b pb-2">{type} Selections</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                  <EventFoodTotals 
                                    eventId={event.id} 
                                    type={type}
                                    className="text-3xl font-bold text-primary" 
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {foodStats.map((stat) => (
            <Card key={stat.name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {events?.map((event) => (
            <Card key={event.id} className="overflow-hidden">
              <CardHeader className="bg-secondary/50">
                <CardTitle>{event.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {new Date(event.date).toLocaleDateString()}
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <EventFoodTotals eventId={event.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </BackofficeLayout>
  );
}