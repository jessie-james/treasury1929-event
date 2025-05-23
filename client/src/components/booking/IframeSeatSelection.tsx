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
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  shape: string;
  rotation: number;
  status: string;
}

interface VenueStage {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface VenueLayout {
  venue: {
    id: number;
    name: string;
    width: number;
    height: number;
  };
  tables: VenueTable[];
  stages: VenueStage[];
}

export function IframeSeatSelection({ eventId, onComplete, hasExistingBooking }: Props) {
  const [selectedTable, setSelectedTable] = useState<VenueTable | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch event data to get venue ID
  const { data: eventData, isLoading: isLoadingEvent } = useQuery({
    queryKey: ['/api/events', eventId],
    queryFn: () => fetch(`/api/events/${eventId}`).then(res => res.json()),
    enabled: !!eventId
  });

  // Fetch venue layout
  const { data: venueLayout, isLoading: isLoadingLayout } = useQuery<VenueLayout>({
    queryKey: ['/api/venues', eventData?.venueId, 'layout'],
    queryFn: () => fetch(`/api/venues/${eventData.venueId}/layout`).then(res => res.json()),
    enabled: !!eventData?.venueId
  });

  // Fetch existing bookings to filter out unavailable tables
  const { data: existingBookings } = useQuery({
    queryKey: ['/api/event-bookings', eventId],
    queryFn: () => fetch(`/api/event-bookings?eventId=${eventId}`).then(res => res.json()),
    enabled: !!eventId
  });

  // Filter available tables
  const bookedTableIds = existingBookings?.map((booking: any) => booking.tableId) || [];
  const availableTables = venueLayout?.tables?.filter(table => 
    !bookedTableIds.includes(table.id)
  ) || [];

  // Draw venue layout on canvas
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

    // Set canvas size
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    // Clear canvas
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate scaling
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

    // Draw stages
    venueLayout.stages?.forEach((stage) => {
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
    });

    // Draw tables
    venueLayout.tables?.forEach((table) => {
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

      ctx.lineWidth = 2;

      // Draw table shape
      if (table.shape === 'circle') {
        const centerX = tableX + tableWidth / 2;
        const centerY = tableY + tableHeight / 2;
        const radius = Math.min(tableWidth, tableHeight) / 2;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(tableX, tableY, tableWidth, tableHeight);
        ctx.strokeRect(tableX, tableY, tableWidth, tableHeight);
      }

      // Draw table number
      ctx.fillStyle = '#333333';
      ctx.font = `${Math.max(10, 12 * scale)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(
        table.tableNumber.toString(),
        tableX + tableWidth / 2,
        tableY + tableHeight / 2 + 5
      );
    });
  };

  // Handle canvas click for table selection
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

    // Check if click is on any available table
    for (const table of availableTables) {
      const tableX = offsetX + table.x * scale;
      const tableY = offsetY + table.y * scale;
      const tableWidth = table.width * scale;
      const tableHeight = table.height * scale;

      if (x >= tableX && x <= tableX + tableWidth && 
          y >= tableY && y <= tableY + tableHeight) {
        setSelectedTable(table);
        break;
      }
    }
  };

  const handleConfirmSelection = () => {
    if (selectedTable) {
      // Generate seat numbers based on table capacity
      const seatNumbers = Array.from({ length: selectedTable.capacity }, (_, i) => i + 1);
      onComplete({
        tableId: selectedTable.id,
        seatNumbers
      });
    }
  };

  const isLoading = isLoadingEvent || isLoadingLayout;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Select Your Table</h2>
        <p className="text-muted-foreground">
          Click on an available table in the venue layout below.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium">Venue Layout</h3>
            <Badge variant="outline">
              {availableTables.length} of {venueLayout?.tables?.length || 0} tables available
            </Badge>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading venue layout...</span>
            </div>
          ) : venueLayout ? (
            <div className="relative bg-gray-50 rounded-lg overflow-hidden" style={{ height: '400px' }}>
              <canvas
                ref={canvasRef}
                className="w-full h-full cursor-pointer"
                onClick={handleCanvasClick}
                style={{ display: 'block' }}
              />
            </div>
          ) : (
            <div className="text-center p-8">
              <p className="text-gray-600">
                Unable to load venue layout. Please try again.
              </p>
            </div>
          )}
          
          {/* Selection Summary */}
          {selectedTable && (
            <div className="mt-6 p-4 bg-slate-50 rounded-md">
              <h3 className="font-medium mb-1">Selected Table:</h3>
              <p className="text-sm">Table {selectedTable.tableNumber} ({selectedTable.capacity} seats)</p>
              <p className="text-xs text-muted-foreground mt-1">
                You will need to provide guest details for each seat at this table.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Continue button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleConfirmSelection}
          disabled={!selectedTable}
        >
          Continue to Guest Details
        </Button>
      </div>
    </div>
  );
}