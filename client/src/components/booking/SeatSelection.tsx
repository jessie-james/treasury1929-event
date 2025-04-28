
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { type Table, type Seat } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ChevronUp, ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [activeTab, setActiveTab] = useState<string>("main-floor");
  const [modalTable, setModalTable] = useState<Table | null>(null);

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
  
  // Group tables by main floor and mezzanine
  const mainFloorTables = tables?.filter(t => t.tableNumber <= 32) || [];
  const mezzanineTables = tables?.filter(t => t.tableNumber > 32) || [];

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
    
    // Close the modal after selecting a seat
    if (modalTable && modalTable.id === tableId) {
      toast({
        title: selectedSeats.some(s => s.tableId === tableId && s.seatNumber === seatNumber) 
          ? "Seat removed" 
          : "Seat selected",
        description: `Table ${modalTable.tableNumber}, Seat ${seatNumber}`,
      });
    }
  };

  const isSeatSelected = (tableId: number, seatNumber: number) => {
    return selectedSeats.some(s => s.tableId === tableId && s.seatNumber === seatNumber);
  };
  
  const getTableStatus = (tableId: number) => {
    const tableSeats = allSeats?.[tableId] || [];
    const totalSeats = tableSeats.length;
    const availableSeats = tableSeats.filter(s => s.isAvailable).length;
    const selectedSeatsCount = selectedSeats.filter(s => s.tableId === tableId).length;
    
    if (availableSeats === 0) return "unavailable";
    if (selectedSeatsCount > 0) return "selected";
    return "available";
  };

  // Get table style based on its status
  const getTableStyle = (status: string) => {
    switch (status) {
      case "selected":
        return "bg-primary text-primary-foreground border-primary hover:bg-primary/90";
      case "available":
        return "bg-white/80 border-slate-200 hover:bg-slate-100";
      case "unavailable":
        return "bg-gray-200 text-gray-500 border-gray-300 opacity-60 cursor-not-allowed";
      default:
        return "bg-white/80 border-slate-200";
    }
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
          <Alert variant="destructive" className="bg-yellow-50 border-yellow-200">
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

      {/* Main floor plan and interaction */}
      <Tabs defaultValue="main-floor" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="main-floor">Main Floor</TabsTrigger>
          <TabsTrigger value="mezzanine">Mezzanine</TabsTrigger>
        </TabsList>
        
        <TabsContent value="main-floor" className="border rounded-md overflow-hidden">
          <div className="relative w-full" style={{ height: '600px' }}>
            <iframe 
              src="/main-floor.html" 
              className="absolute inset-0 w-full h-full border-0"
              title="Main Floor Layout"
            />
            <div className="absolute inset-0">
              {mainFloorTables.map((table) => {
                const tableStatus = getTableStatus(table.id);
                const tableSeats = allSeats?.[table.id] || [];
                const availableSeats = tableSeats.filter(s => s.isAvailable).length;
                
                // Table positions - calculated based on the floor plan
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
                
                // Skip tables without position data
                if (!position) return null;
                
                // Calculate count of selected seats at this table
                const selectedCount = selectedSeats.filter(s => s.tableId === table.id).length;
                
                return (
                  <div
                    key={table.id}
                    className="absolute z-10"
                    style={{ top: position.top, left: position.left }}
                  >
                    <Button
                      className={cn(
                        "w-12 h-12 rounded-full overflow-hidden relative border-2 shadow-lg backdrop-blur-sm font-bold p-0",
                        getTableStyle(tableStatus)
                      )}
                      disabled={tableStatus === "unavailable"}
                      onClick={() => setModalTable(table)}
                    >
                      {table.tableNumber}
                      {selectedCount > 0 && (
                        <div className="absolute bottom-0 right-0 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                          {selectedCount}
                        </div>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="mezzanine" className="border rounded-md overflow-hidden">
          <div className="relative w-full" style={{ height: '600px' }}>
            <iframe 
              src="/mezzanine-floor.html" 
              className="absolute inset-0 w-full h-full border-0"
              title="Mezzanine Floor Layout"
            />
            <div className="absolute inset-0">
              {mezzanineTables.map((table) => {
                const tableStatus = getTableStatus(table.id);
                const tableSeats = allSeats?.[table.id] || [];
                const availableSeats = tableSeats.filter(s => s.isAvailable).length;
                
                // Table positions - calculated based on the floor plan
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
                
                // Skip tables without position data
                if (!position) return null;
                
                // Calculate count of selected seats at this table
                const selectedCount = selectedSeats.filter(s => s.tableId === table.id).length;
                
                return (
                  <div
                    key={table.id}
                    className="absolute z-10"
                    style={{ top: position.top, left: position.left }}
                  >
                    <Button
                      className={cn(
                        "w-12 h-12 rounded-full overflow-hidden relative border-2 shadow-lg backdrop-blur-sm font-bold p-0",
                        getTableStyle(tableStatus)
                      )}
                      disabled={tableStatus === "unavailable"}
                      onClick={() => setModalTable(table)}
                    >
                      {table.tableNumber}
                      {selectedCount > 0 && (
                        <div className="absolute bottom-0 right-0 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                          {selectedCount}
                        </div>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-white border border-slate-200"></div>
          <span className="text-sm text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-primary"></div>
          <span className="text-sm text-muted-foreground">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gray-200"></div>
          <span className="text-sm text-muted-foreground">Unavailable</span>
        </div>
      </div>
      
      {/* Table Modal */}
      {modalTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModalTable(null)}>
          <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Table {modalTable.tableNumber}</h3>
              <Button variant="ghost" size="sm" onClick={() => setModalTable(null)}>×</Button>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-2">Select seats for this table:</p>
              <div className="grid grid-cols-2 gap-3">
                {allSeats?.[modalTable.id]?.map((seat) => {
                  const isSelected = isSeatSelected(modalTable.id, seat.seatNumber);
                  return (
                    <Button
                      key={seat.id}
                      variant={isSelected ? "default" : seat.isAvailable ? "outline" : "ghost"}
                      className={cn(
                        "h-16 relative",
                        isSelected && "bg-primary hover:bg-primary/90",
                        !isSelected && seat.isAvailable && "border-2 hover:bg-slate-100",
                        !isSelected && !seat.isAvailable && "bg-gray-100 text-gray-400 hover:bg-gray-100 cursor-not-allowed"
                      )}
                      disabled={!seat.isAvailable && !isSelected}
                      onClick={() => handleSeatToggle(modalTable.id, seat.seatNumber)}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-xs">Seat</span>
                        <span className="text-2xl font-bold">{seat.seatNumber}</span>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={() => setModalTable(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
