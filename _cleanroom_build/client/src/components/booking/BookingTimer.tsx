import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertTriangle } from "lucide-react";

interface BookingTimerProps {
  startTime: Date;
  onTimeout: () => void;
}

export function BookingTimer({ startTime, onTimeout }: BookingTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const TOTAL_TIME_MS = 20 * 60 * 1000; // 20 minutes

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const elapsed = now.getTime() - startTime.getTime();
      const remaining = Math.max(0, TOTAL_TIME_MS - elapsed);
      
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        onTimeout();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startTime, onTimeout]);

  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);
  const progressPercentage = (timeRemaining / TOTAL_TIME_MS) * 100;

  const isUrgent = minutes < 5;

  return (
    <Card className={`border-2 ${isUrgent ? 'border-red-500 bg-red-50' : 'border-orange-500 bg-orange-50'}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {isUrgent ? (
            <AlertTriangle className="h-5 w-5 text-red-600" />
          ) : (
            <Clock className="h-5 w-5 text-orange-600" />
          )}
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${isUrgent ? 'text-red-800' : 'text-orange-800'}`}>
                Table Hold Timer
              </span>
              <span className={`text-lg font-bold tabular-nums ${isUrgent ? 'text-red-600' : 'text-orange-600'}`}>
                {minutes}:{seconds.toString().padStart(2, '0')}
              </span>
            </div>
            
            <Progress 
              value={progressPercentage} 
              className={`h-2 ${isUrgent ? '[&>div]:bg-red-500' : '[&>div]:bg-orange-500'}`}
            />
            
            <p className={`text-xs mt-1 ${isUrgent ? 'text-red-700' : 'text-orange-700'}`}>
              {isUrgent 
                ? "⚠️ Complete your booking soon or your table will be released!"
                : "Your table is held. Complete booking within 20 minutes."
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}