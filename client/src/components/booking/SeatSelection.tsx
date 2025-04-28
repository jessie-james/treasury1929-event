import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { type Table, type Seat } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, User2 } from "lucide-react";
import { FloorPlan } from "./FloorPlan";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  eventId: number;
  onComplete: (selection: { tableId: number; seatNumbers: number[] }) => void;
  hasExistingBooking?: boolean;
}

interface SeatWithAvailability extends Seat {
  isAvailable: boolean;
}

export function SeatSelection({ eventId, onComplete, hasExistingBooking }: Props) {
  const isMobile = useIsMobile();
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<Array<{ tableId: number; seatNumber: number }>>([]);

  const handleTableSelect = (tableId: number) => {
    setSelectedTable(tableId);
  };

  const handleSeatToggle = (tableId: number, seatNumber: number, isAvailable: boolean) => {
    if (!isAvailable) return;
    
    const existingSeatIndex = selectedSeats.findIndex(
      s => s.tableId === tableId && s.seatNumber === seatNumber
    );

    if (existingSeatIndex >= 0) {
      setSelectedSeats(selectedSeats.filter((_, i) => i !== existingSeatIndex));
    } else {
      if (selectedSeats.length >= 4) {
        toast({
          title: "Maximum seats reached",
          description: "You can only select up to 4 seats",
          variant: "destructive"
        });
        return;
      }

      // Check if selecting from a different table
      if (selectedSeats.length > 0 && selectedSeats[0].tableId !== tableId) {
        toast({
          title: "Select seats from one table",
          description: "Please select seats from the same table",
          variant: "destructive"
        });
        return;
      }

      setSelectedSeats([...selectedSeats, { tableId, seatNumber }]);
    }
  };
  
  // Get the selected seat numbers for the currently selected table
  const selectedSeatNumbers = selectedTable 
    ? selectedSeats
        .filter(seat => seat.tableId === selectedTable)
        .map(seat => seat.seatNumber)
    : [];

  return (
    <div className="space-y-6">
      {/* Header with progress */}
      <div className="space-y-2">
        {hasExistingBooking && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Existing Booking</AlertTitle>
            <AlertDescription className="text-yellow-700">
              You already have tickets for this event. Additional bookings will be separate from your existing reservation.
            </AlertDescription>
          </Alert>
        )}
        <div className={cn(
          "flex items-center", 
          isMobile ? "flex-col space-y-4" : "justify-between"
        )}>
          <h2 className="text-2xl font-bold">Select Your Seats</h2>
          <Button
            onClick={() => {
              if (selectedSeats.length === 0) return;
              const tableId = selectedSeats[0].tableId;
              const seatNumbers = selectedSeats.map(s => s.seatNumber).sort((a, b) => a - b);
              onComplete({ tableId, seatNumbers });
            }}
            disabled={selectedSeats.length === 0}
            className={isMobile ? "w-full" : ""}
          >
            Continue to Guest Details
          </Button>
        </div>
        <p className="text-muted-foreground">
          Choose up to 4 seats from a single table. The seats are numbered to match the floor plan.
        </p>
        <div className="flex items-center space-x-2 text-sm font-medium text-primary">
          <User2 className="h-4 w-4" />
          <span>{selectedSeats.length} seats selected</span>
        </div>
      </div>

      {/* Floor plan */}
      <div className="px-1">
        <FloorPlan 
          eventId={eventId}
          selectedTable={selectedTable}
          selectedSeats={selectedSeatNumbers}
          onTableSelect={handleTableSelect}
          onSeatSelect={handleSeatToggle}
        />
      </div>
      
      {/* Selected Seats Summary */}
      {selectedSeats.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg mb-2">Selected Seats</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {selectedSeats.map((seat, index) => (
                <div 
                  key={`${seat.tableId}-${seat.seatNumber}`}
                  className="p-2 rounded-md bg-primary/10 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-primary text-white font-medium">
                      {seat.seatNumber}
                    </div>
                    <span className="font-medium">Table {seat.tableId}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 rounded-full" 
                    onClick={() => handleSeatToggle(seat.tableId, seat.seatNumber, true)}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}