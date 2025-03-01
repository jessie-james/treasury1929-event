import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { type Table, type Seat } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  eventId: number;
  onComplete: (selection: { tableId: number; seatNumbers: number[] }) => void;
}

interface SeatWithAvailability extends Seat {
  isAvailable: boolean;
}

export function SeatSelection({ eventId, onComplete }: Props) {
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

      // Check if selecting from a different table
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <h2 className="text-2xl font-bold">Select Your Seats</h2>
        <p className="text-muted-foreground">
          Choose up to 4 seats from a single table
        </p>
      </div>

      <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {tables?.map((table) => {
            const tableSeats = allSeats?.[table.id] || [];

            return (
              <Card key={table.id} className={cn(
                "overflow-hidden",
                selectedSeats.some(s => s.tableId === table.id) && "border-primary"
              )}>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Table {table.tableNumber}</h3>
                    <div className="grid grid-cols-2 gap-2 relative">
                      {/* Visual table representation */}
                      <div className="absolute inset-4 border-2 border-muted-foreground/20 rounded-lg" />

                      {tableSeats.map((seat) => {
                        const isSelected = isSeatSelected(table.id, seat.seatNumber);
                        const seatPosition = seat.seatNumber % 2 === 0 ? "justify-self-end" : "justify-self-start";

                        return (
                          <Button
                            key={seat.id}
                            variant={isSelected ? "default" : "outline"}
                            className={cn(
                              "h-12 relative z-10",
                              seatPosition,
                              !seat.isAvailable && !isSelected && "opacity-50"
                            )}
                            disabled={!seat.isAvailable && !isSelected}
                            onClick={() => handleSeatToggle(table.id, seat.seatNumber)}
                          >
                            Seat {seat.seatNumber}
                            {!seat.isAvailable && !isSelected && " (Taken)"}
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
      </ScrollArea>

      <div className="flex justify-between items-center">
        <p className="text-sm">{selectedSeats.length} seats selected</p>
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
    </div>
  );
}