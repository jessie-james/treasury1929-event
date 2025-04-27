import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Table {
  id: number;
  tableNumber: number;
  capacity: number;
  floor: string;
  x: number;
  y: number;
  shape: string;
}

interface Seat {
  id: number;
  tableId: number;
  seatNumber: number;
  position: string;
  x: number;
  y: number;
  isAvailable: boolean;
}

interface FloorPlanProps {
  eventId: number;
  selectedTable?: number;
  selectedSeats?: number[];
  onTableSelect?: (tableId: number) => void;
  onSeatSelect?: (tableId: number, seatNumber: number, isAvailable: boolean) => void;
  className?: string;
}

export function FloorPlan({
  eventId,
  selectedTable,
  selectedSeats = [],
  onTableSelect,
  onSeatSelect,
  className
}: FloorPlanProps) {
  const [activeFloor, setActiveFloor] = useState<string>('main');
  
  // Fetch tables by floor
  const tablesQuery = useQuery({
    queryKey: ['/api/tables', activeFloor],
    queryFn: async () => {
      const response = await fetch(`/api/tables?floor=${activeFloor}`);
      if (!response.ok) throw new Error('Failed to fetch tables');
      return response.json() as Promise<Table[]>;
    }
  });
  
  // Fetch seats for the selected table
  const seatsQuery = useQuery({
    queryKey: ['/api/tables', selectedTable, 'seats', eventId],
    queryFn: async () => {
      if (!selectedTable) return [];
      const response = await fetch(`/api/tables/${selectedTable}/seats?eventId=${eventId}`);
      if (!response.ok) throw new Error('Failed to fetch seats');
      return response.json() as Promise<Seat[]>;
    },
    enabled: !!selectedTable
  });
  
  // Scale factor for visual layout
  const scaleFactor = 0.8;
  
  return (
    <div className={cn("w-full flex flex-col gap-4", className)}>
      <Tabs defaultValue="main" onValueChange={setActiveFloor}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="main">Main Floor</TabsTrigger>
          <TabsTrigger value="mezzanine">Mezzanine</TabsTrigger>
        </TabsList>
        
        {['main', 'mezzanine'].map(floor => (
          <TabsContent key={floor} value={floor} className="h-full">
            <div className="relative w-full overflow-auto border rounded-md bg-gray-50 h-[500px]">
              {/* Stage area for main floor */}
              {floor === 'main' && (
                <div 
                  className="absolute bg-gray-200 border border-gray-400 flex items-center justify-center" 
                  style={{
                    left: 430 * scaleFactor,
                    top: 165 * scaleFactor,
                    width: 260 * scaleFactor,
                    height: 140 * scaleFactor
                  }}
                >
                  <p className="text-gray-600 font-medium">Stage</p>
                </div>
              )}
              
              {/* Loading state */}
              {tablesQuery.isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              
              {/* Error state */}
              {tablesQuery.isError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-destructive">Failed to load tables. Please try again.</p>
                </div>
              )}
              
              {/* Tables */}
              {tablesQuery.data?.map(table => (
                <div 
                  key={table.id}
                  className={cn(
                    "absolute cursor-pointer transition-all duration-200 flex flex-col items-center justify-center",
                    selectedTable === table.id ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/50"
                  )}
                  style={{
                    left: table.x * scaleFactor,
                    top: table.y * scaleFactor,
                    width: (table.shape === 'round' ? 50 : 60) * scaleFactor,
                    height: (table.shape === 'round' ? 50 : 60) * scaleFactor,
                    borderRadius: table.shape === 'round' ? '50%' : '4px',
                    backgroundColor: selectedTable === table.id ? 'rgb(226, 232, 240)' : 'white',
                    border: '1px solid rgb(203, 213, 225)'
                  }}
                  onClick={() => onTableSelect && onTableSelect(table.id)}
                >
                  <span className="text-xs font-semibold">{table.tableNumber}</span>
                  
                  {/* Only show seats if this table is selected */}
                  {selectedTable === table.id && seatsQuery.data?.map(seat => (
                    <div
                      key={seat.id}
                      className={cn(
                        "absolute w-4 h-4 rounded-full cursor-pointer",
                        "flex items-center justify-center text-[10px]",
                        selectedSeats.includes(seat.seatNumber) 
                          ? "bg-primary text-primary-foreground"
                          : seat.isAvailable 
                            ? "bg-green-100 border border-green-300 hover:bg-green-200"
                            : "bg-gray-200 border border-gray-300 cursor-not-allowed"
                      )}
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        marginLeft: seat.x * scaleFactor,
                        marginTop: seat.y * scaleFactor
                      }}
                      onClick={() => {
                        if (seat.isAvailable && onSeatSelect) {
                          onSeatSelect(table.id, seat.seatNumber, seat.isAvailable);
                        }
                      }}
                    >
                      {seat.seatNumber}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
      
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-100 border border-green-300"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-200 border border-gray-300"></div>
          <span>Unavailable</span>
        </div>
      </div>
    </div>
  );
}