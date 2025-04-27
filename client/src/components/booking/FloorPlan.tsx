import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Seat, SeatBooking } from '@shared/schema';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

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
    <div className="space-y-4">
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
              <div className="relative w-full h-[500px] overflow-auto bg-white border rounded-lg">
                <img 
                  src="/uploads/main-floor.png" 
                  alt="Main Floor Layout" 
                  className="absolute inset-0 w-full h-full object-contain" 
                />
                
                <div className="relative w-full h-full" style={{ pointerEvents: 'none' }}>
                  {tables.map((table) => (
                    <div 
                      key={table.id}
                      className="absolute"
                      style={{ 
                        left: `${table.x}px`, 
                        top: `${table.y}px`,
                        pointerEvents: 'auto'
                      }}
                    >
                      <div 
                        className="cursor-pointer bg-transparent"
                        style={{ 
                          width: '25px', 
                          height: '25px', 
                          borderRadius: '50%', 
                          position: 'relative',
                          border: table.id === selectedTable ? '2px solid #3b82f6' : 'none'
                        }}
                        onClick={() => onTableSelect(table.id)}
                      >
                        <div className="absolute -bottom-6 -right-6 bg-white bg-opacity-50 px-1 rounded-full">
                          <span className="text-xs font-bold">{table.tableNumber}</span>
                        </div>
                        
                        {table.id === selectedTable && !tableSeatsLoading && !seatsLoading && (
                          <div className="absolute top-0 left-0">
                            {seatsWithAvailability.map(seat => (
                              <div
                                key={seat.id}
                                className={`absolute w-5 h-5 rounded-sm cursor-pointer border border-black ${
                                  selectedSeats.includes(seat.seatNumber)
                                    ? 'bg-blue-500'
                                    : seat.isAvailable
                                    ? 'bg-white'
                                    : 'bg-gray-300 cursor-not-allowed'
                                }`}
                                style={{
                                  left: seat.x - 60,
                                  top: seat.y - 60,
                                  transform: 'scale(0.8)'
                                }}
                                onClick={() => 
                                  seat.isAvailable || selectedSeats.includes(seat.seatNumber) 
                                    ? onSeatSelect(table.id, seat.seatNumber, !seat.isAvailable)
                                    : undefined
                                }
                              >
                                <span className="flex items-center justify-center text-xs h-full">
                                  {seat.seatNumber}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="mezzanine" className="pt-4">
          <Card>
            <CardContent className="p-1 sm:p-6">
              <div className="relative w-full h-[500px] overflow-auto bg-white border rounded-lg">
                <img 
                  src="/uploads/mezzanine.png" 
                  alt="Mezzanine Floor Layout" 
                  className="absolute inset-0 w-full h-full object-contain" 
                />
                
                <div className="relative w-full h-full" style={{ pointerEvents: 'none' }}>
                  {tables.map((table) => (
                    <div 
                      key={table.id}
                      className="absolute"
                      style={{ 
                        left: `${table.x}px`, 
                        top: `${table.y}px`,
                        pointerEvents: 'auto'
                      }}
                    >
                      <div 
                        className="cursor-pointer bg-transparent"
                        style={{ 
                          width: '25px', 
                          height: '25px', 
                          borderRadius: '50%', 
                          position: 'relative',
                          border: table.id === selectedTable ? '2px solid #3b82f6' : 'none'
                        }}
                        onClick={() => onTableSelect(table.id)}
                      >
                        <div className="absolute -bottom-6 -right-6 bg-white bg-opacity-50 px-1 rounded-full">
                          <span className="text-xs font-bold">{table.tableNumber}</span>
                        </div>
                        
                        {table.id === selectedTable && !tableSeatsLoading && !seatsLoading && (
                          <div className="absolute top-0 left-0">
                            {seatsWithAvailability.map(seat => (
                              <div
                                key={seat.id}
                                className={`absolute w-5 h-5 rounded-sm cursor-pointer border border-black ${
                                  selectedSeats.includes(seat.seatNumber)
                                    ? 'bg-blue-500'
                                    : seat.isAvailable
                                    ? 'bg-white'
                                    : 'bg-gray-300 cursor-not-allowed'
                                }`}
                                style={{
                                  left: seat.x - 60,
                                  top: seat.y - 60,
                                  transform: 'scale(0.8)'
                                }}
                                onClick={() => 
                                  seat.isAvailable || selectedSeats.includes(seat.seatNumber) 
                                    ? onSeatSelect(table.id, seat.seatNumber, !seat.isAvailable)
                                    : undefined
                                }
                              >
                                <span className="flex items-center justify-center text-xs h-full">
                                  {seat.seatNumber}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-100 border border-green-300"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-200 border border-gray-300"></div>
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-primary border border-primary"></div>
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
}