import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { type Event, type Booking } from "@shared/schema";

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  
  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: bookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const handleBackToHome = () => {
    setLocation('/');
  };

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
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBackToHome}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>

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
      </div>
    </BackofficeLayout>
  );
}