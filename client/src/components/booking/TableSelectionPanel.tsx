import React from 'react';
import { Table } from '@shared/schema';
import { 
  Card, 
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SeatWithAvailability {
  id: number;
  seatNumber: number;
  position: string;
  x: number;
  y: number;
  isAvailable: boolean;
}

interface TableSelectionPanelProps {
  tables: Table[];
  selectedTable: Table | null;
  selectedSeats: number[];
  seatsWithAvailability: SeatWithAvailability[];
  onTableSelect: (tableId: number) => void;
  onSeatSelect: (tableId: number, seatNumber: number, isBooked: boolean) => void;
  isLoading: boolean;
}

export function TableSelectionPanel({
  tables,
  selectedTable,
  selectedSeats,
  seatsWithAvailability,
  onTableSelect,
  onSeatSelect,
  isLoading
}: TableSelectionPanelProps) {
  // Group tables by floor for better organization
  const tablesByFloor = React.useMemo(() => {
    return tables.reduce((acc: { [key: string]: Table[] }, table) => {
      const floor = table.floor || 'unknown';
      if (!acc[floor]) {
        acc[floor] = [];
      }
      acc[floor].push(table);
      return acc;
    }, {});
  }, [tables]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Your Table & Seats</CardTitle>
        <CardDescription>
          Choose a table from the dropdown, then select your seats
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Table Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Select Table
            </label>
            <Select 
              value={selectedTable ? String(selectedTable.id) : ''} 
              onValueChange={(value) => onTableSelect(Number(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a table" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(tablesByFloor).map(([floor, floorTables]) => (
                  <React.Fragment key={floor}>
                    <div className="px-2 py-1.5 text-sm font-semibold bg-muted/50">
                      {floor.charAt(0).toUpperCase() + floor.slice(1)} Floor
                    </div>
                    {floorTables
                      .sort((a, b) => a.tableNumber - b.tableNumber)
                      .map((table) => (
                        <SelectItem key={table.id} value={String(table.id)}>
                          Table {table.tableNumber} ({table.capacity} seats)
                        </SelectItem>
                      ))
                    }
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seat Selection */}
          {selectedTable && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">
                  Select Seats for Table {selectedTable.tableNumber}
                </label>
                {selectedSeats.length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {selectedSeats.length} selected
                  </Badge>
                )}
              </div>
              
              {isLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {seatsWithAvailability.map(seat => (
                    <button
                      key={seat.id}
                      className={`
                        flex items-center justify-center p-3 rounded-md 
                        border transition-colors duration-200
                        ${selectedSeats.includes(seat.seatNumber)
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : seat.isAvailable
                            ? 'bg-background hover:bg-muted border-input' 
                            : 'bg-muted/50 text-muted-foreground cursor-not-allowed border-input'
                        }
                      `}
                      disabled={!seat.isAvailable && !selectedSeats.includes(seat.seatNumber)}
                      onClick={() => 
                        onSeatSelect(
                          selectedTable.id, 
                          seat.seatNumber, 
                          !selectedSeats.includes(seat.seatNumber)
                        )
                      }
                    >
                      <span className="text-sm font-medium">Seat {seat.seatNumber}</span>
                    </button>
                  ))}
                </div>
              )}
              
              {seatsWithAvailability.length === 0 && !isLoading && (
                <p className="text-center text-muted-foreground py-4">
                  No seats available for this table
                </p>
              )}
            </div>
          )}
          
          {/* Guide text */}
          <div className="flex items-center gap-2 mt-4 bg-muted/30 p-3 rounded-md text-sm text-muted-foreground">
            <ChevronRight className="h-4 w-4" />
            <p>The floor plan below shows a visual representation of the venue. Your selected table will be highlighted.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}