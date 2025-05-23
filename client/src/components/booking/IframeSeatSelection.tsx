import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Props {
  eventId: number;
  onComplete: (selection: { tableId: number; seatNumbers: number[] }) => void;
  hasExistingBooking?: boolean;
}

interface VenueTable {
  id: number;
  tableNumber: number;
  capacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: string;
  status: string;
}

interface TableData {
  tableId: number;
  seatCount: number;
  isSelected: boolean;
}

export function IframeSeatSelection({ eventId, onComplete, hasExistingBooking }: Props) {
  const [selectedTable, setSelectedTable] = useState<VenueTable | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch event details to get venue ID
  const { data: eventData } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/events/${eventId}`);
      if (!response.ok) throw new Error('Failed to fetch event');
      return response.json();
    }
  });

  // Fetch venue layout for the event's venue
  const { data: venueLayout, isLoading: isLoadingLayout } = useQuery({
    queryKey: ['venue-layout', eventData?.venueId],
    queryFn: async () => {
      if (!eventData?.venueId) return null;
      const response = await apiRequest('GET', `/api/admin/venues/${eventData.venueId}/layout`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!eventData?.venueId
  });

  // Fetch existing bookings to filter out booked tables
  const { data: existingBookings } = useQuery({
    queryKey: ['event-bookings', eventId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/events/${eventId}/bookings`);
      if (!response.ok) return [];
      return response.json();
    }
  });
  
  // Listen for messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'TABLE_SELECTION') {
        setSelectedTable(event.data.selection);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  // Filter available tables (not already booked)
  const availableTables = venueLayout?.tables?.filter((table: VenueTable) => {
    const isBooked = existingBookings?.some((booking: any) => booking.tableId === table.id);
    return !isBooked;
  }) || [];

  // Draw the venue layout on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !venueLayout) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match venue
    canvas.width = venueLayout.venue.width;
    canvas.height = venueLayout.venue.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw venue boundaries if they exist
    if (venueLayout.venue.bounds) {
      const bounds = venueLayout.venue.bounds;
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.setLineDash([]);
    }

    // Draw stage
    if (venueLayout.stages?.[0]) {
      const stage = venueLayout.stages[0];
      ctx.fillStyle = '#6B7280';
      ctx.fillRect(stage.x, stage.y, stage.width, stage.height);
      
      // Stage label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('STAGE', stage.x + stage.width / 2, stage.y + stage.height / 2 + 5);
    }

    // Draw tables
    availableTables.forEach((table: VenueTable) => {
      const isSelected = selectedTable?.id === table.id;
      
      // Table fill
      ctx.fillStyle = isSelected ? '#60A5FA' : '#10B981'; // Blue if selected, green if available
      
      if (table.shape === 'full') {
        // Full circle table
        ctx.beginPath();
        ctx.arc(table.x + table.width / 2, table.y + table.height / 2, table.width / 2, 0, 2 * Math.PI);
        ctx.fill();
      } else {
        // Half circle table
        ctx.beginPath();
        ctx.arc(table.x + table.width / 2, table.y + table.height / 2, table.width / 2, 0, Math.PI);
        ctx.fill();
      }

      // Table number
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        table.tableNumber.toString(),
        table.x + table.width / 2,
        table.y + table.height / 2 + 5
      );
    });
  }, [venueLayout, availableTables, selectedTable]);

  // Handle canvas clicks to select tables
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !availableTables.length) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if click is within any table
    for (const table of availableTables) {
      const centerX = table.x + table.width / 2;
      const centerY = table.y + table.height / 2;
      const radius = table.width / 2;
      
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      
      if (distance <= radius) {
        setSelectedTable(table);
        break;
      }
    }
  };
  
  // Format selected table for display
  const formatSelectedTable = () => {
    if (!selectedTable) return "";
    
    const seatText = selectedTable.capacity === 1 ? 'seat' : 'seats';
    return `Table ${selectedTable.tableNumber} (${selectedTable.capacity} ${seatText})`;
  };
  
  // Prepare data for submission
  const getSeatsForSubmission = () => {
    if (!selectedTable) return null;
    
    // Generate all seat numbers for the table (1 to capacity)
    const seatNumbers = Array.from(
      { length: selectedTable.capacity }, 
      (_, index) => index + 1
    );
    
    return { 
      tableId: selectedTable.id, 
      seatNumbers 
    };
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
        
        <Alert className="bg-blue-50 border-blue-200">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Large Party Notice</AlertTitle>
          <AlertDescription className="text-blue-700">
            For parties larger than 4 people, please email us at <span className="font-medium">Info@TheTreasury1929.com</span> to arrange your reservation.
          </AlertDescription>
        </Alert>
        
        <div>
          <p className="text-muted-foreground">
            Select a table to book all seats at that table
          </p>
        </div>
        
        <div className="flex items-center justify-end">
          {selectedTable ? (
            <Badge variant="secondary">
              {formatSelectedTable()}
            </Badge>
          ) : (
            <Badge variant="outline">No table selected</Badge>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4 relative">
          <div className="mb-4">
            <div className="flex justify-between items-center p-2 mb-2 border-b">
              <h3 className="text-lg font-medium">Venue Layout</h3>
              <div className="flex gap-2">
                <Badge variant="outline">
                  {availableTables.length} available tables
                </Badge>
              </div>
            </div>
            <div className="overflow-hidden">
              {/* Canvas-based venue layout */}
              {isLoadingLayout ? (
                <div className="w-full h-96 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">Loading Venue Layout</h3>
                    <p className="text-gray-500">Event ID: {eventId}</p>
                  </div>
                </div>
              ) : venueLayout?.tables?.length > 0 ? (
                <div className="relative w-full h-96 bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    className="cursor-pointer w-full h-full"
                    style={{ display: 'block' }}
                  />
                </div>
              ) : (
                <div className="w-full h-96 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Tables Available</h3>
                    <p className="text-gray-500">This venue hasn't been set up with tables yet</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Selection Summary */}
          {selectedTable && (
            <div className="mt-4 p-3 bg-slate-50 rounded-md">
              <h3 className="font-medium mb-1">Selected Table:</h3>
              <p className="text-sm">{formatSelectedTable()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                You will need to provide guest details for each seat at this table.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Continue button moved to bottom */}
      <div className="flex justify-center mt-6">
        <Button
          size="lg"
          onClick={() => {
            const submission = getSeatsForSubmission();
            if (submission) {
              onComplete(submission);
            }
          }}
          disabled={!selectedTable}
        >
          Continue to Guest Details
        </Button>
      </div>
    </div>
  );
}