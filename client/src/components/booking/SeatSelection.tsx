import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { type Table, type Seat } from "@shared/schema";

interface Props {
  eventId: number;
  onComplete: (selection: { tableId: number; seatNumbers: number[] }) => void;
}

interface SeatWithAvailability extends Seat {
  isAvailable: boolean;
}

export function SeatSelection({ eventId, onComplete }: Props) {
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);

  const { data: tables, isLoading: tablesLoading } = useQuery<Table[]>({
    queryKey: ["/api/tables"],
  });

  const { data: seats, isLoading: seatsLoading } = useQuery<SeatWithAvailability[]>({
    queryKey: [`/api/tables/${selectedTableId}/seats`, eventId],
    enabled: selectedTableId !== null,
  });

  const handleSeatToggle = (seatNumber: number) => {
    if (selectedSeats.includes(seatNumber)) {
      setSelectedSeats(selectedSeats.filter(id => id !== seatNumber));
    } else {
      if (selectedSeats.length >= 4) {
        toast({
          title: "Maximum seats reached",
          description: "You can only select up to 4 seats",
          variant: "destructive"
        });
        return;
      }
      setSelectedSeats([...selectedSeats, seatNumber]);
    }
  };

  const handleTableSelect = (tableId: number) => {
    if (selectedTableId === tableId) {
      setSelectedTableId(null);
      setSelectedSeats([]);
    } else {
      if (selectedSeats.length > 0) {
        toast({
          title: "Clear current selection",
          description: "Please deselect seats from the current table before selecting a new table",
          variant: "destructive"
        });
        return;
      }
      setSelectedTableId(tableId);
    }
  };

  if (tablesLoading) {
    return <div>Loading tables...</div>;
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
        <div className="grid grid-cols-2 gap-6">
          {tables?.map((table) => {
            const isTableSelected = selectedTableId === table.id;
            const tableSeats = isTableSelected ? seats : [];

            return (
              <div
                key={table.id}
                className={`p-4 border rounded-lg space-y-2 cursor-pointer ${
                  isTableSelected ? 'border-primary' : ''
                }`}
                onClick={() => handleTableSelect(table.id)}
              >
                <p className="font-medium">Table {table.tableNumber}</p>
                <div className="grid grid-cols-2 gap-2">
                  {isTableSelected && !seatsLoading ? (
                    tableSeats?.map((seat) => {
                      const isSelected = selectedSeats.includes(seat.seatNumber);

                      return (
                        <Button
                          key={seat.id}
                          variant={isSelected ? "default" : "outline"}
                          className="h-12"
                          disabled={!seat.isAvailable && !isSelected}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSeatToggle(seat.seatNumber);
                          }}
                        >
                          Seat {seat.seatNumber}
                          {!seat.isAvailable && " (Taken)"}
                        </Button>
                      );
                    })
                  ) : (
                    <div className="col-span-2 text-center text-sm text-muted-foreground">
                      {isTableSelected && seatsLoading ? "Loading seats..." : "Click to view seats"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="flex justify-between items-center">
        <p>{selectedSeats.length} seats selected</p>
        <Button
          onClick={() => selectedTableId && onComplete({ 
            tableId: selectedTableId, 
            seatNumbers: selectedSeats 
          })}
          disabled={selectedSeats.length === 0}
        >
          Continue to Food Selection
        </Button>
      </div>
    </div>
  );
}