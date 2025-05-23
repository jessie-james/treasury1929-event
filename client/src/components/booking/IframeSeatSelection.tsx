import { useState } from "react";
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