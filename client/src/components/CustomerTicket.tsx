import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Booking, Event, FoodOption } from "@shared/schema";

// Define the enriched booking type from CustomerDashboard
type EnrichedBooking = Booking & {
  event: Event;
  foodItems: FoodOption[];
};

interface CustomerTicketProps {
  booking: EnrichedBooking;
}

export function CustomerTicket({ booking }: CustomerTicketProps) {
  // Function to get the food item by its ID
  const getFoodItemById = (id: number) => {
    return booking.foodItems.find(item => item.id === id);
  };

  // Function to get the name of a guest by seat number
  const getGuestName = (seatNumber: number) => {
    const guestNames = booking.guestNames as Record<string, string>;
    return guestNames[seatNumber] || `Guest at Seat #${seatNumber}`;
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{booking.event.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(booking.event.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
          <Badge>Table {booking.tableId}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Seats</h3>
            <div className="flex flex-wrap gap-2">
              {booking.seatNumbers.map((seatNumber) => (
                <Badge key={seatNumber} variant="outline" className="py-1">
                  Seat #{seatNumber}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Food Selections</h3>
            {booking.seatNumbers.map((seatNumber) => {
              // Get the food selections for this seat
              const selections = (booking.foodSelections as Record<string, {
                salad?: number;
                entree?: number;
                dessert?: number;
                wine?: number;
              }>)[seatNumber];

              return (
                <div key={seatNumber} className="mb-3 p-3 border rounded-md">
                  <h4 className="text-sm font-semibold mb-2">
                    {getGuestName(seatNumber)}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selections && (
                      <>
                        <div>
                          <span className="text-muted-foreground">Salad:</span>{" "}
                          {getFoodItemById(selections.salad || 0)?.name || "Not selected"}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Entree:</span>{" "}
                          {getFoodItemById(selections.entree || 0)?.name || "Not selected"}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Dessert:</span>{" "}
                          {getFoodItemById(selections.dessert || 0)?.name || "Not selected"}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Wine:</span>{" "}
                          {getFoodItemById(selections.wine || 0)?.name || "Not selected"}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}