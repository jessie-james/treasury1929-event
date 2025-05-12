import { useState, useRef, useEffect } from "react";
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

// Define seats with their exact positions
interface SeatData {
  id: string;
  tableId: number;
  seatNumber: number;
  x: number; 
  y: number;
}

// Define all seats
const MEZZANINE_SEATS: SeatData[] = [
  // Table 1 (top right)
  { id: "1-1", tableId: 1, seatNumber: 1, x: 952, y: 284 }, // Top green circle
  { id: "1-2", tableId: 1, seatNumber: 2, x: 968, y: 314 }, // Right green circle
  { id: "1-3", tableId: 1, seatNumber: 3, x: 954, y: 347 }, // Bottom green circle
  
  // Table 2 (right bottom)
  { id: "2-1", tableId: 2, seatNumber: 1, x: 854, y: 402 }, // Right green circle
  { id: "2-2", tableId: 2, seatNumber: 2, x: 815, y: 402 }, // Left green circle
  
  // Table 3 (middle right)
  { id: "3-1", tableId: 3, seatNumber: 1, x: 694, y: 402 }, // Right green circle
  { id: "3-2", tableId: 3, seatNumber: 2, x: 654, y: 402 }, // Left green circle
  
  // Table 4 (middle left)
  { id: "4-1", tableId: 4, seatNumber: 1, x: 536, y: 402 }, // Right green circle
  { id: "4-2", tableId: 4, seatNumber: 2, x: 494, y: 402 }, // Left green circle
  
  // Table 5 (far left bottom)
  { id: "5-1", tableId: 5, seatNumber: 1, x: 369, y: 402 }, // Right green circle
  { id: "5-2", tableId: 5, seatNumber: 2, x: 328, y: 402 }, // Left green circle
  
  // Table 6 (far left)
  { id: "6-1", tableId: 6, seatNumber: 1, x: 167, y: 422 }, // Bottom green circle
  { id: "6-2", tableId: 6, seatNumber: 2, x: 139, y: 394 }, // Left green circle
  
  // Table 7 (upper left)
  { id: "7-1", tableId: 7, seatNumber: 1, x: 47, y: 352 },  // Bottom green circle
  { id: "7-2", tableId: 7, seatNumber: 2, x: 32, y: 316 }   // Left green circle
];

export function SeatSelection({ eventId, onComplete, hasExistingBooking }: Props) {
  const [selectedSeats, setSelectedSeats] = useState<SeatData[]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showTooltips, setShowTooltips] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Update image dimensions when it loads
  useEffect(() => {
    const updateDimensions = () => {
      if (imageRef.current) {
        setImageDimensions({
          width: imageRef.current.naturalWidth,
          height: imageRef.current.naturalHeight
        });
      }
    };
    
    if (imageRef.current && imageRef.current.complete) {
      updateDimensions();
    }
    
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
  // Function to toggle seat selection
  const toggleSeat = (seat: SeatData) => {
    const existingIndex = selectedSeats.findIndex(
      s => s.id === seat.id
    );
    
    if (existingIndex >= 0) {
      // Remove seat if already selected
      setSelectedSeats(selectedSeats.filter((_, index) => index !== existingIndex));
    } else {
      // Add seat if not already selected (max 4 seats)
      if (selectedSeats.length < 4) {
        setSelectedSeats([...selectedSeats, seat]);
      }
    }
  };
  
  // Check if a seat is selected
  const isSeatSelected = (seatId: string) => {
    return selectedSeats.some(seat => seat.id === seatId);
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
          <div className="relative w-full">
            <div className="absolute right-4 top-4 flex flex-col gap-2 z-10">
              <Button
                variant="secondary"
                size="icon"
                onClick={zoomIn}
                className="rounded-full w-10 h-10 bg-white shadow-md"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={zoomOut}
                className="rounded-full w-10 h-10 bg-white shadow-md"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
            </div>
            <div 
              className="relative w-full"
              style={{ 
                transform: `scale(${zoomLevel})`, 
                transformOrigin: 'center top',
                transition: 'transform 0.2s ease-in-out'
              }}
            >
              {/* Floor Plan Background Image */}
              <div className="relative">
                <img 
                  ref={imageRef}
                  src={imageError ? "https://raw.githubusercontent.com/users/10/attached_assets/Mezzanine%20(numbered)%20PNG.png" : "/images/mezzanine-floor.png"}
                  alt="Mezzanine Floor Plan" 
                  className="w-full h-auto object-contain"
                  onError={() => setImageError(true)}
                  onLoad={() => {
                    if (imageRef.current) {
                      setImageDimensions({
                        width: imageRef.current.naturalWidth,
                        height: imageRef.current.naturalHeight
                      });
                    }
                  }}
                />
                
                {/* Transparent buttons at each seat location */}
                <TooltipProvider>
                  {MEZZANINE_SEATS.map((seat) => (
                    <Tooltip key={seat.id}>
                      <TooltipTrigger asChild>
                        <button
                          className={`absolute translate-x-[-50%] translate-y-[-50%] rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold transition-all duration-200 ${
                            isSeatSelected(seat.id)
                              ? 'bg-blue-500 text-white ring-2 ring-blue-200 scale-110'
                              : 'text-transparent hover:scale-110 hover:bg-green-500/30'
                          }`}
                          style={{
                            left: `${seat.x}px`,
                            top: `${seat.y}px`
                          }}
                          onClick={() => toggleSeat(seat)}
                        >
                          {isSeatSelected(seat.id) ? seat.seatNumber : ''}
                        </button>
                      </TooltipTrigger>
                      {showTooltips && (
                        <TooltipContent side="top">
                          <p>Table {seat.tableId}, Seat {seat.seatNumber}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
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