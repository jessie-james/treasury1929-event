import { useQuery, useMutation } from "@tanstack/react-query";

interface TableValidationProps {
  tableId: number;
  eventId: number;
  holdStartTime?: Date;
}

interface ValidationResponse {
  valid: boolean;
  message: string;
  code?: string;
}

export function useTableValidation() {
  return useMutation<ValidationResponse, Error, TableValidationProps>({
    mutationFn: async ({ tableId, eventId, holdStartTime }) => {
      const response = await fetch("/api/validate-table", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          tableId,
          eventId,
          holdStartTime: holdStartTime?.toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Validation failed");
      }

      return response.json();
    },
  });
}

export function useTicketCutoffCheck(eventId: number) {
  return useQuery({
    queryKey: [`/api/events/${eventId}/ticket-cutoff`],
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

export function useBookingTimer(holdStartTime: Date | null, onExpired: () => void) {
  const HOLD_DURATION_MS = 20 * 60 * 1000; // 20 minutes

  return useQuery({
    queryKey: ['booking-timer', holdStartTime?.getTime()],
    queryFn: () => {
      if (!holdStartTime) return null;
      
      const now = new Date();
      const elapsed = now.getTime() - holdStartTime.getTime();
      const remaining = Math.max(0, HOLD_DURATION_MS - elapsed);
      
      if (remaining === 0) {
        onExpired();
      }
      
      return {
        remaining,
        expired: remaining === 0,
        startTime: holdStartTime
      };
    },
    enabled: !!holdStartTime,
    refetchInterval: 1000, // Update every second
    refetchIntervalInBackground: true,
  });
}