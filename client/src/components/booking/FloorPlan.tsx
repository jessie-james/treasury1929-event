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

  // Floor plan background SVGs matching the PNG images
  const mainFloorBackgroundSVG = (
    <svg width="960" height="500" viewBox="0 0 960 500" className="absolute inset-0">
      {/* Main room outline */}
      <path 
        d="M70,40 L890,40 L890,450 L70,450 Z" 
        fill="rgba(245, 247, 250, 0.4)" 
        stroke="#94a3b8" 
        strokeWidth="2" 
      />
      
      {/* Stage area at the top */}
      <rect x="380" y="40" width="200" height="80" rx="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <text x="480" y="85" textAnchor="middle" className="text-xs font-medium" fill="#64748b">STAGE</text>
      
      {/* Left bar area */}
      <rect x="70" y="40" width="120" height="70" rx="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <text x="130" y="75" textAnchor="middle" className="text-xs font-medium" fill="#64748b">BAR</text>
      
      {/* Right entrance area */}
      <rect x="750" y="40" width="140" height="70" rx="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <text x="820" y="75" textAnchor="middle" className="text-xs font-medium" fill="#64748b">ENTRANCE</text>
      
      {/* Dance floor in the center */}
      <rect x="400" y="200" width="160" height="140" rx="4" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1" />
      <text x="480" y="270" textAnchor="middle" className="text-sm font-medium" fill="#64748b">DANCE FLOOR</text>
      
      {/* Service areas and additional details */}
      <rect x="70" y="140" width="100" height="60" rx="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <text x="120" y="170" textAnchor="middle" className="text-xs font-medium" fill="#64748b">SERVICE</text>
      
      {/* Indicated walkways/aisles */}
      <path 
        d="M170,195 L400,195 M560,195 L770,195 M480,140 L480,200 M480,340 L480,450" 
        stroke="#cbd5e1" 
        strokeWidth="5" 
        strokeDasharray="5,5" 
      />
    </svg>
  );
  
  const mezzanineFloorBackgroundSVG = (
    <svg width="960" height="500" viewBox="0 0 960 500" className="absolute inset-0">
      {/* Mezzanine outline with the curved shape */}
      <path 
        d="M380,120 L880,120 L880,400 L450,400 C420,350 380,350 380,300 Z" 
        fill="rgba(245, 247, 250, 0.4)" 
        stroke="#94a3b8" 
        strokeWidth="2" 
      />
      
      {/* Mezzanine stage view at the top */}
      <rect x="380" y="70" width="200" height="50" rx="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <text x="480" y="100" textAnchor="middle" className="text-xs font-medium" fill="#64748b">STAGE VIEW</text>
      
      {/* Bar area on the right side */}
      <rect x="780" y="150" width="100" height="60" rx="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <text x="830" y="180" textAnchor="middle" className="text-xs font-medium" fill="#64748b">BAR</text>
      
      {/* Stairs on the left side */}
      <rect x="380" y="250" width="40" height="80" rx="0" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1" />
      <line x1="380" y1="260" x2="420" y2="260" stroke="#94a3b8" strokeWidth="1" />
      <line x1="380" y1="270" x2="420" y2="270" stroke="#94a3b8" strokeWidth="1" />
      <line x1="380" y1="280" x2="420" y2="280" stroke="#94a3b8" strokeWidth="1" />
      <line x1="380" y1="290" x2="420" y2="290" stroke="#94a3b8" strokeWidth="1" />
      <line x1="380" y1="300" x2="420" y2="300" stroke="#94a3b8" strokeWidth="1" />
      <line x1="380" y1="310" x2="420" y2="310" stroke="#94a3b8" strokeWidth="1" />
      <line x1="380" y1="320" x2="420" y2="320" stroke="#94a3b8" strokeWidth="1" />
      <text x="400" y="240" textAnchor="middle" className="text-xs font-medium" fill="#64748b">STAIRS</text>
      
      {/* Indicated walkways/aisles */}
      <path 
        d="M420,250 L700,250 M660,250 L660,400" 
        stroke="#cbd5e1" 
        strokeWidth="5" 
        strokeDasharray="5,5" 
      />
      
      {/* Railing along the view edge */}
      <path 
        d="M450,150 L880,150" 
        stroke="#94a3b8" 
        strokeWidth="2" 
        strokeDasharray="8,4" 
      />
      <text x="500" y="170" textAnchor="middle" className="text-xs font-medium" fill="#64748b">RAILING</text>
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