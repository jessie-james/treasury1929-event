import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  eventId: number;
  onComplete: (selection: { tableId: number; seatNumbers: number[] }) => void;
  hasExistingBooking?: boolean;
}

export function SeatSelection({ eventId, onComplete, hasExistingBooking }: Props) {
  // Temporary implementation for seat selection
  // This is a simplified version until we rethink the seating approach
  const [numSeats, setNumSeats] = useState<number>(1);
  
  // Fixed values for temporary implementation
  const TEMP_TABLE_ID = 1;
  
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {hasExistingBooking && (
          <Alert variant="destructive" className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Existing Booking</AlertTitle>
            <AlertDescription className="text-yellow-700">
              You already have tickets for this event. Additional bookings will be separate from your existing reservation.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Select Number of Seats</h2>
          <Button
            onClick={() => {
              // Generate seat numbers 1 through numSeats
              const seatNumbers = Array.from({ length: numSeats }, (_, i) => i + 1);
              onComplete({ tableId: TEMP_TABLE_ID, seatNumbers });
            }}
            disabled={numSeats <= 0 || numSeats > 4}
          >
            Continue to Guest Details
          </Button>
        </div>
        
        <p className="text-muted-foreground">
          Choose how many seats you would like to reserve (max 4)
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="num-seats">Number of Seats</Label>
              <Input
                id="num-seats"
                type="number"
                min="1"
                max="4"
                value={numSeats}
                onChange={(e) => setNumSeats(parseInt(e.target.value) || 0)}
              />
              
              {numSeats > 4 && (
                <p className="text-sm text-red-500">Maximum 4 seats allowed per booking</p>
              )}
              
              {numSeats <= 0 && (
                <p className="text-sm text-red-500">Please select at least 1 seat</p>
              )}
            </div>
            
            <div className="py-4">
              <p className="text-center text-sm text-muted-foreground italic">
                Note: The seating system is being redesigned. This is a temporary interface.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}