import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { type Booking, type Event, type FoodOption } from "@shared/schema";
import { format } from "date-fns";
import { Header } from "@/components/Header";
import { Link } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Ticket } from "lucide-react";
import { CustomerTicket } from "@/components/CustomerTicket";
import { EmptyState } from "@/components/EmptyState";

type EnrichedBooking = Booking & {
  event: Event;
  foodItems: FoodOption[];
};

// Assumed BackButton component - needs to be defined elsewhere
const BackButton = () => {
  return (
    <Link href="/">
      <button>Back</button>
    </Link>
  );
}


export default function CustomerDashboard() {
  const { data: bookings, isLoading } = useQuery<EnrichedBooking[]>({
    queryKey: ["/api/user/bookings"],
  });

  return (
    <div>
      <Header />
      <div className="container py-8 space-y-6">
        <BackButton />
        <h1 className="text-3xl font-bold">My Tickets</h1>

        {isLoading ? (
          <div className="text-center py-10">Loading your tickets...</div>
        ) : bookings && bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <CustomerTicket key={booking.id} booking={booking} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No tickets found"
            description="You haven't booked any events yet. Browse upcoming events to make a reservation."
            action={{
              label: "Browse Events",
              href: "/"
            }}
          />
        )}
      </div>
    </div>
  );
}