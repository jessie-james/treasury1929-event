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

  // Floor plan background SVGs exactly matching the PNG images
  const mainFloorBackgroundSVG = (
    <svg width="960" height="500" viewBox="0 0 960 500" className="absolute inset-0">
      {/* Main walls and outline */}
      <path 
        d="M60,60 L900,60 L900,450 L60,450 Z" 
        fill="none" 
        stroke="#94a3b8" 
        strokeWidth="3" 
      />
      
      {/* Pillars/columns along the walls */}
      <circle cx="100" cy="60" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="230" cy="60" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="360" cy="60" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="490" cy="60" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="620" cy="60" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="750" cy="60" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="880" cy="60" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      
      {/* Bottom pillars */}
      <circle cx="60" cy="320" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="180" cy="320" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="300" cy="320" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="420" cy="320" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="540" cy="320" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="660" cy="320" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="780" cy="320" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="900" cy="320" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      
      {/* Stage area */}
      <rect x="410" y="100" width="200" height="120" rx="0" fill="rgba(226, 232, 240, 0.3)" stroke="#94a3b8" strokeWidth="2" />
      <text x="510" y="165" textAnchor="middle" className="text-base font-medium" fill="#64748b">Open area for stage</text>
      <text x="510" y="190" textAnchor="middle" className="text-sm font-medium" fill="#64748b">26'</text>
      <text x="400" y="160" textAnchor="middle" className="text-sm font-medium" fill="#64748b" transform="rotate(-90, 400, 160)">14'</text>
      
      {/* Horizontal divider lines */}
      <path 
        d="M60,320 L900,320" 
        stroke="#94a3b8" 
        strokeWidth="2" 
      />
      
      {/* Vertical divider line */}
      <path 
        d="M410,60 L410,220" 
        stroke="#f97316" 
        strokeWidth="2" 
      />
      
      {/* Service areas */}
      <rect x="60" y="60" width="50" height="50" rx="0" fill="rgba(226, 232, 240, 0.3)" stroke="#94a3b8" strokeWidth="1" />
    </svg>
  );
  
  const mezzanineFloorBackgroundSVG = (
    <svg width="960" height="500" viewBox="0 0 960 500" className="absolute inset-0">
      {/* Mezzanine curved outline */}
      <path 
        d="M60,60 
        C60,60 100,60 120,60
        L880,60 
        L880,310 
        L200,310
        C120,310 60,250 60,190
        Z" 
        fill="none" 
        stroke="#94a3b8" 
        strokeWidth="3" 
      />
      
      {/* Pillars/columns along the top */}
      <circle cx="100" cy="60" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="230" cy="60" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="360" cy="60" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="490" cy="60" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="620" cy="60" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="750" cy="60" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="880" cy="60" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      
      {/* Bottom pillars */}
      <circle cx="100" cy="310" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="230" cy="310" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="360" cy="310" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="490" cy="310" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="620" cy="310" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="750" cy="310" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="880" cy="310" r="15" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      
      {/* Stairs on the right */}
      <path 
        d="M880,140 
        C910,140 920,150 920,170
        L920,250
        C920,270 910,280 880,280"
        fill="none" 
        stroke="#94a3b8" 
        strokeWidth="2" 
      />
      
      {/* Stair steps */}
      <path 
        d="M880,170 L920,170
        M880,180 L920,180
        M880,190 L920,190
        M880,200 L920,200
        M880,210 L920,210
        M880,220 L920,220
        M880,230 L920,230
        M880,240 L920,240
        M880,250 L920,250"
        stroke="#94a3b8" 
        strokeWidth="1" 
      />
      <text x="900" y="160" textAnchor="middle" className="text-xs font-medium" fill="#64748b">STAIRS</text>
      
      {/* Horizontal divider line */}
      <path 
        d="M60,310 L880,310" 
        stroke="#94a3b8" 
        strokeWidth="2" 
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