import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ZoomIn, ZoomOut, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  eventId: number;
  onComplete: (selection: { tableId: number; seatNumbers: number[] }) => void;
  hasExistingBooking?: boolean;
}

// Define the table layout for the mezzanine
// Each table has a table number, coordinates for positioning, and seats with their positions
interface TablePosition {
  id: number;
  tableNumber: number;
  x: number;
  y: number;
  seats: SeatPosition[];
}

interface SeatPosition {
  seatNumber: number;
  x: number;
  y: number;
}

// Define all tables and their seat positions
const MEZZANINE_TABLES: TablePosition[] = [
  // Table 1 (right top)
  {
    id: 1,
    tableNumber: 1,
    x: 940,
    y: 320,
    seats: [
      { seatNumber: 1, x: 950, y: 285 },  // Top seat (1)
      { seatNumber: 2, x: 970, y: 315 },  // Right seat (2)
      { seatNumber: 3, x: 950, y: 350 },  // Bottom seat (3)
    ]
  },
  // Table 2 (right bottom)
  {
    id: 2,
    tableNumber: 2,
    x: 830,
    y: 390,
    seats: [
      { seatNumber: 1, x: 855, y: 400 },  // Right seat (1)
      { seatNumber: 2, x: 815, y: 400 }   // Left seat (2)
    ]
  },
  // Table 3 (middle right)
  {
    id: 3,
    tableNumber: 3,
    x: 670,
    y: 390,
    seats: [
      { seatNumber: 1, x: 695, y: 400 },  // Right seat (1)
      { seatNumber: 2, x: 655, y: 400 }   // Left seat (2)
    ]
  },
  // Table 4 (middle left)
  {
    id: 4,
    tableNumber: 4,
    x: 515,
    y: 390,
    seats: [
      { seatNumber: 1, x: 540, y: 400 },  // Right seat (1)
      { seatNumber: 2, x: 495, y: 400 }   // Left seat (2)
    ]
  },
  // Table 5 (far left bottom)
  {
    id: 5,
    tableNumber: 5,
    x: 350,
    y: 390,
    seats: [
      { seatNumber: 1, x: 375, y: 400 },  // Right seat (1)
      { seatNumber: 2, x: 330, y: 400 }   // Left seat (2)
    ]
  },
  // Table 6 (far left)
  {
    id: 6,
    tableNumber: 6,
    x: 160,
    y: 395,
    seats: [
      { seatNumber: 1, x: 170, y: 425 },  // Bottom seat (1)
      { seatNumber: 2, x: 138, y: 395 }   // Left seat (2)
    ]
  },
  // Table 7 (upper left)
  {
    id: 7,
    tableNumber: 7,
    x: 60,
    y: 325,
    seats: [
      { seatNumber: 1, x: 45, y: 350 },   // Bottom seat (1)
      { seatNumber: 2, x: 30, y: 320 }    // Left seat (2)
    ]
  }
];

export function SeatSelection({ eventId, onComplete, hasExistingBooking }: Props) {
  const [selectedSeats, setSelectedSeats] = useState<{tableId: number, seatNumber: number}[]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showTooltips, setShowTooltips] = useState<boolean>(true);
  
  // Function to toggle seat selection
  const toggleSeat = (tableId: number, seatNumber: number) => {
    const seatKey = `${tableId}-${seatNumber}`;
    const existingIndex = selectedSeats.findIndex(
      seat => seat.tableId === tableId && seat.seatNumber === seatNumber
    );
    
    if (existingIndex >= 0) {
      // Remove seat if already selected
      setSelectedSeats(selectedSeats.filter((_, index) => index !== existingIndex));
    } else {
      // Add seat if not already selected (max 4 seats)
      if (selectedSeats.length < 4) {
        setSelectedSeats([...selectedSeats, { tableId, seatNumber }]);
      }
    }
  };
  
  // Check if a seat is selected
  const isSeatSelected = (tableId: number, seatNumber: number) => {
    return selectedSeats.some(seat => 
      seat.tableId === tableId && seat.seatNumber === seatNumber
    );
  };
  
  // Create an organized structure by table for display
  const getSelectedSeatsByTable = () => {
    const byTable: Record<number, number[]> = {};
    
    selectedSeats.forEach(seat => {
      if (!byTable[seat.tableId]) {
        byTable[seat.tableId] = [];
      }
      byTable[seat.tableId].push(seat.seatNumber);
    });
    
    return byTable;
  };
  
  // Format selected seats for display
  const formatSelectedSeats = () => {
    const byTable = getSelectedSeatsByTable();
    
    return Object.entries(byTable).map(([tableId, seatNumbers]) => {
      return `Table ${tableId}: Seat${seatNumbers.length > 1 ? 's' : ''} ${seatNumbers.join(', ')}`;
    }).join('; ');
  };
  
  // Handle zoom in/out
  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 0.2, 2));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 0.2, 0.6));
  
  // Group selected seats by table for submission
  const getGroupedSeatsForSubmission = () => {
    // For simplicity in our current implementation, we're just taking the first table
    // This should be expanded if users can select seats from multiple tables
    if (selectedSeats.length === 0) return null;
    
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
        
        <div className="flex gap-2 items-center mb-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={zoomOut}
            className="rounded-full w-8 h-8"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={zoomIn}
            className="rounded-full w-8 h-8"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowTooltips(!showTooltips)}
            className={`rounded-full w-8 h-8 ${showTooltips ? 'bg-blue-50' : ''}`}
          >
            <Info className={`h-4 w-4 ${showTooltips ? 'text-blue-500' : ''}`} />
          </Button>
          
          <div className="ml-2 text-sm text-muted-foreground">
            <Badge variant="outline">{Math.round(zoomLevel * 100)}%</Badge>
          </div>
          
          <div className="ml-auto">
            <Badge variant="secondary" className="text-xs">
              {selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'} selected
            </Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 relative">
          <div className="overflow-auto relative">
            <div 
              className="relative" 
              style={{ 
                transform: `scale(${zoomLevel})`, 
                transformOrigin: 'center top',
                transition: 'transform 0.2s ease-in-out'
              }}
            >
              {/* Floor Plan Background Image */}
              <img 
                src="/images/mezzanine-floor.png" 
                alt="Mezzanine Floor Plan" 
                className="w-full max-w-full"
              />
              
              {/* Overlay interactive seat buttons on top of the image */}
              <div className="absolute inset-0 pointer-events-none">
                <TooltipProvider>
                  {MEZZANINE_TABLES.map((table) => (
                    // For each table, render all its seats
                    <div key={table.id}>
                      {table.seats.map((seat) => (
                        <Tooltip key={`${table.id}-${seat.seatNumber}`}>
                          <TooltipTrigger asChild>
                            <button
                              className={`absolute rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold pointer-events-auto transition-all duration-200 ${
                                isSeatSelected(table.id, seat.seatNumber)
                                  ? 'bg-blue-500 text-white ring-2 ring-blue-200 scale-110'
                                  : 'bg-green-500 text-white hover:bg-green-600 hover:scale-110'
                              }`}
                              style={{
                                left: `${seat.x}px`,
                                top: `${seat.y}px`,
                                transform: 'translate(-50%, -50%)'
                              }}
                              onClick={() => toggleSeat(table.id, seat.seatNumber)}
                            >
                              {seat.seatNumber}
                            </button>
                          </TooltipTrigger>
                          {showTooltips && (
                            <TooltipContent side="top">
                              <p>Table {table.tableNumber}, Seat {seat.seatNumber}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      ))}
                    </div>
                  ))}
                </TooltipProvider>
              </div>
            </div>
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