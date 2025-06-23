import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, AlertTriangle } from "lucide-react";

interface BookingTimerProps {
  startTime: Date;
  onTimeout: () => void;
  durationMinutes?: number;
}

export function BookingTimer({ startTime, onTimeout, durationMinutes = 20 }: BookingTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
      const remaining = Math.max(0, endTime.getTime() - now.getTime());
      
      if (remaining === 0 && !isExpired) {
        setIsExpired(true);
        onTimeout();
      }
      
      return remaining;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, onTimeout, durationMinutes, isExpired]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isWarning = timeLeft <= 5 * 60 * 1000; // Warning when 5 minutes or less
  const isCritical = timeLeft <= 2 * 60 * 1000; // Critical when 2 minutes or less

  if (isExpired) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Your table reservation has expired. Please start over to select a new table.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant={isCritical ? "destructive" : isWarning ? "default" : "default"}>
      <Clock className="h-4 w-4" />
      <AlertDescription>
        <span className="font-medium">
          {isCritical ? "Urgent: " : isWarning ? "Warning: " : ""}
          Table hold expires in {formatTime(timeLeft)}
        </span>
        <br />
        <span className="text-sm">
          Complete your booking before the timer expires to secure your table.
        </span>
      </AlertDescription>
    </Alert>
  );
}