import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ZoomContainer } from "@/components/ui/ZoomContainer";
import { ZoomControls, FloatingZoomControls } from "@/components/ui/ZoomControls";

interface Props {
  eventId: number;
  onComplete: (selection: { tableId: number; seatNumbers: number[] }) => void;
  hasExistingBooking?: boolean;
}

// Simple seat data structure
interface SeatData {
  id: number;
  tableId: number;
  seatNumber: number;
}

export function StyledSeatSelection({ eventId, onComplete, hasExistingBooking }: Props) {
  const [selectedSeats, setSelectedSeats] = useState<SeatData[]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  
  // Toggle seat selection
  const toggleSeat = (seat: SeatData) => {
    const index = selectedSeats.findIndex(
      s => s.tableId === seat.tableId && s.seatNumber === seat.seatNumber
    );
    
    if (index >= 0) {
      // Remove seat if already selected
      setSelectedSeats(selectedSeats.filter((_, i) => i !== index));
    } else if (selectedSeats.length < 4) {
      // Add seat if not already selected (max 4)
      setSelectedSeats([...selectedSeats, seat]);
    }
  };
  
  // Check if a seat is selected
  const isSeatSelected = (tableId: number, seatNumber: number) => {
    return selectedSeats.some(
      s => s.tableId === tableId && s.seatNumber === seatNumber
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
      return `Table ${tableId}: Seat${seatNumbers.length > 1 ? 's' : ''} ${seatNumbers.sort().join(', ')}`;
    }).join('; ');
  };
  
  // Handle zoom in/out
  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 0.2, 2));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 0.2, 0.6));
  
  // Prepare data for submission
  const getGroupedSeatsForSubmission = () => {
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
            className="overflow-auto flex justify-center"
            style={{ 
              transform: `scale(${zoomLevel})`, 
              transformOrigin: 'center top',
              transition: 'transform 0.2s ease-in-out'
            }}
          >
            <div className="relative">
              {/* Base image */}
              <img 
                src="https://raw.githubusercontent.com/users/10/attached_assets/Mezzanine%20(numbered)%20PNG.png" 
                alt="Mezzanine Floor Plan" 
                className="max-w-full"
              />
              
              {/* Direct positioning of buttons with absolute positioning */}
              {/* Table 1 Seats */}
              <Button
                className={`absolute rounded-full w-5 h-5 p-0 flex items-center justify-center text-[10px] font-bold ${
                  isSeatSelected(1, 1) ? 'bg-blue-500 text-white' : 'bg-green-500 bg-opacity-90 text-white'
                }`}
                style={{ left: '932px', top: '280px', transform: 'translate(-50%, -50%)' }}
                onClick={() => toggleSeat({ id: 1, tableId: 1, seatNumber: 1 })}
              >
                {isSeatSelected(1, 1) ? '1' : ''}
              </Button>
              <Button
                className={`absolute rounded-full w-5 h-5 p-0 flex items-center justify-center text-[10px] font-bold ${
                  isSeatSelected(1, 2) ? 'bg-blue-500 text-white' : 'bg-green-500 bg-opacity-90 text-white'
                }`}
                style={{ left: '946px', top: '304px', transform: 'translate(-50%, -50%)' }}
                onClick={() => toggleSeat({ id: 2, tableId: 1, seatNumber: 2 })}
              >
                {isSeatSelected(1, 2) ? '2' : ''}
              </Button>
              <Button
                className={`absolute rounded-full w-5 h-5 p-0 flex items-center justify-center text-[10px] font-bold ${
                  isSeatSelected(1, 3) ? 'bg-blue-500 text-white' : 'bg-green-500 bg-opacity-90 text-white'
                }`}
                style={{ left: '933px', top: '341px', transform: 'translate(-50%, -50%)' }}
                onClick={() => toggleSeat({ id: 3, tableId: 1, seatNumber: 3 })}
              >
                {isSeatSelected(1, 3) ? '3' : ''}
              </Button>
              
              {/* Table 2 Seats */}
              <Button
                className={`absolute rounded-full w-5 h-5 p-0 flex items-center justify-center text-[10px] font-bold ${
                  isSeatSelected(2, 1) ? 'bg-blue-500 text-white' : 'bg-green-500 bg-opacity-80 text-white'
                }`}
                style={{ left: '854px', top: '402px', transform: 'translate(-50%, -50%)' }}
                onClick={() => toggleSeat({ id: 4, tableId: 2, seatNumber: 1 })}
              >
                {isSeatSelected(2, 1) ? '1' : ''}
              </Button>
              <Button
                className={`absolute rounded-full w-5 h-5 p-0 flex items-center justify-center text-[10px] font-bold ${
                  isSeatSelected(2, 2) ? 'bg-blue-500 text-white' : 'bg-green-500 bg-opacity-80 text-white'
                }`}
                style={{ left: '815px', top: '402px', transform: 'translate(-50%, -50%)' }}
                onClick={() => toggleSeat({ id: 5, tableId: 2, seatNumber: 2 })}
              >
                {isSeatSelected(2, 2) ? '2' : ''}
              </Button>
              
              {/* Table 3 Seats */}
              <Button
                className={`absolute rounded-full w-5 h-5 p-0 flex items-center justify-center text-[10px] font-bold ${
                  isSeatSelected(3, 1) ? 'bg-blue-500 text-white' : 'bg-green-500 bg-opacity-80 text-white'
                }`}
                style={{ left: '694px', top: '402px', transform: 'translate(-50%, -50%)' }}
                onClick={() => toggleSeat({ id: 6, tableId: 3, seatNumber: 1 })}
              >
                {isSeatSelected(3, 1) ? '1' : ''}
              </Button>
              <Button
                className={`absolute rounded-full w-5 h-5 p-0 flex items-center justify-center text-[10px] font-bold ${
                  isSeatSelected(3, 2) ? 'bg-blue-500 text-white' : 'bg-green-500 bg-opacity-80 text-white'
                }`}
                style={{ left: '654px', top: '402px', transform: 'translate(-50%, -50%)' }}
                onClick={() => toggleSeat({ id: 7, tableId: 3, seatNumber: 2 })}
              >
                {isSeatSelected(3, 2) ? '2' : ''}
              </Button>
              
              {/* Table 4 Seats */}
              <Button
                className={`absolute rounded-full w-5 h-5 p-0 flex items-center justify-center text-[10px] font-bold ${
                  isSeatSelected(4, 1) ? 'bg-blue-500 text-white' : 'bg-green-500 bg-opacity-80 text-white'
                }`}
                style={{ left: '536px', top: '402px', transform: 'translate(-50%, -50%)' }}
                onClick={() => toggleSeat({ id: 8, tableId: 4, seatNumber: 1 })}
              >
                {isSeatSelected(4, 1) ? '1' : ''}
              </Button>
              <Button
                className={`absolute rounded-full w-5 h-5 p-0 flex items-center justify-center text-[10px] font-bold ${
                  isSeatSelected(4, 2) ? 'bg-blue-500 text-white' : 'bg-green-500 bg-opacity-80 text-white'
                }`}
                style={{ left: '494px', top: '402px', transform: 'translate(-50%, -50%)' }}
                onClick={() => toggleSeat({ id: 9, tableId: 4, seatNumber: 2 })}
              >
                {isSeatSelected(4, 2) ? '2' : ''}
              </Button>
              
              {/* Table 5 Seats */}
              <Button
                className={`absolute rounded-full w-5 h-5 p-0 flex items-center justify-center text-[10px] font-bold ${
                  isSeatSelected(5, 1) ? 'bg-blue-500 text-white' : 'bg-green-500 bg-opacity-80 text-white'
                }`}
                style={{ left: '369px', top: '402px', transform: 'translate(-50%, -50%)' }}
                onClick={() => toggleSeat({ id: 10, tableId: 5, seatNumber: 1 })}
              >
                {isSeatSelected(5, 1) ? '1' : ''}
              </Button>
              <Button
                className={`absolute rounded-full w-5 h-5 p-0 flex items-center justify-center text-[10px] font-bold ${
                  isSeatSelected(5, 2) ? 'bg-blue-500 text-white' : 'bg-green-500 bg-opacity-80 text-white'
                }`}
                style={{ left: '328px', top: '402px', transform: 'translate(-50%, -50%)' }}
                onClick={() => toggleSeat({ id: 11, tableId: 5, seatNumber: 2 })}
              >
                {isSeatSelected(5, 2) ? '2' : ''}
              </Button>
              
              {/* Table 6 Seats */}
              <Button
                className={`absolute rounded-full w-5 h-5 p-0 flex items-center justify-center text-[10px] font-bold ${
                  isSeatSelected(6, 1) ? 'bg-blue-500 text-white' : 'bg-green-500 bg-opacity-80 text-white'
                }`}
                style={{ left: '167px', top: '422px', transform: 'translate(-50%, -50%)' }}
                onClick={() => toggleSeat({ id: 12, tableId: 6, seatNumber: 1 })}
              >
                {isSeatSelected(6, 1) ? '1' : ''}
              </Button>
              <Button
                className={`absolute rounded-full w-5 h-5 p-0 flex items-center justify-center text-[10px] font-bold ${
                  isSeatSelected(6, 2) ? 'bg-blue-500 text-white' : 'bg-green-500 bg-opacity-80 text-white'
                }`}
                style={{ left: '139px', top: '394px', transform: 'translate(-50%, -50%)' }}
                onClick={() => toggleSeat({ id: 13, tableId: 6, seatNumber: 2 })}
              >
                {isSeatSelected(6, 2) ? '2' : ''}
              </Button>
              
              {/* Table 7 Seats */}
              <Button
                className={`absolute rounded-full w-5 h-5 p-0 flex items-center justify-center text-[10px] font-bold ${
                  isSeatSelected(7, 1) ? 'bg-blue-500 text-white' : 'bg-green-500 bg-opacity-80 text-white'
                }`}
                style={{ left: '47px', top: '352px', transform: 'translate(-50%, -50%)' }}
                onClick={() => toggleSeat({ id: 14, tableId: 7, seatNumber: 1 })}
              >
                {isSeatSelected(7, 1) ? '1' : ''}
              </Button>
              <Button
                className={`absolute rounded-full w-5 h-5 p-0 flex items-center justify-center text-[10px] font-bold ${
                  isSeatSelected(7, 2) ? 'bg-blue-500 text-white' : 'bg-green-500 bg-opacity-80 text-white'
                }`}
                style={{ left: '32px', top: '316px', transform: 'translate(-50%, -50%)' }}
                onClick={() => toggleSeat({ id: 15, tableId: 7, seatNumber: 2 })}
              >
                {isSeatSelected(7, 2) ? '2' : ''}
              </Button>
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