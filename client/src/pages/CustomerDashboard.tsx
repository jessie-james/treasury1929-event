import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { type Booking } from "@shared/schema";
import { format } from "date-fns";

export default function CustomerDashboard() {
  const { data: bookings } = useQuery<Booking[]>({
    queryKey: ["/api/user/bookings"],
  });

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-3xl font-bold">My Tickets</h1>

      <div className="space-y-4">
        {bookings?.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">Event #{booking.eventId}</h3>
                    <p className="text-sm text-muted-foreground">
                      Booked on {format(new Date(booking.createdAt!), "PPP")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">Table {booking.tableId}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.seatNumbers.length} seats
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div>
                    <p className="text-sm font-medium">Selected Seats</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.seatNumbers.join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Food Selections</p>
                    <p className="text-sm text-muted-foreground">
                      Entree #{(booking.foodSelections as any).entree}, 
                      Dessert #{(booking.foodSelections as any).dessert}, 
                      Wine #{(booking.foodSelections as any).wine}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {!bookings?.length && (
          <p className="text-center text-muted-foreground">
            You haven't made any bookings yet.
          </p>
        )}
      </div>
    </div>
  );
}