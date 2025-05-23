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
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  // Fetch event data (this API works correctly and has table count)
  const { data: eventData, isLoading: isLoadingEvent } = useQuery({
    queryKey: ['/api/events', eventId],
    queryFn: () => fetch(`/api/events/${eventId}`).then(res => res.json()),
    enabled: !!eventId
  });

  // Fetch existing bookings to filter out unavailable tables
  const { data: existingBookings } = useQuery({
    queryKey: ['/api/event-bookings', eventId],
    queryFn: () => fetch(`/api/event-bookings?eventId=${eventId}`).then(res => res.json()),
    enabled: !!eventId
  });

  // Generate table list from event data (using authentic total tables count)
  const totalTables = eventData?.totalTables || 0;
  const bookedTableIds = existingBookings?.map((booking: any) => booking.tableId) || [];
  
  const availableTables = Array.from({ length: totalTables }, (_, index) => {
    const tableNumber = index + 1;
    return {
      id: tableNumber,
      tableNumber,
      isBooked: bookedTableIds.includes(tableNumber),
      capacity: 4 // Standard table capacity
    };
  }).filter(table => !table.isBooked);

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

  const handleTableSelect = (tableNumber: number) => {
    setSelectedTable(tableNumber);
  };

  const handleConfirmSelection = () => {
    if (selectedTable) {
      // Generate seat numbers based on table capacity (4 seats per table)
      const seatNumbers = Array.from({ length: 4 }, (_, i) => i + 1);
      onComplete({
        tableId: selectedTable,
        seatNumbers
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Select Your Table</h2>
        <p className="text-muted-foreground">
          Choose a table from the available options below. Each table seats 4 people.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium">Available Tables</h3>
            <Badge variant="outline">
              {availableTables.length} of {totalTables} tables available
            </Badge>
          </div>
          
          {isLoadingEvent ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading event details...</span>
            </div>
          ) : availableTables.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {availableTables.map((table) => (
                <Card 
                  key={table.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedTable === table.tableNumber 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleTableSelect(table.tableNumber)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="w-12 h-12 mx-auto mb-2 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="font-semibold text-gray-700">{table.tableNumber}</span>
                    </div>
                    <h4 className="font-medium">Table {table.tableNumber}</h4>
                    <p className="text-sm text-gray-600">
                      {table.capacity} seats
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-8">
              <p className="text-gray-600">
                {totalTables === 0 
                  ? "No tables configured for this event." 
                  : "All tables are currently booked for this event."}
              </p>
            </div>
          )}
          
          {/* Selection Summary */}
          {selectedTable && (
            <div className="mt-6 p-4 bg-slate-50 rounded-md">
              <h3 className="font-medium mb-1">Selected Table:</h3>
              <p className="text-sm">Table {selectedTable} (4 seats)</p>
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