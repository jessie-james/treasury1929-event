import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { EventFoodTotals } from "@/components/backoffice/EventFoodTotals";
import { type Event, type Booking } from "@shared/schema";

export default function DashboardPage() {
  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: bookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const stats = [
    {
      name: "Total Events",
      value: events?.length || 0,
    },
    {
      name: "Total Bookings",
      value: bookings?.length || 0,
    },
    {
      name: "Available Events",
      value: events?.filter((e) => e.availableSeats > 0).length || 0,
    },
    {
      name: "Sold Out Events",
      value: events?.filter((e) => e.availableSeats === 0).length || 0,
    },
  ];

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
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
          <h2 className="text-xl font-semibold">Events Overview</h2>
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
                          <p className={`font-medium ${
                            event.availableSeats === 0 
                              ? "text-red-500" 
                              : event.availableSeats <= event.totalSeats * 0.2 
                                ? "text-amber-500"
                                : ""
                          }`}>
                            {event.availableSeats === 0 
                              ? "SOLD OUT" 
                              : `${event.availableSeats} seats left`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            out of {event.totalSeats}
                            {event.availableSeats > 0 && event.availableSeats <= event.totalSeats * 0.2 && " (SELLING FAST)"}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {event.description}
                      </p>
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