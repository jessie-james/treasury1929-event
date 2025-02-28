import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { SeatSelection } from "@/components/booking/SeatSelection";
import { FoodSelection } from "@/components/booking/FoodSelection";
import { CheckoutForm } from "@/components/booking/CheckoutForm";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Header } from "@/components/Header";
import { BackButton } from "@/components/ui/back-button"; // Added import

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

  const progress =
    step === "seats" ? 33 : step === "food" ? 66 : 100;

  return (
    <div>
      <Header />
      <div className="container py-8 space-y-6">
        <BackButton /> {/* Added BackButton */}
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-center text-sm text-muted-foreground">
            Step {step === "seats" ? "1" : step === "food" ? "2" : "3"} of 3
          </p>
        </div>

        <Card className="max-w-4xl mx-auto">
          <div className="p-6">
            {step === "seats" && (
              <SeatSelection
                eventId={eventId}
                onComplete={(selection) => {
                  setSelectedSeats(selection);
                  setStep("food");
                }}
              />
            )}

            {step === "food" && selectedSeats && (
              <FoodSelection
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
                onSuccess={() => setLocation("/dashboard")}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}