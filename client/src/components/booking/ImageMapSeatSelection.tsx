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

// Define seats with their exact coordinates for the image map
interface SeatPosition {
  id: string;
  tableId: number;
  seatNumber: number;
  coords: string;
}

// Define all seats with coordinates for image map
const MEZZANINE_SEATS: SeatPosition[] = [
  // Table 1 (top right)
  { id: "1-1", tableId: 1, seatNumber: 1, coords: "952,284,12" }, // Top green circle
  { id: "1-2", tableId: 1, seatNumber: 2, coords: "968,314,12" }, // Right green circle
  { id: "1-3", tableId: 1, seatNumber: 3, coords: "954,347,12" }, // Bottom green circle
  
  // Table 2 (right bottom)
  { id: "2-1", tableId: 2, seatNumber: 1, coords: "854,402,12" }, // Right green circle
  { id: "2-2", tableId: 2, seatNumber: 2, coords: "815,402,12" }, // Left green circle
  
  // Table 3 (middle right)
  { id: "3-1", tableId: 3, seatNumber: 1, coords: "694,402,12" }, // Right green circle
  { id: "3-2", tableId: 3, seatNumber: 2, coords: "654,402,12" }, // Left green circle
  
  // Table 4 (middle left)
  { id: "4-1", tableId: 4, seatNumber: 1, coords: "536,402,12" }, // Right green circle
  { id: "4-2", tableId: 4, seatNumber: 2, coords: "494,402,12" }, // Left green circle
  
  // Table 5 (far left bottom)
  { id: "5-1", tableId: 5, seatNumber: 1, coords: "369,402,12" }, // Right green circle
  { id: "5-2", tableId: 5, seatNumber: 2, coords: "328,402,12" }, // Left green circle
  
  // Table 6 (far left)
  { id: "6-1", tableId: 6, seatNumber: 1, coords: "167,422,12" }, // Bottom green circle
  { id: "6-2", tableId: 6, seatNumber: 2, coords: "139,394,12" }, // Left green circle
  
  // Table 7 (upper left)
  { id: "7-1", tableId: 7, seatNumber: 1, coords: "47,352,12" },  // Bottom green circle
  { id: "7-2", tableId: 7, seatNumber: 2, coords: "32,316,12" }   // Left green circle
];

export function ImageMapSeatSelection({ eventId, onComplete, hasExistingBooking }: Props) {
  const [selectedSeats, setSelectedSeats] = useState<{tableId: number, seatNumber: number}[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showTooltips, setShowTooltips] = useState<boolean>(true);
  const mapRef = useRef<HTMLMapElement>(null);
  
  // Get table capacity based on table ID (hardcoded for current layout)
  const getTableCapacity = (tableId: number): number => {
    // Based on the current layout:
    // Table 1: 3 seats (capacity 3)
    // Tables 2-7: 2 seats each (capacity 2)
    if (tableId === 1) return 3;
    return 2;
  };

  // Check if selection is valid for a table
  const isValidTableSelection = (tableId: number, currentSeats: {tableId: number, seatNumber: number}[], newSeat?: {tableId: number, seatNumber: number}): { valid: boolean, reason?: string } => {
    const tableCapacity = getTableCapacity(tableId);
    const seatsOnTable = currentSeats.filter(s => s.tableId === tableId);
    const totalSeatsOnTable = newSeat ? seatsOnTable.length + 1 : seatsOnTable.length;
    
    // For 4-seat tables (none in current layout, but future-proofing)
    if (tableCapacity === 4) {
      if (totalSeatsOnTable === 2) {
        return { valid: false, reason: "You cannot select only 2 seats on a 4-seat table. Please select 1, 3, or 4 seats." };
      }
    }
    
    return { valid: true };
  };

  // Function to toggle seat selection
  const toggleSeat = (seat: SeatPosition) => {
    const existingIndex = selectedSeats.findIndex(
      s => s.tableId === seat.tableId && s.seatNumber === seat.seatNumber
    );
    
    if (existingIndex >= 0) {
      // Remove seat if already selected
      const newSelected = [...selectedSeats];
      newSelected.splice(existingIndex, 1);
      setSelectedSeats(newSelected);
      
      // Update selected IDs
      const newIds = new Set(selectedIds);
      newIds.delete(seat.id);
      setSelectedIds(newIds);
    } else {
      // Add seat if not already selected (max 4 seats)
      if (selectedSeats.length < 4) {
        // Check if this selection would be valid
        const validation = isValidTableSelection(seat.tableId, selectedSeats, { tableId: seat.tableId, seatNumber: seat.seatNumber });
        if (validation.valid) {
          setSelectedSeats([...selectedSeats, { tableId: seat.tableId, seatNumber: seat.seatNumber }]);
          
          // Update selected IDs
          const newIds = new Set(selectedIds);
          newIds.add(seat.id);
          setSelectedIds(newIds);
        }
      }
    }
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
      return `Table ${tableId}: Seat${seatNumbers.length > 1 ? 's' : ''} ${seatNumbers.sort().join(', ')}`;
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
    
    // For 4-seat tables with 3 selected seats, add empty seat info
    const tableCapacity = getTableCapacity(firstTableId);
    let emptySeats: number[] = [];
    
    if (tableCapacity === 4 && seatNumbers.length === 3) {
      // Find which seat number is missing (1, 2, 3, or 4)
      const allSeats = [1, 2, 3, 4];
      emptySeats = allSeats.filter(seatNum => !seatNumbers.includes(seatNum));
    }
    
    return { 
      tableId: firstTableId, 
      seatNumbers,
      emptySeats: emptySeats.length > 0 ? emptySeats : undefined,
      hasEmptySeats: emptySeats.length > 0
    };
  };
  
  // Generate the markers for selected seats
  const renderSelectedMarkers = () => {
    return Array.from(selectedIds).map(id => {
      const seat = MEZZANINE_SEATS.find(s => s.id === id);
      if (!seat) return null;
      
      // Extract x,y coordinates from the coords string (formatted as "x,y,radius")
      const [x, y] = seat.coords.split(',').map(Number);
      
      return (
        <div 
          key={id}
          className="absolute rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center border-2 border-blue-200"
          style={{
            width: '20px',
            height: '20px',
            left: `${x}px`,
            top: `${y}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10
          }}
        >
          {seat.seatNumber}
        </div>
      );
    });
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
        
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Click on green circles to select up to 4 seats (max 4 per booking)</p>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <h4 className="font-medium text-blue-900 mb-1">Table Selection Rules:</h4>
            <ul className="text-blue-800 space-y-1">
              <li>• For 4-seat tables: You cannot select only 2 seats</li>
              <li>• If selecting 3 seats on a 4-seat table, the 4th seat will remain empty for your group</li>
              <li>• 2-seat and 3-seat tables can be fully or partially selected</li>
            </ul>
          </div>
        </div>
        
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
          <div 
            className="relative overflow-auto"
            style={{ 
              transform: `scale(${zoomLevel})`, 
              transformOrigin: 'center top',
              transition: 'transform 0.2s ease-in-out'
            }}
          >
            {/* Overlay for selected seat markers */}
            <div className="relative">
              {/* Floor Plan with Image Map */}
              <div dangerouslySetInnerHTML={{ 
                __html: `
                  <img 
                    src="https://raw.githubusercontent.com/users/10/attached_assets/Mezzanine%20(numbered)%20PNG.png" 
                    alt="Mezzanine Floor Plan" 
                    className="w-full max-w-full"
                    usemap="#seat-map"
                  />
                  <map name="seat-map" id="seat-map">
                    ${MEZZANINE_SEATS.map(seat => 
                      `<area 
                        shape="circle" 
                        coords="${seat.coords}" 
                        alt="Table ${seat.tableId}, Seat ${seat.seatNumber}" 
                        href="#" 
                        data-id="${seat.id}"
                        data-table="${seat.tableId}"
                        data-seat="${seat.seatNumber}"
                        onclick="window.handleSeatClick('${seat.id}', ${seat.tableId}, ${seat.seatNumber}); return false;"
                      />`
                    ).join('')}
                  </map>
                `
              }} />
              
              {/* Selected seat markers */}
              {renderSelectedMarkers()}
            </div>
          </div>
          
          {/* Add this script to handle the image map clicks */}
          <div dangerouslySetInnerHTML={{
            __html: `
              <script>
                window.handleSeatClick = function(id, tableId, seatNumber) {
                  // This function will be called from the image map
                  // We'll dispatch a custom event to be handled by React
                  const event = new CustomEvent('seat-click', {
                    detail: { id, tableId, seatNumber }
                  });
                  document.dispatchEvent(event);
                };
              </script>
            `
          }} />
          
          {/* Selection Summary */}
          {selectedSeats.length > 0 && (
            <div className="mt-4 p-3 bg-slate-50 rounded-md">
              <h3 className="font-medium mb-1">Selected Seats:</h3>
              <p className="text-sm">{formatSelectedSeats()}</p>
              {(() => {
                const submission = getGroupedSeatsForSubmission();
                if (submission?.hasEmptySeats && submission.emptySeats) {
                  return (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                      <p className="text-yellow-800">
                        <strong>Note:</strong> Seat {submission.emptySeats.join(', ')} will remain empty and reserved for your group.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Event listener for the custom seat-click event */}
      <div style={{ display: 'none' }}>
        {useEffect(() => {
          const handleSeatClick = (event: any) => {
            const { id, tableId, seatNumber } = event.detail;
            const seat = MEZZANINE_SEATS.find(s => s.id === id);
            if (seat) {
              toggleSeat(seat);
            }
          };
          
          document.addEventListener('seat-click', handleSeatClick);
          return () => {
            document.removeEventListener('seat-click', handleSeatClick);
          };
        }, [selectedSeats])}
      </div>
    </div>
  );
}