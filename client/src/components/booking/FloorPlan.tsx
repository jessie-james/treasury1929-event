import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Seat, SeatBooking } from '@shared/schema';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { TableWithSeats } from './TableShapes';
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

  // Floor plan background SVGs exactly matching the PNG images - pixel perfect
  const mainFloorBackgroundSVG = (
    <svg width="960" height="500" viewBox="0 0 960 500" className="absolute inset-0">
      {/* Main walls and outline exactly matching PNG */}
      <rect 
        x="30" y="40" 
        width="900" height="410" 
        fill="none" 
        stroke="#d1d5db" 
        strokeWidth="2" 
      />
      
      {/* Pillars/columns along the top wall exactly as in PNG */}
      <circle cx="30" cy="65" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="160" cy="65" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="290" cy="65" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="420" cy="65" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="550" cy="65" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="680" cy="65" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="810" cy="65" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="930" cy="65" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      
      {/* Bottom row pillars */}
      <circle cx="30" cy="330" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="160" cy="330" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="290" cy="330" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="420" cy="330" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="550" cy="330" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="680" cy="330" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="810" cy="330" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="930" cy="330" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      
      {/* Stage area exactly as shown in PNG */}
      <rect x="430" y="100" width="220" height="140" rx="0" fill="none" stroke="#000000" strokeWidth="1" />
      <text x="540" y="170" textAnchor="middle" fontSize="14" fontWeight="normal" fill="#000000">Open area for stage</text>
      <text x="540" y="195" textAnchor="middle" fontSize="12" fontWeight="normal" fill="#000000">26'</text>
      <text x="415" y="170" textAnchor="middle" fontSize="12" fontWeight="normal" fill="#000000" transform="rotate(-90, 415, 170)">14'</text>
      
      {/* Orange vertical divider line exactly as in PNG */}
      <line 
        x1="430" y1="65" 
        x2="430" y2="240" 
        stroke="#f97316" 
        strokeWidth="1.5" 
      />
      
      {/* Horizontal divider line exactly as in PNG */}
      <line 
        x1="30" y1="320" 
        x2="930" y2="320" 
        stroke="#d1d5db" 
        strokeWidth="1.5" 
      />
    </svg>
  );
  
  const mezzanineFloorBackgroundSVG = (
    <svg width="960" height="500" viewBox="0 0 960 500" className="absolute inset-0">
      {/* Mezzanine curved outline exactly matching PNG */}
      <path 
        d="M60,50 
         Q60,50 100,50
         L860,50
         L860,310
         L200,310
         Q120,310 60,250
         Z" 
        fill="none" 
        stroke="#d1d5db" 
        strokeWidth="2" 
      />
      
      {/* Pillars/columns along the top exactly as in PNG */}
      <circle cx="100" cy="50" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="220" cy="50" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="340" cy="50" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="460" cy="50" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="580" cy="50" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="700" cy="50" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="820" cy="50" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      
      {/* Bottom row pillars */}
      <circle cx="100" cy="310" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="220" cy="310" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="340" cy="310" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="460" cy="310" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="580" cy="310" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="700" cy="310" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="820" cy="310" r="12" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      
      {/* Stairs on the right exactly as in PNG */}
      <path 
        d="M860,100
         Q900,100 900,130
         L900,220
         Q900,250 860,250"
        fill="none" 
        stroke="#d1d5db" 
        strokeWidth="1" 
      />
      
      {/* Stair steps exactly as in PNG */}
      <path 
        d="M860,135 L900,135
         M860,145 L900,145
         M860,155 L900,155
         M860,165 L900,165
         M860,175 L900,175
         M860,185 L900,185
         M860,195 L900,195
         M860,205 L900,205
         M860,215 L900,215"
        stroke="#d1d5db" 
        strokeWidth="0.8" 
      />
      
      {/* Horizontal divider line exactly as in PNG */}
      <line 
        x1="60" y1="310" 
        x2="860" y2="310" 
        stroke="#d1d5db" 
        strokeWidth="1.5" 
      />
    </svg>
  );

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
                {mainFloorBackgroundSVG}
                <div className="relative w-full h-full">
                  {tables.map((table) => (
                    <div 
                      key={table.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2"
                      style={{ 
                        left: `${table.x}px`, 
                        top: `${table.y}px`,
                      }}
                    >
                      <TableWithSeats 
                        shape={table.shape as any}
                        tableNumber={table.tableNumber}
                        seats={
                          table.id === selectedTable && !tableSeatsLoading && !seatsLoading
                            ? seatsWithAvailability
                            : []
                        }
                        selectedSeats={selectedSeats}
                        isTableSelected={table.id === selectedTable}
                        onTableSelect={() => onTableSelect(table.id)}
                        onSeatSelect={(seatNumber, isAvailable) => 
                          onSeatSelect(table.id, seatNumber, !isAvailable)
                        }
                      />
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
                {mezzanineFloorBackgroundSVG}
                <div className="relative w-full h-full">
                  {tables.map((table) => (
                    <div 
                      key={table.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2"
                      style={{ 
                        left: `${table.x}px`, 
                        top: `${table.y}px`,
                      }}
                    >
                      <TableWithSeats 
                        shape={table.shape as any}
                        tableNumber={table.tableNumber}
                        seats={
                          table.id === selectedTable && !tableSeatsLoading && !seatsLoading
                            ? seatsWithAvailability
                            : []
                        }
                        selectedSeats={selectedSeats}
                        isTableSelected={table.id === selectedTable}
                        onTableSelect={() => onTableSelect(table.id)}
                        onSeatSelect={(seatNumber, isAvailable) => 
                          onSeatSelect(table.id, seatNumber, !isAvailable)
                        }
                      />
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