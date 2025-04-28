import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { IframeSeatSelection } from "@/components/booking/IframeSeatSelection";
import { FoodSelection } from "@/components/booking/FoodSelection";
import { CheckoutForm } from "@/components/booking/CheckoutForm";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import type { Booking } from "@shared/schema";

type Step = "seats" | "food" | "checkout";

interface SeatSelectionData {
  tableId: number;
  seatNumbers: number[];
}

export default function BookingPage() {
  const params = useParams<{ id: string }>();
  const [_, setLocation] = useLocation();
  const eventId = parseInt(params.id);

  const [step, setStep] = useState<Step>("seats");
  const [selectedSeats, setSelectedSeats] = useState<SeatSelectionData | null>(null);
  const [foodSelections, setFoodSelections] = useState<Record<string, number>[]>([]);
  const [guestNames, setGuestNames] = useState<Record<number, string>>({});

  const { data: existingBookings } = useQuery<Booking[]>({
    queryKey: ["/api/user/bookings"],
  });

  const hasExistingBooking = existingBookings?.some(booking => booking.eventId === eventId);

  const progress =
    step === "seats" ? 33 : step === "food" ? 66 : 100;

  return (
    <div className="container py-8 space-y-6">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">
            {step === "seats" 
              ? "Select Your Seats" 
              : step === "food" 
                ? "Choose Food & Drinks" 
                : "Complete Your Booking"
            }
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {step === "seats"
              ? "Pick the best seats for your experience" 
              : step === "food" 
                ? "Customize your dining experience for each guest" 
                : "Review and finalize your booking details"
            }
          </p>
        </div>
        
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-center text-sm text-muted-foreground">
            Step {step === "seats" ? "1" : step === "food" ? "2" : "3"} of 3
          </p>
        </div>
      </div>

      <Card className="max-w-4xl mx-auto">
        <div className="p-6">
          {step === "seats" && (
            <IframeSeatSelection
              eventId={eventId}
              hasExistingBooking={hasExistingBooking}
              onComplete={(selection) => {
                setSelectedSeats(selection);
                setStep("food");
              }}
            />
          )}

          {step === "food" && selectedSeats && (
            <FoodSelection
              eventId={eventId}
              selectedSeats={selectedSeats.seatNumbers}
              onComplete={(selections, names) => {
                setFoodSelections(selections);
                setGuestNames(names);
                setStep("checkout");
              }}
            />
          )}

          {step === "checkout" && selectedSeats && (
            <CheckoutForm
              eventId={eventId}
              tableId={selectedSeats.tableId}
              selectedSeats={selectedSeats.seatNumbers}
              foodSelections={foodSelections}
              guestNames={guestNames}
              onSuccess={() => {
                // Use a short timeout to allow the query invalidation to complete
                setTimeout(() => {
                  setLocation("/dashboard");
                }, 300);
              }}
            />
          )}
        </div>
      </Card>
    </div>
  );
}