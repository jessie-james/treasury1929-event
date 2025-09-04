import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { ExtendedBooking } from "@shared/schema";
import { formatPhoenixDate } from "@/lib/timezone";

interface Props {
  userId: number;
}

export function UserProfile({ userId }: Props) {
  const { data: bookings } = useQuery<ExtendedBooking[]>({
    queryKey: [`/api/user/${userId}/bookings`],
  });

  // Calculate statistics
  const totalBookings = bookings?.length || 0;
  const totalSeats = bookings?.reduce((sum, booking) => sum + booking.seatNumbers.length, 0) || 0;
  const upcomingEvents = bookings?.filter(
    booking => new Date(booking.event.date) > new Date()
  ).length || 0;

  const stats = [
    {
      name: "Total Bookings",
      value: totalBookings,
    },
    {
      name: "Seats Booked",
      value: totalSeats,
    },
    {
      name: "Upcoming Events",
      value: upcomingEvents,
    },
  ];

  // Get unique special requirements and allergens
  const specialRequests = bookings?.find(b => b.specialRequests)?.specialRequests;
  const allergens = bookings?.find(b => b.allergens)?.allergens;

  return (
    <div className="space-y-4 sm:space-y-6 pt-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg font-medium">
                {stat.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Special Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl font-bold">Special Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">Dietary Preferences</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                {specialRequests || "No special dietary requirements"}
              </p>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">Allergens</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                {allergens || "No allergens reported"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl font-bold">Bookings History</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] sm:h-[400px]">
            <div className="space-y-6">
              {bookings?.map((booking) => (
                <div key={booking.id} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold">{booking.event.title}</h3>
                      <p className="text-sm sm:text-base text-muted-foreground">
                        {formatPhoenixDate(booking.event.date)}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm sm:text-base font-medium">
                        Table {booking.tableId}, Seats: {booking.seatNumbers.join(", ")}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Food Selections</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                      {booking.foodItems.map((item) => (
                        <div key={item.id} className="text-sm">
                          <span className="text-muted-foreground">{item.type}:</span>{" "}
                          <span className="font-medium">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />
                </div>
              ))}

              {!bookings?.length && (
                <p className="text-center text-sm sm:text-base text-muted-foreground py-4">
                  No bookings found
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}