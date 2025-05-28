import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { ZoomContainer } from "@/components/ui/ZoomContainer";
import { ZoomControls, FloatingZoomControls } from "@/components/ui/ZoomControls";

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
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomContainerRef = useRef<HTMLDivElement>(null);

  // Handle zoom change from ZoomContainer
  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(newZoom);
    // Redraw canvas when zoom changes
    if (canvasRef.current && venueLayout) {
      drawVenueLayout();
    }
  };

  // Zoom control functions
  const zoomIn = () => {
    const newZoom = Math.min(zoomLevel + 0.2, 3);
    setZoomLevel(newZoom);
    handleZoomChange(newZoom);
  };
  
  const zoomOut = () => {
    const newZoom = Math.max(zoomLevel - 0.2, 0.5);
    setZoomLevel(newZoom);
    handleZoomChange(newZoom);
  };
  
  const resetZoom = () => {
    setZoomLevel(1);
    handleZoomChange(1);
  };

  // Fetch event data to get venue ID
  const { data: eventData, isLoading: isLoadingEvent } = useQuery({
    queryKey: ['/api/events', eventId],
    queryFn: () => fetch(`/api/events/${eventId}`).then(res => res.json()),
    enabled: !!eventId
  });

  // Get venue layout from the embedded data in the event response
  const venueLayout = eventData?.venueLayout;
  const isLoadingLayout = isLoadingEvent;

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
  }, [venueLayout, selectedTable, existingBookings, zoomLevel]);

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

    // Calculate base scaling to fit venue optimally
    const venue = venueLayout.venue;
    const scaleX = canvas.width / venue.width;
    const scaleY = canvas.height / venue.height;
    const baseScale = Math.min(scaleX, scaleY) * 0.95;
    
    // Apply zoom by scaling the base scale, not the canvas context
    const scale = baseScale * zoomLevel;

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

    // Draw tables with exact same styling as VenueLayoutDesigner
    venueLayout.tables?.forEach((table) => {
      const isSelected = selectedTable?.id === table.id;
      const isBooked = bookedTableIds.includes(table.id);
      const isHalf = table.shape === 'half';
      
      // Calculate table position and radius
      const tableRadius = Math.min(table.width, table.height) / 2;
      const seatRadius = Math.max(6, tableRadius * 0.25);
      const centerX = offsetX + (table.x + tableRadius) * scale;
      const centerY = offsetY + (table.y + tableRadius) * scale;
      const scaledTableRadius = tableRadius * scale;
      const scaledSeatRadius = seatRadius * scale;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((table.rotation * Math.PI) / 180);
      
      // Add shadow
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      
      // Table surface - Light gray as per your venue designer
      if (isBooked) {
        ctx.fillStyle = '#ef4444'; // Red for booked
        ctx.strokeStyle = '#dc2626';
      } else if (isSelected) {
        ctx.fillStyle = '#d0d0d0'; // Selected table
        ctx.strokeStyle = '#333';
      } else {
        ctx.fillStyle = '#e0e0e0'; // Light gray for available (exact match)
        ctx.strokeStyle = '#555'; // Dark border (exact match)
      }
      
      ctx.lineWidth = 2;
      
      if (isHalf) {
        // Half circle table
        ctx.beginPath();
        ctx.arc(0, 0, scaledTableRadius, Math.PI, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // Full circle table
        ctx.beginPath();
        ctx.arc(0, 0, scaledTableRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
      
      // Reset shadow for text and seats
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Table number (exact same styling as venue designer)
      const fontSize = Math.max(12, Math.min(24, 10 + (tableRadius * scale) * 0.2));
      ctx.fillStyle = '#333'; // Dark gray text
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const textY = isHalf ? -scaledTableRadius * 0.5 : 0;
      ctx.fillText(table.tableNumber.toString(), 0, textY);
      
      // Draw seats around the table (exact same as venue designer)
      const count = table.capacity;
      if (count > 0) {
        const seatOffset = scaledTableRadius + scaledSeatRadius; // Seats touch table edge
        
        for (let i = 0; i < count; i++) {
          let angle;
          
          if (isHalf) {
            // Half Circle Tables - Smart positioning
            if (count === 1) {
              angle = 270; // Single seat at the back center
            } else if (count === 2) {
              const angles = [225, 315]; // 90° total spread
              angle = angles[i];
            } else if (count === 3) {
              const angles = [220, 270, 320]; // 100° total spread
              angle = angles[i];
            } else {
              // 4+ seats: use 40° spacing method
              const totalSpan = (count - 1) * 40;
              const startAngle = 270 - (totalSpan / 2);
              angle = startAngle + (i * 40);
            }
          } else {
            // Full Circle Tables - Even distribution
            angle = i * (360 / count); // Evenly spaced around 360°
          }
          
          const rad = angle * Math.PI / 180;
          const seatX = seatOffset * Math.cos(rad);
          const seatY = seatOffset * Math.sin(rad);
          
          // Add shadow for seats
          ctx.shadowColor = 'rgba(0,0,0,0.2)';
          ctx.shadowBlur = 3;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 1;
          
          // Seat circle - Green color as per your venue designer
          ctx.fillStyle = '#4CAF50'; // Green seat color (exact match)
          ctx.strokeStyle = '#2E7D32'; // Darker green border (exact match)
          ctx.lineWidth = 1;
          
          ctx.beginPath();
          ctx.arc(seatX, seatY, scaledSeatRadius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          
          // Reset shadow for seat text
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          
          // Seat number (exact same styling as venue designer)
          const seatFontSize = Math.max(8, Math.min(16, scaledSeatRadius - 4));
          ctx.fillStyle = 'white'; // White text on green seats
          ctx.font = `bold ${seatFontSize}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText((i + 1).toString(), seatX, seatY);
        }
      }
      
      // Selection indicator - subtle highlight as per your venue designer
      if (isSelected) {
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        if (isHalf) {
          ctx.arc(0, 0, scaledTableRadius + 8, Math.PI, 2 * Math.PI);
        } else {
          ctx.arc(0, 0, scaledTableRadius + 8, 0, 2 * Math.PI);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
      
      ctx.restore();
    });
  };

  // Handle canvas click for table selection
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !venueLayout) return;

    const rect = canvas.getBoundingClientRect();
    
    // Get click position relative to canvas
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Calculate scaling (same as in drawVenueLayout)
    const venue = venueLayout.venue;
    const scaleX = canvas.width / venue.width;
    const scaleY = canvas.height / venue.height;
    const baseScale = Math.min(scaleX, scaleY) * 0.95;
    const scale = baseScale * zoomLevel;

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
          Click on an available table in the venue layout below. Use mouse wheel or controls to zoom and drag to pan around.
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
              <ZoomContainer
                ref={zoomContainerRef}
                initialZoom={zoomLevel}
                minZoom={0.5}
                maxZoom={3}
                onZoomChange={handleZoomChange}
                className="w-full h-full"
              >
                <canvas
                  ref={canvasRef}
                  className="w-full h-full cursor-pointer"
                  onClick={handleCanvasClick}
                  style={{ display: 'block' }}
                />
              </ZoomContainer>
              
              {/* Floating zoom controls for mobile */}
              <FloatingZoomControls
                zoom={zoomLevel}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                onReset={resetZoom}
                minZoom={0.5}
                maxZoom={3}
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