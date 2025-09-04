import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, UserX } from "lucide-react";

interface Props {
  selectedTable: {
    id: number;
    tableNumber: number;
    capacity: number;
  };
  onComplete: (selection: { 
    tableId: number; 
    seatNumbers: number[]; 
    emptySeats?: number[];
    hasEmptySeats?: boolean;
  }) => void;
  onBack: () => void;
}

interface SeatState {
  seatNumber: number;
  status: 'available' | 'selected' | 'empty';
}

export function IndividualSeatSelection({ selectedTable, onComplete, onBack }: Props) {
  const [seats, setSeats] = useState<SeatState[]>([]);

  // Initialize seats based on table capacity
  useEffect(() => {
    const initialSeats = Array.from({ length: selectedTable.capacity }, (_, i) => ({
      seatNumber: i + 1,
      status: 'available' as const
    }));
    setSeats(initialSeats);
  }, [selectedTable.capacity]);

  // Toggle seat status
  const toggleSeat = (seatNumber: number) => {
    setSeats(prevSeats => {
      return prevSeats.map(seat => {
        if (seat.seatNumber === seatNumber) {
          // Cycle through: available -> selected -> empty -> available
          const nextStatus = seat.status === 'available' ? 'selected' : 
                           seat.status === 'selected' ? 'empty' : 'available';
          return { ...seat, status: nextStatus };
        }
        return seat;
      });
    });
  };

  // Get current selection summary
  const getSelectionSummary = () => {
    const selectedSeats = seats.filter(s => s.status === 'selected').map(s => s.seatNumber);
    const emptySeats = seats.filter(s => s.status === 'empty').map(s => s.seatNumber);
    
    return { selectedSeats, emptySeats };
  };

  // Validate selection
  const validateSelection = () => {
    const { selectedSeats, emptySeats } = getSelectionSummary();
    const totalOccupied = selectedSeats.length + emptySeats.length;
    
    // For 4-seat tables, cannot have exactly 2 occupied seats
    if (selectedTable.capacity === 4 && totalOccupied === 2) {
      return {
        valid: false,
        message: "You cannot select only 2 seats on a 4-seat table. Please select 1, 3, or 4 seats total."
      };
    }
    
    // Must have at least one selected seat
    if (selectedSeats.length === 0) {
      return {
        valid: false,
        message: "Please select at least one seat for a guest."
      };
    }
    
    return { valid: true };
  };

  const handleContinue = () => {
    const validation = validateSelection();
    if (!validation.valid) return;
    
    const { selectedSeats, emptySeats } = getSelectionSummary();
    
    onComplete({
      tableId: selectedTable.id,
      seatNumbers: selectedSeats,
      emptySeats: emptySeats.length > 0 ? emptySeats : undefined,
      hasEmptySeats: emptySeats.length > 0
    });
  };

  const validation = validateSelection();
  const { selectedSeats, emptySeats } = getSelectionSummary();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Configure Your Seats</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack}>
              Back to Table Selection
            </Button>
            <Button
              onClick={handleContinue}
              disabled={!validation.valid}
            >
              Continue to Guest Details
            </Button>
          </div>
        </div>
        
        <p className="text-muted-foreground">
          Table {selectedTable.tableNumber} ({selectedTable.capacity} seats) - Click each seat to set it as occupied by a guest or empty.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <h4 className="font-medium text-blue-900 mb-1">How to select seats:</h4>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• Click once: Select seat for a guest (blue)</li>
            <li>• Click twice: Mark seat as empty/reserved (gray)</li>
            <li>• Click again: Make seat available (white)</li>
            {selectedTable.capacity === 4 && (
              <li>• For 4-seat tables: You cannot have exactly 2 seats total (guests + empty)</li>
            )}
          </ul>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Table {selectedTable.tableNumber}
            <Badge variant="outline">
              {selectedSeats.length} guest{selectedSeats.length !== 1 ? 's' : ''} + {emptySeats.length} empty
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Visual representation of table */}
          <div className="flex flex-col items-center space-y-6">
            {/* Table representation */}
            <div className="relative">
              {selectedTable.capacity === 2 && (
                <div className="flex space-x-8">
                  {seats.map((seat) => (
                    <div key={seat.seatNumber} className="flex flex-col items-center space-y-2">
                      <Button
                        variant={seat.status === 'selected' ? 'default' : seat.status === 'empty' ? 'secondary' : 'outline'}
                        size="lg"
                        className={`w-16 h-16 rounded-full ${
                          seat.status === 'selected' ? 'bg-blue-500 hover:bg-blue-600' :
                          seat.status === 'empty' ? 'bg-gray-400 hover:bg-gray-500' :
                          'hover:bg-gray-100'
                        }`}
                        onClick={() => toggleSeat(seat.seatNumber)}
                      >
                        {seat.status === 'selected' ? <User className="h-6 w-6" /> :
                         seat.status === 'empty' ? <UserX className="h-6 w-6" /> :
                         seat.seatNumber}
                      </Button>
                      <span className="text-sm font-medium">Seat {seat.seatNumber}</span>
                      <span className="text-xs text-muted-foreground">
                        {seat.status === 'selected' ? 'Guest' :
                         seat.status === 'empty' ? 'Empty' : 'Available'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedTable.capacity === 4 && (
                <div className="relative">
                  {/* Table surface */}
                  <div className="w-40 h-40 bg-amber-100 border-4 border-amber-300 rounded-full flex items-center justify-center">
                    <span className="text-amber-800 font-bold">Table {selectedTable.tableNumber}</span>
                  </div>
                  
                  {/* Seats positioned around the table */}
                  {seats.map((seat, index) => {
                    const angle = (index * 90) - 90; // Position seats at 12, 3, 6, 9 o'clock
                    const radius = 110;
                    const x = Math.cos(angle * Math.PI / 180) * radius;
                    const y = Math.sin(angle * Math.PI / 180) * radius;
                    
                    return (
                      <div
                        key={seat.seatNumber}
                        className="absolute flex flex-col items-center space-y-1"
                        style={{
                          left: `calc(50% + ${x}px)`,
                          top: `calc(50% + ${y}px)`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        <Button
                          variant={seat.status === 'selected' ? 'default' : seat.status === 'empty' ? 'secondary' : 'outline'}
                          size="lg"
                          className={`w-14 h-14 rounded-full ${
                            seat.status === 'selected' ? 'bg-blue-500 hover:bg-blue-600' :
                            seat.status === 'empty' ? 'bg-gray-400 hover:bg-gray-500' :
                            'hover:bg-gray-100'
                          }`}
                          onClick={() => toggleSeat(seat.seatNumber)}
                        >
                          {seat.status === 'selected' ? <User className="h-5 w-5" /> :
                           seat.status === 'empty' ? <UserX className="h-5 w-5" /> :
                           seat.seatNumber}
                        </Button>
                        <span className="text-xs font-medium">Seat {seat.seatNumber}</span>
                        <span className="text-xs text-muted-foreground">
                          {seat.status === 'selected' ? 'Guest' :
                           seat.status === 'empty' ? 'Empty' : 'Available'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Legend */}
            <div className="flex space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span>Guest Seat</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                <span>Empty/Reserved</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
                <span>Available</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation message */}
      {!validation.valid && (
        <Alert variant="destructive">
          <AlertDescription>{validation.message}</AlertDescription>
        </Alert>
      )}

      {/* Selection summary */}
      {(selectedSeats.length > 0 || emptySeats.length > 0) && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-2">Selection Summary:</h3>
            <div className="space-y-1 text-sm">
              <p>
                <strong>{selectedSeats.length}</strong> guest seat{selectedSeats.length !== 1 ? 's' : ''}: 
                {selectedSeats.length > 0 ? ` ${selectedSeats.join(', ')}` : ' None'}
              </p>
              {emptySeats.length > 0 && (
                <p>
                  <strong>{emptySeats.length}</strong> empty seat{emptySeats.length !== 1 ? 's' : ''}: {emptySeats.join(', ')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Continue button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={!validation.valid}
        >
          Continue to Guest Details
        </Button>
      </div>
    </div>
  );
}