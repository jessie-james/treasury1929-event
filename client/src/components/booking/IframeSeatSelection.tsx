import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

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

export function IframeSeatSelection({ eventId, onComplete, hasExistingBooking }: Props) {
  const [selectedTable, setSelectedTable] = useState<VenueTable | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch venue layout
  const { data: venueLayout, isLoading: isLoadingLayout } = useQuery({
    queryKey: ['/api/venue-layout', eventId],
    queryFn: () => fetch(`/api/venue-layout?eventId=${eventId}`).then(res => res.json()),
    enabled: !!eventId
  });

  // Fetch existing bookings to filter out unavailable tables
  const { data: existingBookings } = useQuery({
    queryKey: ['/api/event-bookings', eventId],
    queryFn: () => fetch(`/api/event-bookings?eventId=${eventId}`).then(res => res.json()),
    enabled: !!eventId
  });

  // Filter available tables (exclude booked ones)
  const availableTables = venueLayout?.tables?.filter((table: VenueTable) => {
    const bookedTableIds = existingBookings?.map(booking => booking.tableId) || [];
    return table.status === 'available' && !bookedTableIds.includes(table.id);
  }) || [];

  // Draw venue on canvas when data loads
  useEffect(() => {
    if (canvasRef.current && venueLayout) {
      drawVenueLayout();
    }
  }, [venueLayout, selectedTable, existingBookings]);

  const drawVenueLayout = () => {
    const canvas = canvasRef.current;
    if (!canvas || !venueLayout) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.log('Drawing venue layout:', venueLayout);
    console.log('Available tables:', availableTables);
    console.log('Tables count:', availableTables?.length);

    // Set canvas size
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    // Clear canvas
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw venue boundaries
    const venue = venueLayout.venue;
    const scaleX = canvas.width / venue.width;
    const scaleY = canvas.height / venue.height;
    const scale = Math.min(scaleX, scaleY) * 0.9;

    const offsetX = (canvas.width - venue.width * scale) / 2;
    const offsetY = (canvas.height - venue.height * scale) / 2;

    // Draw venue outline
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(offsetX, offsetY, venue.width * scale, venue.height * scale);
    ctx.setLineDash([]);

    // Draw stage if exists
    if (venueLayout.stages && venueLayout.stages.length > 0) {
      const stage = venueLayout.stages[0];
      ctx.fillStyle = '#374151';
      ctx.fillRect(
        offsetX + stage.x * scale,
        offsetY + stage.y * scale,
        stage.width * scale,
        stage.height * scale
      );
      
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.max(12, 14 * scale)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(
        'STAGE',
        offsetX + (stage.x + stage.width / 2) * scale,
        offsetY + (stage.y + stage.height / 2) * scale + 5
      );
    }

    // Get booked table IDs
    const bookedTableIds = existingBookings?.map(booking => booking.tableId) || [];

    // Draw tables
    availableTables.forEach((table: VenueTable) => {
      const tableX = offsetX + table.x * scale;
      const tableY = offsetY + table.y * scale;
      const tableWidth = table.width * scale;
      const tableHeight = table.height * scale;

      // Determine table colors
      const isSelected = selectedTable?.id === table.id;
      const isBooked = bookedTableIds.includes(table.id);
      
      if (isBooked) {
        ctx.fillStyle = '#ef4444'; // Red for booked
        ctx.strokeStyle = '#dc2626';
      } else if (isSelected) {
        ctx.fillStyle = '#3b82f6'; // Blue for selected
        ctx.strokeStyle = '#2563eb';
      } else {
        ctx.fillStyle = '#e0e0e0'; // Light gray for available
        ctx.strokeStyle = '#555555';
      }

      // Draw table (circle for round, rectangle for others)
      ctx.lineWidth = 2;
      if (table.shape === 'circle') {
        const radius = Math.min(tableWidth, tableHeight) / 2;
        ctx.beginPath();
        ctx.arc(tableX + tableWidth / 2, tableY + tableHeight / 2, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(tableX, tableY, tableWidth, tableHeight);
        ctx.strokeRect(tableX, tableY, tableWidth, tableHeight);
      }

      // Draw table number
      ctx.fillStyle = isBooked ? '#ffffff' : (isSelected ? '#ffffff' : '#000000');
      ctx.font = `${Math.max(10, 12 * scale)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(
        table.tableNumber.toString(),
        tableX + tableWidth / 2,
        tableY + tableHeight / 2 + 4
      );

      // Draw seats around table
      if (!isBooked) {
        const seatRadius = Math.max(3, 4 * scale);
        const seats = table.capacity;
        const tableRadius = Math.min(tableWidth, tableHeight) / 2;
        
        for (let i = 0; i < seats; i++) {
          const angle = (i / seats) * 2 * Math.PI;
          const seatX = tableX + tableWidth / 2 + Math.cos(angle) * (tableRadius + seatRadius + 2);
          const seatY = tableY + tableHeight / 2 + Math.sin(angle) * (tableRadius + seatRadius + 2);
          
          ctx.fillStyle = '#4CAF50'; // Green for seats
          ctx.strokeStyle = '#2E7D32';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(seatX, seatY, seatRadius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        }
      }
    });
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !venueLayout) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert to venue coordinates
    const venue = venueLayout.venue;
    const scaleX = canvas.width / venue.width;
    const scaleY = canvas.height / venue.height;
    const scale = Math.min(scaleX, scaleY) * 0.9;

    const offsetX = (canvas.width - venue.width * scale) / 2;
    const offsetY = (canvas.height - venue.height * scale) / 2;

    // Check if click is on any table
    availableTables.forEach((table: VenueTable) => {
      const tableX = offsetX + table.x * scale;
      const tableY = offsetY + table.y * scale;
      const tableWidth = table.width * scale;
      const tableHeight = table.height * scale;

      if (x >= tableX && x <= tableX + tableWidth && 
          y >= tableY && y <= tableY + tableHeight) {
        setSelectedTable(table);
      }
    });
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
        <h2 className="text-2xl font-bold">Select Your Table</h2>
        <p className="text-muted-foreground">
          Choose a table from the venue layout below. {hasExistingBooking ? 'Update your current selection.' : 'Available tables are shown in gray.'}
        </p>
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