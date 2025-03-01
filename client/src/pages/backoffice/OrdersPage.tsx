
import { useQuery } from "@tanstack/react-query";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventFoodTotals } from "@/components/backoffice/EventFoodTotals";
import { type Event, type Booking } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

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
      name: "Events with Orders",
      value: events?.filter(e => e.availableSeats < e.totalSeats).length || 0,
    },
  ];

  // Prepare data for the chart
  const chartData = events?.map(event => ({
    name: event.title,
    value: event.totalSeats - event.availableSeats,
  })) || [];

  // Colors for the chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <BackofficeLayout>
      <div className="space-y-6 pb-8">
        <h1 className="text-3xl font-bold">Orders Dashboard</h1>

        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {foodStats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-muted-foreground">{stat.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Orders Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Orders Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} orders`, 'Orders']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Events Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Food Orders by Event</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={events?.[0]?.id.toString() || "1"}>
              <TabsList className="mb-4 w-full h-auto flex-wrap">
                {events?.map((event) => (
                  <TabsTrigger key={event.id} value={event.id.toString()} className="flex-grow">
                    {event.title}
                    <Badge variant="outline" className="ml-2">
                      {event.totalSeats - event.availableSeats}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>

              {events?.map((event) => (
                <TabsContent key={event.id} value={event.id.toString()}>
                  <div className="flex flex-col lg:flex-row items-start gap-4">
                    <div className="flex-1">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">{event.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">Date</dt>
                              <dd>{format(new Date(event.date), 'PPP')}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">Time</dt>
                              <dd>{format(new Date(event.date), 'p')}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">Total Seats</dt>
                              <dd>{event.totalSeats}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">Bookings</dt>
                              <dd>{event.totalSeats - event.availableSeats}</dd>
                            </div>
                            <div className="md:col-span-2">
                              <dt className="text-sm font-medium text-muted-foreground">Event Description</dt>
                              <dd className="mt-1">{event.description}</dd>
                            </div>
                          </dl>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="w-full lg:w-[450px]">
                      <EventFoodTotals eventId={event.id} />
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </BackofficeLayout>
  );
}
