import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { TicketOnlyFlow } from "@/components/booking/TicketOnlyFlow";
import { CheckoutForm } from "@/components/booking/CheckoutForm";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { useTicketCutoffCheck } from "@/hooks/useBookingValidation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import type { Event } from "@shared/schema";

type Step = "tickets" | "checkout";

interface TicketData {
  quantity: number;
  guestNames: string[];
  totalAmount: number;
}

export default function TicketOnlyBookingPage() {
  const params = useParams<{ id: string }>();
  const [_, setLocation] = useLocation();
  const eventId = parseInt(params.id);

  const [step, setStep] = useState<Step>("tickets");
  const [ticketData, setTicketData] = useState<TicketData | null>(null);

  // Check if event exists and is ticket-only
  const { data: event, isLoading: isLoadingEvent } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId,
    throwOnError: false
  });

  // Check ticket cutoff
  const { data: cutoffData, error: cutoffError } = useTicketCutoffCheck(eventId);

  const progress = step === "tickets" ? 50 : 100;

  // Redirect if not a ticket-only event
  if (event && event.eventType !== "ticket-only") {
    setLocation(`/events/${eventId}/book`);
    return null;
  }

  // Show cutoff error if tickets are no longer available
  if (cutoffError || (cutoffData && !cutoffData.withinCutoff)) {
    return (
      <div className="container py-8 space-y-6">
        <Card className="max-w-2xl mx-auto">
          <div className="p-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {cutoffData?.message || "Ticket sales have closed for this event."}
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <button
                onClick={() => setLocation("/")}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Browse Other Events
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoadingEvent) {
    return (
      <div className="container py-8">
        <div className="flex justify-center">
          <div className="text-center">Loading event details...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">
            {step === "tickets" ? "Purchase Tickets" : "Complete Your Order"}
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {step === "tickets"
              ? "Select your tickets and provide guest information"
              : "Review and complete your ticket purchase"
            }
          </p>
        </div>
        
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-center text-sm text-muted-foreground">
            Step {step === "tickets" ? "1" : "2"} of 2
          </p>
        </div>
      </div>

      <Card className="max-w-4xl mx-auto">
        <div className="p-6">
          {step === "tickets" && (
            <TicketOnlyFlow
              eventId={eventId}
              onComplete={(data) => {
                setTicketData(data);
                setStep("checkout");
              }}
            />
          )}

          {step === "checkout" && ticketData && (
            <CheckoutForm
              eventId={eventId}
              tableId={0} // No table for ticket-only events
              selectedSeats={Array.from({ length: ticketData.quantity }, (_, i) => i + 1)}
              foodSelections={[]}
              wineSelections={[]}
              guestNames={ticketData.guestNames.reduce((acc, name, index) => {
                acc[index + 1] = name;
                return acc;
              }, {} as Record<number, string>)}
              selectedVenue="General Admission"
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