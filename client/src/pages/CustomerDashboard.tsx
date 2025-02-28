import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { type Booking, type Event, type FoodOption } from "@shared/schema";
import { format } from "date-fns";
import { Header } from "@/components/Header";
import { Link } from "wouter";

type EnrichedBooking = Booking & {
  event: Event;
  foodItems: FoodOption[];
}

export default function CustomerDashboard() {
  const { data: bookings } = useQuery<EnrichedBooking[]>({
    queryKey: ["/api/user/bookings"],
  });

  const getFoodItemByType = (booking: EnrichedBooking, type: string) => {
    const itemId = (booking.foodSelections as any)[type];
    return booking.foodItems.find(item => item.id === itemId);
  };

  return (
    <div>
      <Header />
      <div className="container py-8 space-y-6">
        <h1 className="text-3xl font-bold">My Tickets</h1>

        <div className="space-y-4">
          {bookings?.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link href={`/events/${booking.eventId}`}>
                        <h3 className="text-lg font-semibold hover:underline cursor-pointer">
                          {booking.event.title}
                        </h3>
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(booking.event.date), "PPP 'at' p")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Booked on {format(new Date(booking.createdAt!), "PPP")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Table {booking.tableId}</p>
                      <p className="text-sm text-muted-foreground">
                        Seat{booking.seatNumbers.length > 1 ? 's' : ''} #{booking.seatNumbers.join(', #')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm font-medium">Entree</p>
                      <p className="text-sm text-muted-foreground">
                        {getFoodItemByType(booking, 'entree')?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Dessert</p>
                      <p className="text-sm text-muted-foreground">
                        {getFoodItemByType(booking, 'dessert')?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Wine Selection</p>
                      <p className="text-sm text-muted-foreground">
                        {getFoodItemByType(booking, 'wine')?.name}
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
    </div>
  );
}