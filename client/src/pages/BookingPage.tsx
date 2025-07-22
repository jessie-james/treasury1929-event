import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { IframeSeatSelection } from "@/components/booking/IframeSeatSelection";
import { FoodSelection } from "@/components/booking/FoodSelection";
import { WineSelection } from "@/components/booking/WineSelection";
import { VenueFloorSelection } from "@/components/booking/VenueFloorSelection";
import { CheckoutForm } from "@/components/booking/CheckoutForm";
import { BookingTimer } from "@/components/booking/BookingTimer";
import { useTableValidation, useTicketCutoffCheck } from "@/hooks/useBookingValidation";
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

  // First check event type to determine booking flow
  const { data: event, isLoading: isLoadingEvent } = useQuery({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId,
    retry: false,
    throwOnError: false
  });

  // Only load venue layouts if event type is 'full'
  const { data: venueLayouts, isLoading: isLoadingVenueLayouts, error: venueLayoutsError } = useQuery({
    queryKey: [`/api/events/${eventId}/venue-layouts`],
    enabled: !!eventId && event?.eventType === 'full',
    retry: false,
    throwOnError: false
  });

  console.log('🏛️ Booking flow debug:', { 
    event,
    eventType: event?.eventType,
    venueLayouts, 
    isLoadingEvent,
    isLoadingVenueLayouts, 
    venueLayoutsError, 
    step,
    eventId
  });

  const { data: existingBookings } = useQuery<Booking[]>({
    queryKey: ["/api/user/bookings"],
  });

  const hasExistingBooking = existingBookings?.some(booking => booking.eventId === eventId);

  // Validation hooks
  const tableValidation = useTableValidation();
  const { data: ticketCutoffData } = useTicketCutoffCheck(eventId);

  // Redirect to ticket-only booking if event type is 'ticket-only'
  useEffect(() => {
    if (!isLoadingEvent && event) {
      if (event.eventType === 'ticket-only') {
        console.log('📝 Event is ticket-only type - redirecting to ticket-only booking');
        setLocation(`/events/${eventId}/tickets`);
        return;
      }
    }
  }, [isLoadingEvent, event, eventId, setLocation]);

  const progress =
    step === "venue" ? 20 : 
    step === "seats" ? 40 : 
    step === "food" ? 60 : 
    step === "wine" ? 80 : 100;

  // Show loading state while checking event type
  if (isLoadingEvent || (event?.eventType === 'full' && isLoadingVenueLayouts)) {
    return (
      <div className="container py-8 space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking event configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      {/* Header section with constrained width */}
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
      </div>

      {/* Booking Timer */}
      {holdStartTime && (
        <div className="container mx-auto px-4">
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

      {/* Main content area - Full width for seats step, contained for others */}
      <div className={step === "seats" ? "w-full" : "max-w-4xl mx-auto px-6"}>
          {step === "venue" && (
            <div>
              {venueLayouts && venueLayouts.length > 0 ? (
                <VenueFloorSelection
                  venues={venueLayouts.map((layout, index) => ({
                    id: layout.eventVenueId,
                    displayName: layout.displayName,
                    description: layout.displayName === "Mezzanine" ? "Elevated seating with premium view" : "Main dining area with stage view",
                    tableCount: layout.tables?.length || 0
                  }))}
                  onSelect={(venueDisplayName, venueIndex) => {
                    console.log('🎯 Venue selected:', { venueDisplayName, venueIndex });
                    setSelectedVenue(venueDisplayName);
                    setSelectedVenueIndex(venueIndex);
                    setStep("seats");
                  }}
                />
              ) : (
                <div className="text-center p-8">
                  <p>No venue layouts available or still loading...</p>
                  <p>Loading: {isLoadingVenueLayouts ? 'Yes' : 'No'}</p>
                  <p>Error: {venueLayoutsError?.message || 'None'}</p>
                </div>
              )}
            </div>
          )}

          {step === "seats" && selectedVenue && (
            <IframeSeatSelection
              eventId={eventId}
              hasExistingBooking={hasExistingBooking}
              selectedVenueIndex={selectedVenueIndex}
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
    </div>
  );
}