import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import { TableLayoutCanvas } from "@/components/shared/TableLayoutCanvas";

interface Props {
  eventId: number;
  onComplete: (selection: { tableId: number; seatNumbers: number[] }) => void;
  hasExistingBooking?: boolean;
  selectedVenueIndex?: number;
  onBack?: () => void;
}

interface VenueTable {
  id: number;
  tableNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  shape: string;
  rotation: number;
  status: string;
}

interface VenueStage {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface EventVenueLayout {
  eventVenueId: number;
  displayName: string;
  displayOrder: number;
  venue: {
    id: number;
    name: string;
    width: number;
    height: number;
  };
  tables: VenueTable[];
  stages: VenueStage[];
}

interface VenueLayout {
  venue: {
    id: number;
    name: string;
    width: number;
    height: number;
  };
  tables: VenueTable[];
  stages: VenueStage[];
}

// Viewport state removed - handled by TableLayoutCanvas component

// Custom hook for canvas drawing operations
// Canvas renderer replaced with unified TableLayoutCanvas component

export function IframeSeatSelection({ eventId, onComplete, hasExistingBooking, selectedVenueIndex: propSelectedVenueIndex, onBack }: Props) {
  const [selectedTable, setSelectedTable] = useState<VenueTable | null>(null);
  const [selectedVenueIndex, setSelectedVenueIndex] = useState<number>(propSelectedVenueIndex ?? 0);
  const [desiredGuestCount, setDesiredGuestCount] = useState(2); // Number of guests the user wants to bring
  const [zoomLevel, setZoomLevel] = useState(1.0); // Zoom level for desktop users

  console.log('🎯 IframeSeatSelection props:', { eventId, propSelectedVenueIndex, selectedVenueIndex });

  // Sync venue index with prop changes
  useEffect(() => {
    console.log('🔄 Venue index prop changed:', { propSelectedVenueIndex, currentSelectedVenueIndex: selectedVenueIndex });
    if (propSelectedVenueIndex !== undefined) {
      setSelectedVenueIndex(propSelectedVenueIndex);
    }
  }, [propSelectedVenueIndex]);

  // Fetch event venue layouts using the new API
  const { data: eventVenueLayouts, isLoading: isLoadingVenues, error: venueError } = useQuery({
    queryKey: [`/api/events/${eventId}/venue-layouts`],
    enabled: !!eventId,
    retry: 1,
    throwOnError: false
  });

  // Fallback: Fetch event data if venue layouts aren't available
  const { data: eventData, isLoading: isLoadingEvent } = useQuery({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId && (!eventVenueLayouts || !!venueError),
    retry: 2,
    throwOnError: false
  });

  // Fetch existing bookings
  const { data: existingBookings, error: bookingsError } = useQuery({
    queryKey: ['/api/event-bookings', eventId],
    enabled: !!eventId,
    retry: 2,
    throwOnError: false
  });

  // Real-time availability check to prevent sold-out bypass
  const { data: realTimeAvailability } = useQuery({
    queryKey: [`/api/events/${eventId}/availability`],
    enabled: !!eventId,
    refetchInterval: 15000, // Refresh every 15 seconds during booking
    throwOnError: false
  });

  // Get the current venue layout based on selected venue or fallback to event data
  const currentVenueLayout: VenueLayout | undefined = useMemo(() => {
    console.log('🔍 VENUE SELECTION DEBUG:', {
      eventVenueLayouts: eventVenueLayouts,
      selectedVenueIndex,
      layoutsLength: (eventVenueLayouts as any[])?.length,
      layouts: (eventVenueLayouts as any[])?.map(l => ({ 
        eventVenueId: l.eventVenueId, 
        displayName: l.displayName, 
        venueName: l.venue.name,
        tableCount: l.tables?.length 
      }))
    });
    
    // First try new venue layouts system
    if (eventVenueLayouts && Array.isArray(eventVenueLayouts) && eventVenueLayouts.length > 0) {
      // Ensure selectedVenueIndex is within bounds
      const safeIndex = Math.max(0, Math.min(selectedVenueIndex, eventVenueLayouts.length - 1));
      const selected = eventVenueLayouts[safeIndex];
      
      console.log('📍 Selected venue layout:', {
        selectedIndex: selectedVenueIndex,
        safeIndex,
        selected: selected,
        venueName: selected?.venue?.name,
        displayName: selected?.displayName,
        tableCount: selected?.tables?.length
      });
      
      if (selected && selected.tables && selected.venue) {
        return {
          venue: selected.venue,
          tables: selected.tables,
          stages: selected.stages || []
        };
      }
    }
    
    // Fallback to event data structure
    if (eventData && (eventData as any).venueLayout) {
      console.log('🔄 Using fallback event data');
      return (eventData as any).venueLayout;
    }
    
    console.log('❌ No venue layout found');
    return undefined;
  }, [eventVenueLayouts, selectedVenueIndex, eventData]);
  
  // Check if selection is valid for a table - enhanced validation for 4-top tables
  const isValidTableSelection = useCallback((table: VenueTable, guestCount: number): { valid: boolean, reason?: string } => {
    if (guestCount > table.capacity) {
      return { valid: false, reason: `This table seats ${table.capacity} guests maximum. You have ${guestCount} guests.` };
    }
    
    // Special rule for 4-top tables: cannot select 1 or 2 guests
    if (table.capacity === 4 && (guestCount === 1 || guestCount === 2)) {
      return { valid: false, reason: `4-seat tables are for 3 or 4 guests only. Please select a different table or adjust your guest count.` };
    }
    
    return { valid: true };
  }, []);
  
  // Memoize available tables calculation
  const { availableTables, bookedTableIds } = useMemo(() => {
    const bookedIds = Array.isArray(existingBookings) ? existingBookings.map((booking: any) => booking.tableId) : [];
    const available = currentVenueLayout?.tables?.filter((table: VenueTable) => 
      !bookedIds.includes(table.id)
    ) || [];
    
    return {
      availableTables: available,
      bookedTableIds: bookedIds
    };
  }, [currentVenueLayout, existingBookings]);

  // Table selection logic moved to TableLayoutCanvas component





  const isLoading = isLoadingVenues || isLoadingEvent;
  const hasError = venueError && !eventData || bookingsError;

  if (hasError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Error loading venue layout. Please try again.</p>
              <p className="text-sm mt-2">{venueError?.message || bookingsError?.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }



  // Check if event is sold out based on real-time availability
  if ((realTimeAvailability as any)?.isSoldOut) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Event Sold Out</h2>
          <p className="text-muted-foreground mb-4">
            This event is currently sold out. All tables have been reserved.
          </p>
          <Button 
            onClick={() => window.history.back()}
            variant="outline"
          >
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Back Button */}
      {onBack && (
        <div className="flex items-center gap-3 mb-6">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Seating Area
          </Button>
        </div>
      )}
      
      {/* Simple header - no nesting */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Select Your Table</h2>
            <p className="text-gray-600">
              Click on an available table in the venue layout below.
            </p>
          </div>
          
          {/* Top Action Buttons */}
          {selectedTable && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedTable(null)}
                className="px-6"
              >
                Change Table
              </Button>
              <Button
                onClick={() => {
                  const seatNumbers = Array.from({length: desiredGuestCount}, (_, i) => i + 1);
                  onComplete({
                    tableId: selectedTable.id,
                    seatNumbers: seatNumbers
                  });
                }}
                className="bg-green-600 hover:bg-green-700 px-6"
              >
                Confirm Table Selection
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Venue Selection - No card wrapper */}
      {Array.isArray(eventVenueLayouts) && eventVenueLayouts.length > 1 && (
        <div className="flex items-center gap-4 mb-4">
          <Label htmlFor="venue-select" className="font-medium text-lg">Select Venue:</Label>
          <Select
            value={selectedVenueIndex.toString()}
            onValueChange={(value) => {
              setSelectedVenueIndex(parseInt(value));
              setSelectedTable(null);
            }}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {eventVenueLayouts.map((layout: EventVenueLayout, index: number) => (
                <SelectItem key={layout.eventVenueId} value={index.toString()}>
                  {layout.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Guest Count Selection - No card wrapper */}
      <div className="flex items-center gap-4 mb-6">
        <Label htmlFor="guest-count" className="font-medium text-lg">Number of Guests:</Label>
        <Select
          value={desiredGuestCount.toString()}
          onValueChange={(value) => {
            setDesiredGuestCount(parseInt(value));
            setSelectedTable(null);
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4].map((count) => (
              <SelectItem key={count} value={count.toString()}>
                {count} {count === 1 ? 'guest' : 'guests'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-gray-600">Select number of guests for your reservation</span>
      </div>

      {/* Table Canvas - Full Width, No Containers */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">
          {currentVenueLayout?.venue?.name || "Venue Layout"}
          {Array.isArray(eventVenueLayouts) && eventVenueLayouts.length > 1 && selectedVenueIndex < eventVenueLayouts.length ? (
            <span className="text-base text-gray-500 ml-2 font-normal">
              ({(eventVenueLayouts as any[])[selectedVenueIndex]?.displayName || 'Venue'})
            </span>
          ) : null}
        </h3>
        <Badge variant="outline" className="text-sm">
          {availableTables.length} of {currentVenueLayout?.tables?.length || 0} tables available
        </Badge>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin" />
          <span className="ml-4 text-lg">Loading venue layout...</span>
        </div>
      ) : currentVenueLayout ? (
        <div className="space-y-4">
          {/* Zoom Controls for Desktop Users */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Zoom:</span>
              <button
                onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 border rounded-md"
                disabled={zoomLevel <= 0.5}
              >
                −
              </button>
              <span className="px-3 py-1 text-sm bg-gray-50 border rounded-md min-w-[60px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(Math.min(3.0, zoomLevel + 0.25))}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 border rounded-md"
                disabled={zoomLevel >= 3.0}
              >
                +
              </button>
              <button
                onClick={() => setZoomLevel(1.0)}
                className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-md"
              >
                Reset
              </button>
            </div>
            <div className="text-sm text-gray-500">
              Use scroll bars or mouse wheel to navigate
            </div>
          </div>

          {/* Desktop & Mobile scrollable canvas container */}
          <div 
            className="w-full border-2 border-gray-200 rounded-lg overflow-auto bg-white shadow-lg"
            style={{ 
              maxHeight: '70vh', 
              minHeight: '500px',
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain'
            }}
          >
            <div className="p-4">
              <div 
                style={{ 
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'top left',
                  transition: 'transform 0.2s ease-in-out'
                }}
              >
                <TableLayoutCanvas
                  tables={currentVenueLayout.tables.map(table => ({
                    ...table,
                    // CRITICAL FIX: Use backend real-time status instead of frontend override
                    status: table.status === 'booked' ? 'sold' as const : 
                            table.status === 'hold' ? 'hold' as const : 
                            'available' as const,
                    shape: table.shape as 'half' | 'full'
                  }))}
                  stages={currentVenueLayout.stages}
                  isEditorMode={false}
                  onTableSelect={(table) => {
                    console.log('🎯 Table selected:', table);
                    const validation = isValidTableSelection(table, desiredGuestCount);
                    if (!validation.valid) {
                      alert(validation.reason);
                      return;
                    }
                    setSelectedTable(table);
                  }}
                  selectedTables={selectedTable ? [selectedTable.id] : []}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-gray-600 text-lg">
            Unable to load venue layout. Please try again.
          </p>
        </div>
      )}
        
      {/* Selection Summary and Confirmation - No nesting */}
      {selectedTable && (
        <div className="mt-8 space-y-6">
          <div className="p-8 bg-green-50 rounded-xl border-2 border-green-200">
            <h3 className="font-bold mb-4 text-green-900 text-2xl">Table Selected!</h3>
            <div className="text-green-800 space-y-3 text-lg">
              <p><strong>Table {selectedTable.tableNumber}</strong> ({selectedTable.capacity} seats)</p>
              <p>Guests: {desiredGuestCount}</p>
              {selectedTable.capacity > desiredGuestCount && (
                <p className="text-green-600">
                  {selectedTable.capacity - desiredGuestCount} seat{selectedTable.capacity - desiredGuestCount > 1 ? 's' : ''} will remain empty
                </p>
              )}
            </div>
          </div>
          
          <div className="flex gap-6">
            <Button
              onClick={() => {
                const seatNumbers = Array.from({length: desiredGuestCount}, (_, i) => i + 1);
                onComplete({
                  tableId: selectedTable.id,
                  seatNumbers: seatNumbers
                });
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-xl py-4"
              size="lg"
            >
              Confirm Table Selection
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedTable(null)}
              className="px-12 text-xl py-4"
              size="lg"
            >
              Change Table
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}