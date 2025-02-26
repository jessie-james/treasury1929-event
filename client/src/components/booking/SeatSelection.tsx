import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";

interface Props {
  onComplete: (selectedSeats: number[]) => void;
}

export function SeatSelection({ onComplete }: Props) {
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);

  const tables = Array.from({ length: 20 }, (_, i) => i + 1);
  const seatsPerTable = 4;

  const handleSeatToggle = (tableId: number, seatNumber: number) => {
    const seatId = (tableId - 1) * seatsPerTable + seatNumber;
    
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter(id => id !== seatId));
    } else {
      if (selectedSeats.length >= 4) {
        toast({
          title: "Maximum seats reached",
          description: "You can only select up to 4 seats",
          variant: "destructive"
        });
        return;
      }
      setSelectedSeats([...selectedSeats, seatId]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Select Your Seats</h2>
        <p className="text-muted-foreground">
          Choose up to 4 seats. Tables are arranged in 2 columns.
        </p>
      </div>

      <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
        <div className="grid grid-cols-2 gap-6">
          {tables.map((tableId) => (
            <div
              key={tableId}
              className="p-4 border rounded-lg space-y-2"
            >
              <p className="font-medium">Table {tableId}</p>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: seatsPerTable }, (_, i) => i + 1).map((seatNumber) => {
                  const seatId = (tableId - 1) * seatsPerTable + seatNumber;
                  const isSelected = selectedSeats.includes(seatId);

                  return (
                    <Button
                      key={seatNumber}
                      variant={isSelected ? "default" : "outline"}
                      className="h-12"
                      onClick={() => handleSeatToggle(tableId, seatNumber)}
                    >
                      Seat {seatNumber}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex justify-between items-center">
        <p>{selectedSeats.length} seats selected</p>
        <Button
          onClick={() => onComplete(selectedSeats)}
          disabled={selectedSeats.length === 0}
        >
          Continue to Food Selection
        </Button>
      </div>
    </div>
  );
}
