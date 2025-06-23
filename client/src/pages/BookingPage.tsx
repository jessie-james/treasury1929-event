import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { IframeSeatSelection } from "@/components/booking/IframeSeatSelection";
import { FoodSelection } from "@/components/booking/FoodSelection";
import { WineSelection } from "@/components/booking/WineSelection";
import { VenueFloorSelection } from "@/components/booking/VenueFloorSelection";
import { CheckoutForm } from "@/components/booking/CheckoutForm";
import { BookingTimer } from "@/components/booking/BookingTimer";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import type { Booking } from "@shared/schema";

type Step = "venue" | "seats" | "food" | "wine" | "checkout";

interface SeatSelectionData {
  tableId: number;
  seatNumbers: number[];
}

export default function BookingPage() {
  const params = useParams<{ id: string }>();
  const [_, setLocation] = useLocation();
  const eventId = parseInt(params.id);

  const [step, setStep] = useState<Step>("venue");
  const [selectedVenue, setSelectedVenue] = useState<string>("");
  const [selectedVenueIndex, setSelectedVenueIndex] = useState<number>(0);
  const [selectedSeats, setSelectedSeats] = useState<SeatSelectionData | null>(null);
  const [foodSelections, setFoodSelections] = useState<Record<string, number>[]>([]);
  const [wineSelections, setWineSelections] = useState<any[]>([]);
  const [guestNames, setGuestNames] = useState<Record<number, string>>({});
  const [holdStartTime, setHoldStartTime] = useState<Date | null>(null);

  const { data: existingBookings } = useQuery<Booking[]>({
    queryKey: ["/api/user/bookings"],
  });

  const hasExistingBooking = existingBookings?.some(booking => booking.eventId === eventId);

  const progress =
    step === "venue" ? 20 : 
    step === "seats" ? 40 : 
    step === "food" ? 60 : 
    step === "wine" ? 80 : 100;

  return (
    <div className="container py-8 space-y-6">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">
            {step === "venue" 
              ? "Select Floor Level" 
              : step === "seats" 
                ? "Select Your Seats" 
                : step === "food" 
                  ? "Choose Food Options" 
                  : step === "wine"
                    ? "Select Wine & Beverages"
                    : "Complete Your Booking"
            }
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {step === "venue"
              ? "Choose your preferred seating area"
              : step === "seats"
              ? "Pick the best seats for your experience" 
              : step === "food" 
                ? "Customize your dining experience for each guest"
                : step === "wine"
                  ? "Add wine and beverages to your order"
                  : "Review and finalize your booking details"
            }
          </p>
        </div>
        
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-center text-sm text-muted-foreground">
            Step {step === "venue" ? "1" : step === "seats" ? "2" : step === "food" ? "3" : step === "wine" ? "4" : "5"} of 5
          </p>
        </div>
      </div>

      {/* Booking Timer */}
      {holdStartTime && (
        <div className="max-w-4xl mx-auto">
          <BookingTimer
            startTime={holdStartTime}
            onTimeout={() => {
              setStep("venue");
              setSelectedSeats(null);
              setHoldStartTime(null);
              setSelectedVenue("");
            }}
          />
        </div>
      )}

      <Card className="max-w-4xl mx-auto">
        <div className="p-6">
          {step === "venue" && (
            <VenueFloorSelection
              venues={[
                { id: 1, displayName: "Main Floor", description: "Main dining area with stage view", tableCount: 70 },
                { id: 2, displayName: "Mezzanine", description: "Elevated seating with premium view", tableCount: 13 }
              ]}
              onSelect={(venueDisplayName, venueIndex) => {
                setSelectedVenue(venueDisplayName);
                setSelectedVenueIndex(venueIndex);
                setStep("seats");
              }}
            />
          )}

          {step === "seats" && selectedVenue && (
            <IframeSeatSelection
              eventId={eventId}
              hasExistingBooking={hasExistingBooking}
              onComplete={(selection) => {
                setSelectedSeats(selection);
                setHoldStartTime(new Date()); // Start the 20-minute timer
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
                setStep("wine");
              }}
            />
          )}

          {step === "wine" && (
            <WineSelection
              eventId={eventId}
              onComplete={(selections) => {
                setWineSelections(selections);
                setStep("checkout");
              }}
              onSkip={() => {
                setWineSelections([]);
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
              wineSelections={wineSelections}
              guestNames={guestNames}
              selectedVenue={selectedVenue}
              onSuccess={() => {
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