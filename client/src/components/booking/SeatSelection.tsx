
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { type Table, type Seat } from "@shared/schema";
import { Card } from "@/components/ui/card";
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
            <div className="relative">
              <div className="relative w-full border rounded-md overflow-hidden" style={{ height: '600px' }}>
                <iframe 
                  src="/main-floor.html" 
                  className="absolute inset-0 w-full h-full border-0"
                  title="Main Floor Layout"
                />
                <div className="absolute inset-0 z-10">
                  {tables?.filter(t => t.tableNumber <= 32).map((table) => {
                    const tableSeats = allSeats?.[table.id] || [];
                    // Table positions on the floor plan (coordinates)
                    const tablePositions: Record<number, { top: string, left: string }> = {
                      1: { top: '16%', left: '22%' },
                      2: { top: '16%', left: '32%' },
                      3: { top: '16%', left: '42%' },
                      4: { top: '16%', left: '52%' },
                      5: { top: '16%', left: '62%' },
                      6: { top: '16%', left: '72%' },
                      7: { top: '26%', left: '22%' },
                      8: { top: '26%', left: '32%' },
                      9: { top: '26%', left: '42%' },
                      10: { top: '26%', left: '52%' },
                      11: { top: '26%', left: '62%' },
                      12: { top: '26%', left: '72%' },
                      13: { top: '36%', left: '22%' },
                      14: { top: '36%', left: '32%' },
                      15: { top: '36%', left: '42%' },
                      16: { top: '36%', left: '52%' },
                      17: { top: '36%', left: '62%' },
                      18: { top: '36%', left: '72%' },
                      19: { top: '46%', left: '22%' },
                      20: { top: '46%', left: '32%' },
                      21: { top: '46%', left: '42%' },
                      22: { top: '46%', left: '52%' },
                      23: { top: '46%', left: '62%' },
                      24: { top: '46%', left: '72%' },
                      25: { top: '56%', left: '22%' },
                      26: { top: '56%', left: '32%' },
                      27: { top: '56%', left: '42%' },
                      28: { top: '56%', left: '52%' },
                      29: { top: '56%', left: '62%' },
                      30: { top: '56%', left: '72%' },
                      31: { top: '70%', left: '42%' },
                      32: { top: '70%', left: '52%' },
                    };
                    const position = tablePositions[table.tableNumber];
                    
                    return position && (
                      <div
                        key={table.id}
                        className="absolute"
                        style={{ top: position.top, left: position.left }}
                      >
                        <Card className="w-14 h-14 rounded-full overflow-hidden relative shadow-lg border-2 border-primary-foreground/10 bg-white/80 backdrop-blur-sm">
                          <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-0.5 p-1">
                            <div className="text-xs font-bold text-center w-full mb-0.5">{table.tableNumber}</div>
                            {tableSeats.map((seat) => {
                              const isSelected = isSeatSelected(table.id, seat.seatNumber);
                              return (
                                <Button
                                  key={seat.id}
                                  size="sm"
                                  variant={isSelected ? "default" : seat.isAvailable ? "secondary" : "ghost"}
                                  className={cn(
                                    "h-5 w-5 p-0 text-[10px] rounded-full",
                                    isSelected && "bg-primary hover:bg-primary/90",
                                    !isSelected && seat.isAvailable && "bg-green-500 hover:bg-green-600 text-white",
                                    !isSelected && !seat.isAvailable && "bg-gray-300 text-gray-500 hover:bg-gray-300 cursor-not-allowed"
                                  )}
                                  disabled={!seat.isAvailable && !isSelected}
                                  onClick={() => handleSeatToggle(table.id, seat.seatNumber)}
                                >
                                  {seat.seatNumber}
                                </Button>
                              );
                            })}
                          </div>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Mezzanine */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Mezzanine</h3>
            <div className="relative">
              <div className="relative w-full border rounded-md overflow-hidden" style={{ height: '600px' }}>
                <iframe 
                  src="/mezzanine-floor.html" 
                  className="absolute inset-0 w-full h-full border-0"
                  title="Mezzanine Floor Layout"
                />
                <div className="absolute inset-0 z-10">
                  {tables?.filter(t => t.tableNumber > 32).map((table) => {
                    const tableSeats = allSeats?.[table.id] || [];
                    // Table positions on the floor plan (coordinates)
                    const tablePositions: Record<number, { top: string, left: string }> = {
                      33: { top: '16%', left: '22%' },
                      34: { top: '16%', left: '32%' },
                      35: { top: '16%', left: '42%' },
                      36: { top: '16%', left: '52%' },
                      37: { top: '16%', left: '62%' },
                      38: { top: '16%', left: '72%' },
                      39: { top: '26%', left: '22%' },
                      40: { top: '26%', left: '32%' },
                      41: { top: '26%', left: '42%' },
                      42: { top: '26%', left: '52%' },
                      43: { top: '26%', left: '62%' },
                      44: { top: '26%', left: '72%' },
                      45: { top: '36%', left: '22%' },
                      46: { top: '36%', left: '32%' },
                      47: { top: '36%', left: '42%' },
                      48: { top: '36%', left: '52%' },
                      49: { top: '36%', left: '62%' },
                      50: { top: '36%', left: '72%' },
                      51: { top: '46%', left: '22%' },
                      52: { top: '46%', left: '32%' },
                      53: { top: '46%', left: '42%' },
                      54: { top: '46%', left: '52%' },
                      55: { top: '46%', left: '62%' },
                      56: { top: '46%', left: '72%' },
                      57: { top: '56%', left: '22%' },
                      58: { top: '56%', left: '32%' },
                      59: { top: '56%', left: '42%' },
                      60: { top: '56%', left: '52%' },
                      61: { top: '56%', left: '62%' },
                      62: { top: '56%', left: '72%' },
                      63: { top: '70%', left: '42%' },
                      64: { top: '70%', left: '52%' },
                    };
                    const position = tablePositions[table.tableNumber];
                    
                    return position && (
                      <div
                        key={table.id}
                        className="absolute"
                        style={{ top: position.top, left: position.left }}
                      >
                        <Card className="w-14 h-14 rounded-full overflow-hidden relative shadow-lg border-2 border-primary-foreground/10 bg-white/80 backdrop-blur-sm">
                          <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-0.5 p-1">
                            <div className="text-xs font-bold text-center w-full mb-0.5">{table.tableNumber}</div>
                            {tableSeats.map((seat) => {
                              const isSelected = isSeatSelected(table.id, seat.seatNumber);
                              return (
                                <Button
                                  key={seat.id}
                                  size="sm"
                                  variant={isSelected ? "default" : seat.isAvailable ? "secondary" : "ghost"}
                                  className={cn(
                                    "h-5 w-5 p-0 text-[10px] rounded-full",
                                    isSelected && "bg-primary hover:bg-primary/90",
                                    !isSelected && seat.isAvailable && "bg-green-500 hover:bg-green-600 text-white",
                                    !isSelected && !seat.isAvailable && "bg-gray-300 text-gray-500 hover:bg-gray-300 cursor-not-allowed"
                                  )}
                                  disabled={!seat.isAvailable && !isSelected}
                                  onClick={() => handleSeatToggle(table.id, seat.seatNumber)}
                                >
                                  {seat.seatNumber}
                                </Button>
                              );
                            })}
                          </div>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
