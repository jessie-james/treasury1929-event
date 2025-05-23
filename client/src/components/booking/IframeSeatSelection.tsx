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

interface TableData {
  tableId: number;
  seatCount: number;
  isSelected: boolean;
}

export function IframeSeatSelection({ eventId, onComplete, hasExistingBooking }: Props) {
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
  
  // Send event ID updates to the iframe
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'SET_EVENT_ID',
        eventId: eventId
      }, '*');
    }
  }, [eventId]);
  
  // Format selected table for display
  const formatSelectedTable = () => {
    if (!selectedTable) return "";
    
    const seatText = selectedTable.seatCount === 1 ? 'seat' : 'seats';
    return `Table ${selectedTable.tableId} (${selectedTable.seatCount} ${seatText})`;
  };
  
  // Prepare data for submission
  const getSeatsForSubmission = () => {
    if (!selectedTable) return null;
    
    // Generate all seat numbers for the table (1 to seatCount)
    const seatNumbers = Array.from(
      { length: selectedTable.seatCount }, 
      (_, index) => index + 1
    );
    
    return { 
      tableId: selectedTable.tableId, 
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
                <button 
                  className="flex items-center justify-center w-8 h-8 bg-white border rounded-full hover:bg-gray-50"
                  onClick={() => {
                    iframeRef.current?.contentWindow?.postMessage({ type: 'ZOOM_IN' }, '*');
                  }}
                >
                  <span className="text-xl font-bold">+</span>
                </button>
                <button 
                  className="flex items-center justify-center w-8 h-8 bg-white border rounded-full hover:bg-gray-50"
                  onClick={() => {
                    iframeRef.current?.contentWindow?.postMessage({ type: 'RESET_ZOOM' }, '*');
                  }}
                >
                  <span className="text-xs">Reset</span>
                </button>
              </div>
            </div>
            <div className="overflow-hidden">
              {/* Dynamic venue layout */}
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
                  {/* Venue bounds background */}
                  <div className="absolute inset-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded">
                    <div className="text-center p-2 text-xs text-gray-500">
                      {venueLayout.venue.name} • {venueLayout.tables.length} tables
                    </div>
                  </div>
                  
                  {/* Render tables */}
                  {venueLayout.tables.map((table: any) => (
                    <button
                      key={table.id}
                      className={`absolute rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all hover:scale-110 ${
                        selectedTable?.tableId === table.tableNumber
                          ? 'bg-blue-500 border-blue-600 text-white'
                          : 'bg-green-500 border-green-600 text-white hover:bg-green-600'
                      }`}
                      style={{
                        left: `${Math.max(0, Math.min(90, (table.x / venueLayout.venue.width) * 100))}%`,
                        top: `${Math.max(0, Math.min(85, (table.y / venueLayout.venue.height) * 100))}%`,
                        width: `${Math.max(40, table.width)}px`,
                        height: `${Math.max(40, table.height)}px`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      onClick={() => setSelectedTable({
                        tableId: table.tableNumber,
                        seatCount: table.capacity,
                        isSelected: true
                      })}
                      title={`Table ${table.tableNumber} (${table.capacity} seats)`}
                    >
                      {table.tableNumber}
                    </button>
                  ))}
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