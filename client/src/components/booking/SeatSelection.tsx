
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { type Table, type Seat } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface Props {
  eventId: number;
  onComplete: (selection: { tableId: number; seatNumbers: number[] }) => void;
  hasExistingBooking?: boolean;
}

interface SeatWithAvailability extends Seat {
  isAvailable: boolean;
}

export function SeatSelection({ eventId, onComplete, hasExistingBooking }: Props) {
  const [selectedSeats, setSelectedSeats] = useState<Array<{ tableId: number; seatNumber: number }>>([]);

  const { data: tables, isLoading: tablesLoading } = useQuery<Table[]>({
    queryKey: ["/api/tables"],
  });

  const { data: allSeats, isLoading: seatsLoading } = useQuery<Record<number, SeatWithAvailability[]>>({
    queryKey: ["/api/tables/seats", { eventId }],
    queryFn: async () => {
      if (!tables) return {};
      const seatsMap: Record<number, SeatWithAvailability[]> = {};
      for (const table of tables) {
        const response = await fetch(`/api/tables/${table.id}/seats?eventId=${eventId}`);
        seatsMap[table.id] = await response.json();
      }
      return seatsMap;
    },
    enabled: !!tables,
  });

  const handleSeatToggle = (tableId: number, seatNumber: number) => {
    const existingSeatIndex = selectedSeats.findIndex(
      s => s.tableId === tableId && s.seatNumber === seatNumber
    );

    if (existingSeatIndex >= 0) {
      setSelectedSeats(selectedSeats.filter((_, i) => i !== existingSeatIndex));
    } else {
      if (selectedSeats.length >= 4) {
        toast({
          title: "Maximum seats reached",
          description: "You can only select up to 4 seats",
          variant: "destructive"
        });
        return;
      }

      if (selectedSeats.length > 0 && selectedSeats[0].tableId !== tableId) {
        toast({
          title: "Select seats from one table",
          description: "Please select seats from the same table",
          variant: "destructive"
        });
        return;
      }

      setSelectedSeats([...selectedSeats, { tableId, seatNumber }]);
    }
  };

  const isSeatSelected = (tableId: number, seatNumber: number) => {
    return selectedSeats.some(s => s.tableId === tableId && s.seatNumber === seatNumber);
  };

  if (tablesLoading || seatsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-96 bg-muted rounded" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {hasExistingBooking && (
          <Alert variant="warning" className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Existing Booking</AlertTitle>
            <AlertDescription className="text-yellow-700">
              You already have tickets for this event. Additional bookings will be separate from your existing reservation.
            </AlertDescription>
          </Alert>
        )}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Select Your Seats</h2>
          <Button
            onClick={() => {
              if (selectedSeats.length === 0) return;
              const tableId = selectedSeats[0].tableId;
              const seatNumbers = selectedSeats.map(s => s.seatNumber).sort((a, b) => a - b);
              onComplete({ tableId, seatNumbers });
            }}
            disabled={selectedSeats.length === 0}
          >
            Continue to Guest Details
          </Button>
        </div>
        <p className="text-muted-foreground">
          Choose up to 4 seats from a single table
        </p>
        <p className="text-sm font-medium text-primary">
          {selectedSeats.length} seats selected
        </p>
      </div>

      <ScrollArea className="h-[calc(100vh-250px)] w-full rounded-md border p-4">
        <div className="space-y-8">
          {/* Main Floor */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Main Floor</h3>
            <div className="relative p-4">
              {/* Stage Area */}
              <div className="w-full h-24 bg-gradient-to-b from-amber-100 to-amber-200 flex items-center justify-center mb-8 rounded-lg border border-amber-300">
                <span className="text-lg font-medium text-amber-800">STAGE</span>
              </div>
              
              <div className="grid grid-cols-8 gap-2">
                {tables?.filter(t => t.tableNumber <= 32).map((table) => {
                  const tableSeats = allSeats?.[table.id] || [];
                  return (
                    <Card 
                      key={table.id} 
                      className={cn(
                        "overflow-hidden rounded-full aspect-square",
                        selectedSeats.some(s => s.tableId === table.id) && "ring-2 ring-primary"
                      )}
                    >
                      <CardContent className="p-1 h-full">
                        <div className="flex flex-col items-center justify-center h-full space-y-1">
                          <div className="text-xs font-medium text-center mb-1">Table {table.tableNumber}</div>
                          <div className="grid grid-cols-2 gap-0.5 w-full">
                            {tableSeats.map((seat) => {
                              const isSelected = isSeatSelected(table.id, seat.seatNumber);
                              return (
                                <Button
                                  key={seat.id}
                                  size="sm"
                                  variant={isSelected ? "default" : seat.isAvailable ? "secondary" : "ghost"}
                                  className={cn(
                                    "h-6 w-6 p-0 text-xs rounded-full",
                                    isSelected && "bg-primary hover:bg-primary/90",
                                    !isSelected && seat.isAvailable && "bg-green-500/10 hover:bg-green-500/20 text-green-600",
                                    !isSelected && !seat.isAvailable && "bg-muted/50 text-muted-foreground hover:bg-muted/50 cursor-not-allowed"
                                  )}
                                  disabled={!seat.isAvailable && !isSelected}
                                  onClick={() => handleSeatToggle(table.id, seat.seatNumber)}
                                >
                                  {seat.seatNumber}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mezzanine */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Mezzanine</h3>
            <div className="relative p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-8 gap-2">
                {tables?.filter(t => t.tableNumber > 32).map((table) => {
                  const tableSeats = allSeats?.[table.id] || [];
                  return (
                    <Card 
                      key={table.id} 
                      className={cn(
                        "overflow-hidden rounded-full aspect-square",
                        selectedSeats.some(s => s.tableId === table.id) && "ring-2 ring-primary"
                      )}
                    >
                      <CardContent className="p-1 h-full">
                        <div className="flex flex-col items-center justify-center h-full space-y-1">
                          <div className="text-xs font-medium text-center mb-1">Table {table.tableNumber}</div>
                          <div className="grid grid-cols-2 gap-0.5 w-full">
                            {tableSeats.map((seat) => {
                              const isSelected = isSeatSelected(table.id, seat.seatNumber);
                              return (
                                <Button
                                  key={seat.id}
                                  size="sm"
                                  variant={isSelected ? "default" : seat.isAvailable ? "secondary" : "ghost"}
                                  className={cn(
                                    "h-6 w-6 p-0 text-xs rounded-full",
                                    isSelected && "bg-primary hover:bg-primary/90",
                                    !isSelected && seat.isAvailable && "bg-green-500/10 hover:bg-green-500/20 text-green-600",
                                    !isSelected && !seat.isAvailable && "bg-muted/50 text-muted-foreground hover:bg-muted/50 cursor-not-allowed"
                                  )}
                                  disabled={!seat.isAvailable && !isSelected}
                                  onClick={() => handleSeatToggle(table.id, seat.seatNumber)}
                                >
                                  {seat.seatNumber}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
