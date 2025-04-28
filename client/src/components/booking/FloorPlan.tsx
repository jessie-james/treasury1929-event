import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Seat, SeatBooking } from '@shared/schema';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { TableSelectionPanel } from './TableSelectionPanel';

interface FloorPlanProps {
  eventId: number;
  selectedTable: number | null;
  selectedSeats: number[];
  onTableSelect: (tableId: number) => void;
  onSeatSelect: (tableId: number, seatNumber: number, isBooked: boolean) => void;
}

export function FloorPlan({
  eventId,
  selectedTable,
  selectedSeats,
  onTableSelect,
  onSeatSelect,
}: FloorPlanProps) {
  const [currentFloor, setCurrentFloor] = useState<string>("main");
  
  // Get all tables for the current floor
  const { data: tables, isLoading: tablesLoading } = useQuery<Table[]>({
    queryKey: ['/api/tables', { floor: currentFloor }],
  });
  
  // Get all seat availability for the selected table and event
  const { data: seatAvailability, isLoading: seatsLoading } = useQuery<SeatBooking[]>({
    queryKey: ['/api/tables/seats/availability', { tableId: selectedTable, eventId }],
    enabled: selectedTable !== null,
  });

  // Get the seats for the selected table
  const { data: tableSeats, isLoading: tableSeatsLoading } = useQuery<Seat[]>({
    queryKey: ['/api/tables/seats', { tableId: selectedTable }],
    enabled: selectedTable !== null,
  });

  // Combine the table seats with their availability
  const seatsWithAvailability = React.useMemo(() => {
    if (!tableSeats || !seatAvailability) return [];
    
    return tableSeats.map(seat => {
      const booking = seatAvailability.find(
        booking => booking.seatId === seat.id
      );
      
      return {
        id: seat.id,
        seatNumber: seat.seatNumber,
        position: seat.position,
        x: seat.x !== null ? seat.x : 0,
        y: seat.y !== null ? seat.y : 0,
        isAvailable: !booking || !booking.isBooked,
      };
    });
  }, [tableSeats, seatAvailability]);

  // Find the selected table object
  const selectedTableObject = React.useMemo(() => {
    if (!tables || !selectedTable) return null;
    return tables.find(table => table.id === selectedTable) || null;
  }, [tables, selectedTable]);

  if (tablesLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tables || tables.length === 0) {
    return <div className="text-center p-6">No tables found for this floor</div>;
  }

  return (
    <div>
      {/* Table and seat selection panel - above the floor plan */}
      <TableSelectionPanel 
        tables={tables}
        selectedTable={selectedTableObject}
        selectedSeats={selectedSeats}
        seatsWithAvailability={seatsWithAvailability}
        onTableSelect={onTableSelect}
        onSeatSelect={onSeatSelect}
        isLoading={tableSeatsLoading || seatsLoading}
      />
      
      {/* Floor plan visualization */}
      <div className="mt-6 space-y-4">
        <Tabs
          defaultValue="main"
          value={currentFloor}
          onValueChange={setCurrentFloor}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="main">Main Floor</TabsTrigger>
            <TabsTrigger value="mezzanine">Mezzanine</TabsTrigger>
          </TabsList>
          
          <TabsContent value="main" className="pt-4">
            <Card>
              <CardContent className="p-1 sm:p-6">
                <div className="relative w-full h-[600px] overflow-auto bg-white border rounded-lg">
                  {/* Main Floor PNG */}
                  <img 
                    src="/uploads/main-floor-numbered.png" 
                    alt="Main Floor Layout" 
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                  
                  {/* Highlight selected table on the floor plan */}
                  {selectedTable && tables.map(table => {
                    if (table.id === selectedTable) {
                      return (
                        <div 
                          key={table.id}
                          className="absolute"
                          style={{ 
                            left: `${table.x}px`, 
                            top: `${table.y}px`,
                            width: '60px',
                            height: '60px',
                            transform: 'translate(-50%, -50%)',
                            border: '3px solid #3b82f6',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                            zIndex: 10
                          }}
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="mezzanine" className="pt-4">
            <Card>
              <CardContent className="p-1 sm:p-6">
                <div className="relative w-full h-[600px] overflow-auto bg-white border rounded-lg">
                  {/* Mezzanine Floor PNG */}
                  <img 
                    src="/uploads/mezzanine-numbered.png" 
                    alt="Mezzanine Floor Layout" 
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                  
                  {/* Highlight selected table on the floor plan */}
                  {selectedTable && tables.map(table => {
                    if (table.id === selectedTable) {
                      return (
                        <div 
                          key={table.id}
                          className="absolute"
                          style={{ 
                            left: `${table.x}px`, 
                            top: `${table.y}px`,
                            width: '60px',
                            height: '60px',
                            transform: 'translate(-50%, -50%)',
                            border: '3px solid #3b82f6',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                            zIndex: 10
                          }}
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="flex items-center justify-center gap-4 text-sm my-4">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 flex items-center justify-center rounded-full bg-green-100 border border-green-300 text-[10px] font-bold">
              1
            </div>
            <span>Available Seat</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-200 border border-gray-300 text-[10px] font-bold text-gray-500">
              2
            </div>
            <span>Booked Seat</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 flex items-center justify-center rounded-full bg-primary border border-primary text-[10px] font-bold text-white">
              3
            </div>
            <span>Selected Seat</span>
          </div>
        </div>
      </div>
    </div>
  );
}