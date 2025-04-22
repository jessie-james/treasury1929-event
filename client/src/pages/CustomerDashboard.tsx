import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { type Booking, type Event, type FoodOption } from "@shared/schema";
import { format } from "date-fns";
import { Header } from "@/components/Header";
import { Link } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Ticket, Info } from "lucide-react";
import { FoodIconSet, Allergen, DietaryRestriction } from "@/components/ui/food-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type EnrichedBooking = Booking & {
  event: Event;
  foodItems: FoodOption[];
  guestNames?: { [seatNumber: number]: string }; // Added guestNames property
};

export default function CustomerDashboard() {
  const { data: bookings } = useQuery<EnrichedBooking[]>({
    queryKey: ["/api/user/bookings"],
  });

  const getFoodItemByType = (booking: EnrichedBooking, seatNumber: number, type: string) => {
    // Handle both formats of food selections data
    let foodSelection;
    
    // Check if it's an array format (newer bookings)
    if (Array.isArray(booking.foodSelections)) {
      // If seat number is within array bounds
      if (seatNumber <= booking.foodSelections.length) {
        // Array index is 0-based, but seat numbers are 1-based, so subtract 1
        foodSelection = booking.foodSelections[seatNumber - 1];
      }
    } else {
      // For older bookings that use Record<number, Record<string, number>> format
      foodSelection = (booking.foodSelections as Record<number, Record<string, number>>)[seatNumber];
    }
    
    if (!foodSelection) return null;

    const itemId = foodSelection[type];
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

                  <div className="space-y-4 pt-4 border-t">
                    {booking.seatNumbers.map((seatNumber) => (
                      <div key={seatNumber} className="space-y-2">
                        <p className="font-medium">
                          Seat #{seatNumber} - {booking.guestNames ? (typeof booking.guestNames === 'object' ? (booking.guestNames as Record<number, string>)[seatNumber] || 'Guest' : 'Guest') : 'Guest'}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {['salad', 'entree', 'dessert'].map(type => {
                            const foodItem = getFoodItemByType(booking, seatNumber, type);
                            return (
                              <div key={type}>
                                <p className="text-sm font-medium capitalize">{type}</p>
                                <div className="space-y-1">
                                  <p className="text-sm text-muted-foreground">
                                    {foodItem?.name || 'Not selected'}
                                  </p>
                                  {foodItem && (
                                    <FoodIconSet 
                                      allergens={(foodItem.allergens || []) as Allergen[]} 
                                      dietaryRestrictions={(foodItem.dietaryRestrictions || []) as DietaryRestriction[]}
                                      size="sm"
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {!bookings?.length && (
            <Alert>
              <Ticket className="h-4 w-4" />
              <AlertTitle>No tickets yet</AlertTitle>
              <AlertDescription>
                You haven't made any bookings yet.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}