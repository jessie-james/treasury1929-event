import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { type Booking, type Event, type FoodOption } from "@shared/schema";
import { format } from "date-fns";
import { Link } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Ticket, Info, Check, RefreshCw, DollarSign, Ban, QrCode } from "lucide-react";
import { FoodIconSet, Allergen, DietaryRestriction } from "@/components/ui/food-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { TicketQRCode } from "@/components/booking/TicketQRCode";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type EnrichedBooking = Booking & {
  event: Event;
  foodItems: FoodOption[];
  guestNames?: { [seatNumber: number]: string }; // Added guestNames property
};

export default function CustomerDashboard() {
  const { data: bookings } = useQuery<EnrichedBooking[]>({
    queryKey: ["/api/user/bookings"],
  });

  // Function to return appropriate status badge with icon
  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    switch (status) {
      case "confirmed":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
            <Check className="w-3 h-3" />
            Confirmed
          </Badge>
        );
      case "modified":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Modified
          </Badge>
        );
      case "refunded":
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            Refunded
          </Badge>
        );
      case "canceled":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 flex items-center gap-1">
            <Ban className="w-3 h-3" />
            Canceled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };
  
  const getFoodItemByType = (booking: EnrichedBooking, seatNumber: number, type: string) => {
    // Handle different formats of food selections data
    let foodSelection;
    const seatIndex = booking.seatNumbers.indexOf(seatNumber);
    
    // If it's an array format (one selection per seat)
    if (Array.isArray(booking.foodSelections)) {
      // Use the index of the seat in the seatNumbers array
      if (seatIndex !== -1 && seatIndex < booking.foodSelections.length) {
        foodSelection = booking.foodSelections[seatIndex];
      }
    } else {
      // Handle object format mapping seat numbers to food selections
      const seatSelections = booking.foodSelections as any;
      // Try direct access with seatNumber as string key first (common format)
      if (seatSelections[seatNumber]) {
        foodSelection = seatSelections[seatNumber];
      } else if (seatIndex !== -1 && seatSelections[seatIndex]) {
        // Try using the index as fallback
        foodSelection = seatSelections[seatIndex];
      } else {
        // As last resort, try to find the selection by any available method
        foodSelection = seatSelections;
      }
    }
    
    if (!foodSelection) return null;

    const itemId = foodSelection[type];
    if (!itemId) return null;
    
    return booking.foodItems.find(item => item.id === itemId);
  };

  // State to track which booking's QR code is being shown
  const [expandedQRCode, setExpandedQRCode] = useState<number | null>(null);
  
  const toggleQRCode = (bookingId: number) => {
    if (expandedQRCode === bookingId) {
      setExpandedQRCode(null);
    } else {
      setExpandedQRCode(bookingId);
    }
  };
  
  // Sort bookings by newest first (based on createdAt timestamp)
  const sortedBookings = bookings ? 
    [...bookings].sort((a, b) => {
      // Safe comparison that handles null/undefined created dates (fallback to current time)
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date();
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date();
      return dateB.getTime() - dateA.getTime();
    }) : 
    [];

  return (
    <div>
      <div className="container py-8 space-y-6">
        <h1 className="text-3xl font-bold">My Tickets</h1>

        <div className="space-y-4">
          {sortedBookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Link href={`/events/${booking.eventId}`}>
                          <h3 className="text-lg font-semibold hover:underline cursor-pointer">
                            {booking.event.title}
                          </h3>
                        </Link>
                        {getStatusBadge(booking.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(booking.event.date), "PPP 'at' p")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Booked on {format(new Date(booking.createdAt!), "PPP")}
                      </p>
                      {booking.lastModified && (
                        <p className="text-sm text-muted-foreground">
                          Last updated: {format(new Date(booking.lastModified), "PPP")}
                        </p>
                      )}
                      
                      {/* Show QR Code Button */}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2 flex items-center gap-1"
                        onClick={() => toggleQRCode(booking.id)}
                      >
                        <QrCode className="h-4 w-4" />
                        {expandedQRCode === booking.id ? "Hide Ticket QR Code" : "Show Ticket QR Code"}
                      </Button>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Table {booking.tableId}</p>
                      <p className="text-sm text-muted-foreground">
                        Seat{booking.seatNumbers.length > 1 ? 's' : ''} #{booking.seatNumbers.join(', #')}
                      </p>
                    </div>
                  </div>
                  
                  {/* QR Code Section */}
                  {expandedQRCode === booking.id && (
                    <div className="my-4 p-4 border rounded-md bg-slate-50" id={`ticket-container-${booking.id}`}>
                      <div className="text-center mb-4">
                        <h4 className="text-xl font-semibold">{booking.event.title}</h4>
                        <p className="text-sm mt-1">{format(new Date(booking.event.date), "PPP 'at' p")}</p>
                        <div className="mt-3 flex justify-center items-center gap-2">
                          <span className="text-sm font-medium">Table {booking.tableId}</span>
                          <span className="text-xs px-2 py-1 bg-gray-200 rounded-full">
                            Seat{booking.seatNumbers.length > 1 ? 's' : ''} #{booking.seatNumbers.join(', #')}
                          </span>
                          {getStatusBadge(booking.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-3">
                          Present this QR code at the venue entrance to check in
                        </p>
                      </div>
                      <TicketQRCode 
                        bookingId={booking.id} 
                        eventTitle={booking.event.title}
                        eventDate={booking.event.date}
                        containerSelector={`#ticket-container-${booking.id}`}
                        tableId={booking.tableId}
                        seatNumbers={booking.seatNumbers}
                        status={booking.status}
                      />
                    </div>
                  )}

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
                                  {foodItem && foodItem.allergens && foodItem.allergens.length > 0 && (
                                    <div className="space-y-1">
                                      <p className="text-xs text-muted-foreground font-medium mb-1">Allergens:</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {(foodItem.allergens as Allergen[]).map((allergen) => (
                                          <span 
                                            key={allergen} 
                                            className="inline-flex items-center bg-red-50 text-red-700 rounded-md px-2 py-1 text-xs font-medium"
                                          >
                                            {allergen.charAt(0).toUpperCase() + allergen.slice(1).replace('_', ' ')}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
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

          {!sortedBookings.length && (
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