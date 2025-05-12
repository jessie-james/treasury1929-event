import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
          <div className="overflow-auto">
            {/* Use an iframe to load the seat selection HTML with eventId */}
            <iframe
              ref={iframeRef}
              src={`/permanent-mezzanine-seats.html?eventId=${eventId}`}
              className="w-full border-none overflow-auto"
              title="Mezzanine Seating"
              style={{ minHeight: '600px', height: '600px', overflow: 'auto' }}
            />
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