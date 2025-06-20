import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
  stages: VenueStage[];
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

interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

// Custom hook for canvas drawing operations
const useCanvasRenderer = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  venueLayout: VenueLayout | undefined,
  selectedTable: VenueTable | null,
  bookedTableIds: number[],
  viewport: ViewportState
) => {
  const drawVenueLayout = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !venueLayout) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const container = canvas.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    // Clear canvas
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate scaling
    const venue = venueLayout.venue;
    const canvasWidth = canvas.width / window.devicePixelRatio;
    const canvasHeight = canvas.height / window.devicePixelRatio;
    
    const scaleX = canvasWidth / venue.width;
    const scaleY = canvasHeight / venue.height;
    const baseScale = Math.min(scaleX, scaleY) * 0.8;
    const scale = baseScale * viewport.zoom;
    
    const offsetX = (canvasWidth - venue.width * scale) / 2 + viewport.panX;
    const offsetY = (canvasHeight - venue.height * scale) / 2 + viewport.panY;

    // Save context for transformations
    ctx.save();
    
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
      ctx.textBaseline = 'middle';
      ctx.fillText(
        'STAGE',
        offsetX + (stage.x + stage.width / 2) * scale,
        offsetY + (stage.y + stage.height / 2) * scale
      );
    });

    // Draw tables
    venueLayout.tables?.forEach((table) => {
      const isSelected = selectedTable?.id === table.id;
      const isBooked = bookedTableIds.includes(table.id);
      const isHalf = table.shape === 'half';
      
      const tableRadius = Math.min(table.width, table.height) / 2;
      const seatRadius = Math.max(6, tableRadius * 0.25);
      const centerX = offsetX + (table.x + tableRadius) * scale;
      const centerY = offsetY + (table.y + tableRadius) * scale;
      const scaledTableRadius = tableRadius * scale;
      const scaledSeatRadius = seatRadius * scale;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((table.rotation * Math.PI) / 180);
      
      // Table styling
      if (isBooked) {
        ctx.fillStyle = '#ef4444';
        ctx.strokeStyle = '#dc2626';
      } else if (isSelected) {
        ctx.fillStyle = '#3b82f6';
        ctx.strokeStyle = '#1d4ed8';
      } else {
        ctx.fillStyle = '#10b981';
        ctx.strokeStyle = '#059669';
      }
      
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      
      // Draw table shape
      ctx.beginPath();
      if (isHalf) {
        ctx.arc(0, 0, scaledTableRadius, Math.PI, 2 * Math.PI);
        ctx.closePath();
      } else {
        ctx.arc(0, 0, scaledTableRadius, 0, 2 * Math.PI);
      }
      ctx.fill();
      ctx.stroke();
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      
      // Table number
      const fontSize = Math.max(10, Math.min(20, scaledTableRadius * 0.4));
      ctx.fillStyle = isSelected ? '#ffffff' : '#374151';
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const textY = isHalf ? -scaledTableRadius * 0.3 : 0;
      ctx.fillText(table.tableNumber.toString(), 0, textY);
      
      // Draw seats
      if (table.capacity > 0) {
        const seatOffset = scaledTableRadius + scaledSeatRadius + 2;
        
        for (let i = 0; i < table.capacity; i++) {
          let angle;
          
          if (isHalf) {
            if (table.capacity === 1) {
              angle = 270;
            } else {
              const span = Math.min(180, table.capacity * 30);
              const startAngle = 270 - span / 2;
              angle = startAngle + (i * span) / (table.capacity - 1);
            }
          } else {
            angle = (i * 360) / table.capacity;
          }
          
          const rad = (angle * Math.PI) / 180;
          const seatX = seatOffset * Math.cos(rad);
          const seatY = seatOffset * Math.sin(rad);
          
          // Seat styling
          ctx.fillStyle = '#6b7280';
          ctx.strokeStyle = '#4b5563';
          ctx.lineWidth = 1;
          ctx.shadowColor = 'rgba(0,0,0,0.1)';
          ctx.shadowBlur = 2;
          ctx.shadowOffsetY = 1;
          
          ctx.beginPath();
          ctx.arc(seatX, seatY, scaledSeatRadius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          
          // Reset shadow
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;
          
          // Seat number
          const seatFontSize = Math.max(6, Math.min(12, scaledSeatRadius * 0.8));
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${seatFontSize}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText((i + 1).toString(), seatX, seatY);
        }
      }
      
      // Selection indicator
      if (isSelected) {
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        if (isHalf) {
          ctx.arc(0, 0, scaledTableRadius + 6, Math.PI, 2 * Math.PI);
        } else {
          ctx.arc(0, 0, scaledTableRadius + 6, 0, 2 * Math.PI);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
      
      ctx.restore();
    });
    
    ctx.restore();
  }, [canvasRef, venueLayout, selectedTable, bookedTableIds, viewport]);

  return { drawVenueLayout };
};

export function IframeSeatSelection({ eventId, onComplete, hasExistingBooking }: Props) {
  const [selectedTable, setSelectedTable] = useState<VenueTable | null>(null);
  const [selectedVenueIndex, setSelectedVenueIndex] = useState<number>(0);
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 1,
    panX: 0,
    panY: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch event venue layouts using the new API
  const { data: eventVenueLayouts, isLoading: isLoadingVenues, error: venueError } = useQuery({
    queryKey: [`/api/events/${eventId}/venue-layouts`],
    enabled: !!eventId,
    retry: 1
  });

  // Fallback: Fetch event data if venue layouts aren't available
  const { data: eventData, isLoading: isLoadingEvent } = useQuery({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId && (!eventVenueLayouts || !!venueError),
    retry: 2
  });

  // Fetch existing bookings
  const { data: existingBookings, error: bookingsError } = useQuery({
    queryKey: ['/api/event-bookings', eventId],
    enabled: !!eventId,
    retry: 2,
    throwOnError: false
  });

  // Get the current venue layout based on selected venue or fallback to event data
  const currentVenueLayout: VenueLayout | undefined = useMemo(() => {
    // Reset any cached table data to prevent accumulation
    
    // First try new venue layouts system
    if (eventVenueLayouts && Array.isArray(eventVenueLayouts) && eventVenueLayouts.length > 0) {
      // Ensure selectedVenueIndex is within bounds
      const safeIndex = Math.max(0, Math.min(selectedVenueIndex, eventVenueLayouts.length - 1));
      const selected = eventVenueLayouts[safeIndex];
      
      console.log('🔍 VENUE SELECTION FIXED:', {
        selectedIndex: safeIndex,
        venueName: selected?.venue?.name,
        tableCount: selected?.tables?.length,
        venueId: selected?.venue?.id
      });
      
      if (selected && selected.tables) {
        // Ensure we're only getting tables for THIS specific venue
        const venueSpecificTables = selected.tables.filter((table: any) => 
          table.id && typeof table.id === 'number'
        );
        
        return {
          venue: selected.venue,
          tables: venueSpecificTables, // Only return tables for the selected venue
          stages: selected.stages || []
        };
      }
    }
    
    // Fallback to event data structure
    if (eventData && (eventData as any).venueLayout) {
      console.log('🔄 Using fallback event data');
      return (eventData as any).venueLayout;
    }
    
    console.log('❌ No venue layout found');
    return undefined;
  }, [eventVenueLayouts, selectedVenueIndex, eventData]);
  
  // Memoize available tables calculation
  const { availableTables, bookedTableIds } = useMemo(() => {
    const bookedIds = Array.isArray(existingBookings) ? existingBookings.map((booking: any) => booking.tableId) : [];
    const available = currentVenueLayout?.tables?.filter((table: VenueTable) => 
      !bookedIds.includes(table.id)
    ) || [];
    
    return {
      availableTables: available,
      bookedTableIds: bookedIds
    };
  }, [currentVenueLayout, existingBookings]);

  // Use custom hook for canvas rendering
  const { drawVenueLayout } = useCanvasRenderer(
    canvasRef,
    currentVenueLayout,
    selectedTable,
    bookedTableIds,
    viewport
  );

  // Redraw when dependencies change
  useEffect(() => {
    drawVenueLayout();
  }, [drawVenueLayout]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      drawVenueLayout();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawVenueLayout]);

  // Improved hit detection for circular tables
  const getTableAtPosition = useCallback((x: number, y: number): VenueTable | null => {
    if (!currentVenueLayout) return null;

    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const canvasX = x - rect.left;
    const canvasY = y - rect.top;

    const venue = currentVenueLayout.venue;
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;
    
    const scaleX = canvasWidth / venue.width;
    const scaleY = canvasHeight / venue.height;
    const baseScale = Math.min(scaleX, scaleY) * 0.8;
    const scale = baseScale * viewport.zoom;
    
    const offsetX = (canvasWidth - venue.width * scale) / 2 + viewport.panX;
    const offsetY = (canvasHeight - venue.height * scale) / 2 + viewport.panY;

    // Convert to venue coordinates
    const venueX = (canvasX - offsetX) / scale;
    const venueY = (canvasY - offsetY) / scale;

    // Check each available table
    for (const table of availableTables) {
      const tableRadius = Math.min(table.width, table.height) / 2;
      const tableCenterX = table.x + tableRadius;
      const tableCenterY = table.y + tableRadius;
      
      // Calculate distance from click to table center
      const distance = Math.sqrt(
        Math.pow(venueX - tableCenterX, 2) + Math.pow(venueY - tableCenterY, 2)
      );
      
      // Check if click is within table radius
      if (distance <= tableRadius) {
        return table;
      }
    }
    
    return null;
  }, [currentVenueLayout, availableTables, viewport]);

  // Mouse event handlers
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const clickedTable = getTableAtPosition(event.clientX, event.clientY);
    
    if (clickedTable) {
      setSelectedTable(clickedTable);
    } else {
      setIsDragging(true);
      setLastMousePos({ x: event.clientX, y: event.clientY });
    }
  }, [getTableAtPosition]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const deltaX = event.clientX - lastMousePos.x;
      const deltaY = event.clientY - lastMousePos.y;
      
      setViewport(prev => ({
        ...prev,
        panX: prev.panX + deltaX,
        panY: prev.panY + deltaY
      }));
      
      setLastMousePos({ x: event.clientX, y: event.clientY });
    }
  }, [isDragging, lastMousePos]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Wheel event for zooming
  const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    
    const zoomSpeed = 0.1;
    const delta = event.deltaY > 0 ? -zoomSpeed : zoomSpeed;
    
    setViewport(prev => ({
      ...prev,
      zoom: Math.max(0.2, Math.min(5, prev.zoom + delta))
    }));
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setViewport(prev => ({
      ...prev,
      zoom: Math.min(5, prev.zoom + 0.2)
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setViewport(prev => ({
      ...prev,
      zoom: Math.max(0.2, prev.zoom - 0.2)
    }));
  }, []);

  const resetView = useCallback(() => {
    setViewport({
      zoom: 1,
      panX: 0,
      panY: 0
    });
  }, []);

  const handleConfirmSelection = useCallback(() => {
    if (selectedTable) {
      const seatNumbers = Array.from({ length: selectedTable.capacity }, (_, i) => i + 1);
      onComplete({
        tableId: selectedTable.id,
        seatNumbers
      });
    }
  }, [selectedTable, onComplete]);

  const isLoading = isLoadingVenues || isLoadingEvent;
  const hasError = venueError && !eventData || bookingsError;

  if (hasError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Error loading venue layout. Please try again.</p>
              <p className="text-sm mt-2">{venueError?.message || bookingsError?.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Select Your Table</h2>
        <p className="text-muted-foreground">
          Click on an available table in the venue layout below. Use mouse wheel to zoom and drag to pan around.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <h4 className="font-medium text-blue-900 mb-1">Table Selection Rules:</h4>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• For 4-seat tables: You cannot select only 2 seats</li>
            <li>• If selecting 3 seats on a 4-seat table, the 4th seat will remain empty for your group</li>
            <li>• 2-seat and 3-seat tables can be fully or partially selected</li>
          </ul>
        </div>
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
                  setSelectedTable(null); // Clear table selection when changing venues
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

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium">
              {currentVenueLayout?.venue?.name || "Venue Layout"}
              {Array.isArray(eventVenueLayouts) && eventVenueLayouts.length > 1 && selectedVenueIndex < eventVenueLayouts.length ? (
                <span className="text-sm text-gray-500 ml-2">
                  ({(eventVenueLayouts as any[])[selectedVenueIndex]?.displayName || 'Venue'})
                </span>
              ) : null}
            </h3>
            <div className="flex items-center gap-4">
              <Badge variant="outline">
                {availableTables.length} of {currentVenueLayout?.tables?.length || 0} tables available
              </Badge>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={zoomOut}
                  disabled={viewport.zoom <= 0.2}
                >
                  -
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetView}
                >
                  Reset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={zoomIn}
                  disabled={viewport.zoom >= 5}
                >
                  +
                </Button>
              </div>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading venue layout...</span>
            </div>
          ) : currentVenueLayout ? (
            <div className="relative bg-gray-50 rounded-lg overflow-hidden" style={{ height: '500px' }}>
              <canvas
                ref={canvasRef}
                className="w-full h-full cursor-pointer"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                style={{ 
                  display: 'block',
                  cursor: isDragging ? 'grabbing' : 'grab'
                }}
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
            <div className="mt-6 p-4 bg-blue-50 rounded-md border border-blue-200">
              <h3 className="font-medium mb-1 text-blue-900">Selected Table:</h3>
              <p className="text-sm text-blue-800">Table {selectedTable.tableNumber} ({selectedTable.capacity} seats)</p>
              <p className="text-xs text-blue-600 mt-1">
                You will need to provide guest details for each seat at this table.
              </p>
              {selectedTable.capacity === 4 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  <p className="text-yellow-800">
                    <strong>Note:</strong> This is a 4-seat table. If you have 3 guests, one seat will remain empty and reserved for your group.
                  </p>
                </div>
              )}
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