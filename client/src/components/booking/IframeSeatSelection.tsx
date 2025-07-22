import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { TableLayoutCanvas } from "@/components/shared/TableLayoutCanvas";

interface Props {
  eventId: number;
  onComplete: (selection: { tableId: number; seatNumbers: number[] }) => void;
  hasExistingBooking?: boolean;
  selectedVenueIndex?: number;
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

export function IframeSeatSelection({ eventId, onComplete, hasExistingBooking, selectedVenueIndex: propSelectedVenueIndex }: Props) {
  const [selectedTable, setSelectedTable] = useState<VenueTable | null>(null);
  const [selectedVenueIndex, setSelectedVenueIndex] = useState<number>(propSelectedVenueIndex ?? 0);
  const [desiredGuestCount, setDesiredGuestCount] = useState(2); // Number of guests the user wants to bring

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
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Select Your Table</h2>
        <p className="text-muted-foreground">
          Click on an available table in the venue layout below. Use mouse wheel to zoom and drag to pan around.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <h4 className="font-medium text-blue-900 mb-1">Table Selection Info:</h4>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• Choose any table that fits your group size</li>
            <li>• You can book any number of guests up to the table capacity</li>
            <li>• Click a table to immediately proceed to guest details</li>
          </ul>
        </div>

      </div>

      {/* Venue Selection */}
      {Array.isArray(eventVenueLayouts) && eventVenueLayouts.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="venue-select" className="font-medium">Select Venue:</Label>
              <Select
                value={selectedVenueIndex.toString()}
                onValueChange={(value) => {
                  setSelectedVenueIndex(parseInt(value));
                  setSelectedTable(null); // Clear table selection when changing venues
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
          </CardContent>
        </Card>
      )}

      {/* Guest Count Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="guest-count" className="font-medium">Number of Guests:</Label>
            <Select
              value={desiredGuestCount.toString()}
              onValueChange={(value) => {
                setDesiredGuestCount(parseInt(value));
                setSelectedTable(null); // Clear table selection when changing guest count
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
            <div className="text-sm text-muted-foreground">
              Select number of guests for your reservation
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Select Your Table - Full Width, No Nesting */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">
            Select Your Table - {currentVenueLayout?.venue?.name || "Venue Layout"}
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
          <div className="flex items-center justify-center p-12 bg-gray-50 rounded-lg">
            <Loader2 className="h-12 w-12 animate-spin" />
            <span className="ml-4 text-lg">Loading venue layout...</span>
          </div>
        ) : currentVenueLayout ? (
          <TableLayoutCanvas
            tables={currentVenueLayout.tables.map(table => ({
              ...table,
              status: bookedTableIds.includes(table.id) ? ('sold' as const) : ('available' as const),
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
        ) : (
          <div className="text-center p-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-lg">
              Unable to load venue layout. Please try again.
            </p>
          </div>
        )}
        
        {/* Selection Summary and Confirmation */}
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
    </div>
  );
}