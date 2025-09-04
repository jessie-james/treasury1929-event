import { Badge } from "@/components/ui/badge";
import { Users, Ticket, Lock } from "lucide-react";

interface EventTypeIndicatorProps {
  eventType: string;
  isPrivate?: boolean;
  className?: string;
}

export function EventTypeIndicator({ eventType, isPrivate, className }: EventTypeIndicatorProps) {
  if (isPrivate) {
    return (
      <Badge variant="secondary" className={className}>
        <Lock className="h-3 w-3 mr-1" />
        Private Event
      </Badge>
    );
  }

  if (eventType === "ticket-only") {
    return (
      <Badge variant="outline" className={className}>
        <Ticket className="h-3 w-3 mr-1" />
        Tickets Only
      </Badge>
    );
  }

  return (
    <Badge variant="default" className={className}>
      <Users className="h-3 w-3 mr-1" />
      Table Service
    </Badge>
  );
}