import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import type { Event } from "@shared/schema";

export default function TicketOnlyBookingPage() {
  const params = useParams<{ id: string }>();
  const [_, setLocation] = useLocation();
  const eventId = parseInt(params.id);

  // Check if event exists and is ticket-only
  const { data: event, isLoading: isLoadingEvent } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId,
  });

  // Redirect if not a ticket-only event
  if (event && event.eventType !== "ticket-only") {
    setLocation(`/events/${eventId}/book`);
    return null;
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
      <Card className="max-w-2xl mx-auto">
        <div className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Ticket-only booking functionality is coming soon. Please check back later.
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