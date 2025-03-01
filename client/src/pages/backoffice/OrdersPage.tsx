import { useQuery } from "@tanstack/react-query";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventFoodTotals } from "@/components/backoffice/EventFoodTotals";
import { type Event, type Booking } from "@shared/schema";

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
      name: "Total Bookings",
      value: bookings?.length || 0,
    },
    {
      name: "Events with Food Orders",
      value: events?.filter(e => e.availableSeats < e.totalSeats).length || 0,
    },
  ];

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Orders Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {foodStats.map((stat) => (
            <Card key={stat.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Food Orders by Event</h2>
          <div className="grid gap-6">
            {events?.map((event) => (
              <Card key={event.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{event.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{event.totalSeats - event.availableSeats} orders</p>
                          <p className="text-sm text-muted-foreground">
                            out of {event.totalSeats} total seats
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="lg:w-[400px]">
                      <EventFoodTotals eventId={event.id} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </BackofficeLayout>
  );
}
