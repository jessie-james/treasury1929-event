import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  eventId: number;
  onComplete: (selection: { tableId: number; seatNumbers: number[] }) => void;
  hasExistingBooking?: boolean;
}

interface SeatData {
  key: string;
  tableId: number;
  seatNumber: number;
}

export function IframeSeatSelection({ eventId, onComplete, hasExistingBooking }: Props) {
  const [selectedSeats, setSelectedSeats] = useState<SeatData[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Listen for messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'SEAT_SELECTION') {
        setSelectedSeats(event.data.selection);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  // Format selected seats for display
  const formatSelectedSeats = () => {
    // Group seats by table
    const byTable: Record<number, number[]> = {};
    
    selectedSeats.forEach(seat => {
      if (!byTable[seat.tableId]) {
        byTable[seat.tableId] = [];
      }
      byTable[seat.tableId].push(seat.seatNumber);
    });
    
    // Format the text
    return Object.entries(byTable).map(([tableId, seatNumbers]) => {
      return `Table ${tableId}: Seat${seatNumbers.length > 1 ? 's' : ''} ${seatNumbers.sort().join(', ')}`;
    }).join('; ');
  };
  
  // Prepare data for submission
  const getGroupedSeatsForSubmission = () => {
    if (selectedSeats.length === 0) return null;
    
    // For the current simplified implementation, we're just taking the first table
    const firstTableId = selectedSeats[0].tableId;
    const seatNumbers = selectedSeats
      .filter(seat => seat.tableId === firstTableId)
      .map(seat => seat.seatNumber);
    
    return { tableId: firstTableId, seatNumbers };
  };
  
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
          <h2 className="text-2xl font-bold">Select Your Seats</h2>
          <Button
            onClick={() => {
              const submission = getGroupedSeatsForSubmission();
              if (submission) {
                onComplete(submission);
              }
            }}
            disabled={selectedSeats.length === 0}
          >
            Continue to Guest Details
          </Button>
        </div>
        
        <p className="text-muted-foreground">
          Click on green circles to select up to 4 seats (max 4 per booking)
        </p>
        
        <div className="flex items-center justify-end">
          <Badge variant="secondary" className="text-xs">
            {selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'} selected
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 relative">
          <div className="overflow-auto">
            {/* Use an iframe to load the seat selection HTML */}
            <iframe
              ref={iframeRef}
              src="/exact-mezzanine-seats.html"
              className="w-full border-none overflow-auto"
              title="Mezzanine Seating"
              style={{ minHeight: '600px', height: '600px', overflow: 'auto' }}
            />
          </div>
          
          {/* Selection Summary */}
          {selectedSeats.length > 0 && (
            <div className="mt-4 p-3 bg-slate-50 rounded-md">
              <h3 className="font-medium mb-1">Selected Seats:</h3>
              <p className="text-sm">{formatSelectedSeats()}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}