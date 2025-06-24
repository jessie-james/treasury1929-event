import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface Props {
  eventId: number;
  onComplete: (selection: { tableId: number; seatNumbers: number[] }) => void;
  hasExistingBooking?: boolean;
  selectedVenueIndex?: number;
}

interface VenueTable {
  id: number;
  tableNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  shape: string;
  rotation: number;
  status: string;
}

interface EventVenueLayout {
  eventVenueId: number;
  displayName: string;
  displayOrder: number;
  venue: {
    id: number;
    name: string;
    width: number;
    height: number;
  };
  tables: VenueTable[];
  stages: any[];
}

export function SimpleTableSelection({ eventId, onComplete, hasExistingBooking, selectedVenueIndex: propSelectedVenueIndex }: Props) {
  const [selectedVenueIndex, setSelectedVenueIndex] = useState(propSelectedVenueIndex || 0);
  const [selectedTable, setSelectedTable] = useState<VenueTable | null>(null);
  const [desiredGuestCount, setDesiredGuestCount] = useState(2);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch event venue layouts
  const { data: eventVenueLayouts, isLoading: isLoadingVenues } = useQuery({
    queryKey: [`/api/events/${eventId}/venue-layouts`],
    enabled: !!eventId,
    retry: 1
  });

  // Fetch existing bookings
  const { data: existingBookings } = useQuery({
    queryKey: ['/api/event-bookings', eventId],
    enabled: !!eventId,
    retry: 2,
    throwOnError: false
  });

  // Get current venue layout
  const currentVenueLayout = useMemo(() => {
    if (eventVenueLayouts && Array.isArray(eventVenueLayouts) && eventVenueLayouts.length > 0) {
      const safeIndex = Math.max(0, Math.min(selectedVenueIndex, eventVenueLayouts.length - 1));
      return eventVenueLayouts[safeIndex];
    }
    return null;
  }, [eventVenueLayouts, selectedVenueIndex]);

  // Get available tables
  const availableTables = useMemo(() => {
    if (!currentVenueLayout?.tables) return [];
    
    const bookedIds = Array.isArray(existingBookings) ? existingBookings.map((booking: any) => booking.tableId) : [];
    return currentVenueLayout.tables.filter((table: VenueTable) => !bookedIds.includes(table.id));
  }, [currentVenueLayout, existingBookings]);

  // Check if table selection is valid
  const isValidTableSelection = useCallback((table: VenueTable, guestCount: number) => {
    if (guestCount > table.capacity) {
      return { valid: false, reason: `This table seats ${table.capacity} guests maximum. You have ${guestCount} guests.` };
    }
    return { valid: true };
  }, []);

  // Canvas drawing
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentVenueLayout) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = currentVenueLayout.venue.width;
    canvas.height = currentVenueLayout.venue.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stage if exists
    if (currentVenueLayout.stages && currentVenueLayout.stages.length > 0) {
      ctx.fillStyle = '#e9ecef';
      ctx.strokeStyle = '#6c757d';
      ctx.lineWidth = 2;
      
      currentVenueLayout.stages.forEach((stage: any) => {
        ctx.fillRect(stage.x, stage.y, stage.width, stage.height);
        ctx.strokeRect(stage.x, stage.y, stage.width, stage.height);
        
        // Stage label
        ctx.fillStyle = '#495057';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('STAGE', stage.x + stage.width / 2, stage.y + stage.height / 2 + 6);
      });
    }

    // Draw tables
    availableTables.forEach((table: VenueTable) => {
      const isSelected = selectedTable?.id === table.id;
      const validation = isValidTableSelection(table, desiredGuestCount);
      
      ctx.save();
      ctx.translate(table.x + table.width / 2, table.y + table.height / 2);
      ctx.rotate((table.rotation * Math.PI) / 180);

      // Table color based on status
      if (isSelected) {
        ctx.fillStyle = '#28a745';
        ctx.strokeStyle = '#1e7e34';
      } else if (!validation.valid) {
        ctx.fillStyle = '#ffc107';
        ctx.strokeStyle = '#e0a800';
      } else {
        ctx.fillStyle = '#007bff';
        ctx.strokeStyle = '#0056b3';
      }

      ctx.lineWidth = 2;
      
      // Draw table shape
      const radius = Math.min(table.width, table.height) / 2 - 2;
      ctx.beginPath();
      
      if (table.shape === 'half') {
        ctx.arc(0, 0, radius, Math.PI, 2 * Math.PI);
        ctx.closePath();
      } else {
        ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      }
      
      ctx.fill();
      ctx.stroke();

      // Table number
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(table.tableNumber.toString(), 0, -8);
      
      // Capacity
      ctx.font = '10px Arial';
      ctx.fillText(`${table.capacity} seats`, 0, 8);

      ctx.restore();
    });
  }, [currentVenueLayout, availableTables, selectedTable, desiredGuestCount, isValidTableSelection]);

  // Handle canvas click
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !availableTables.length) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find clicked table
    const clickedTable = availableTables.find((table: VenueTable) => {
      const centerX = table.x + table.width / 2;
      const centerY = table.y + table.height / 2;
      const radius = Math.min(table.width, table.height) / 2;
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      return distance <= radius;
    });

    if (clickedTable) {
      const validation = isValidTableSelection(clickedTable, desiredGuestCount);
      if (!validation.valid) {
        alert(validation.reason);
        return;
      }

      setSelectedTable(clickedTable);
      
      // Generate seat numbers and complete selection
      const seatNumbers = Array.from({length: desiredGuestCount}, (_, i) => i + 1);
      onComplete({
        tableId: clickedTable.id,
        seatNumbers: seatNumbers
      });
    }
  }, [availableTables, desiredGuestCount, isValidTableSelection, onComplete]);

  // Draw canvas when data changes
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  if (isLoadingVenues) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading venue layout...</span>
      </div>
    );
  }

  if (!currentVenueLayout) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">No venue layout available for this event.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <h4 className="font-medium text-blue-900 mb-1">Table Selection:</h4>
        <ul className="text-blue-800 space-y-1 text-sm">
          <li>• Choose any table that fits your group size</li>
          <li>• Click a table to immediately proceed to guest details</li>
        </ul>
      </div>

      {/* Venue Selection */}
      {Array.isArray(eventVenueLayouts) && eventVenueLayouts.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="venue-select" className="font-medium">Select Venue:</Label>
              <Select
                value={selectedVenueIndex.toString()}
                onValueChange={(value) => {
                  setSelectedVenueIndex(parseInt(value));
                  setSelectedTable(null);
                }}
              >
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventVenueLayouts.map((layout: EventVenueLayout, index: number) => (
                    <SelectItem key={layout.eventVenueId} value={index.toString()}>
                      {layout.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guest Count Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="guest-count" className="font-medium">Number of Guests:</Label>
            <Select
              value={desiredGuestCount.toString()}
              onValueChange={(value) => {
                setDesiredGuestCount(parseInt(value));
                setSelectedTable(null);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} guest{num !== 1 ? 's' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Canvas */}
      <Card>
        <CardContent className="p-4">
          <div className="text-center mb-4">
            <h3 className="font-semibold text-lg">{currentVenueLayout.displayName}</h3>
            <p className="text-sm text-gray-600">
              {availableTables.length} tables available
            </p>
          </div>
          
          <div className="border rounded-lg overflow-auto bg-white" style={{ maxHeight: '500px' }}>
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="cursor-pointer"
              style={{ display: 'block', maxWidth: '100%' }}
            />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span>Too Small</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>Selected</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}