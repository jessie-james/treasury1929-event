import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Building2, Users } from "lucide-react";

interface VenueFloorSelectionProps {
  venues: Array<{
    id: number;
    displayName: string;
    description?: string;
    tableCount?: number;
  }>;
  onSelect: (venueDisplayName: string, venueIndex: number) => void;
}

export function VenueFloorSelection({ venues, onSelect }: VenueFloorSelectionProps) {
  const [selectedVenue, setSelectedVenue] = useState<string>("");

  const handleSelection = (venueDisplayName: string) => {
    setSelectedVenue(venueDisplayName);
    const venueIndex = venues.findIndex(v => v.displayName === venueDisplayName);
    onSelect(venueDisplayName, venueIndex);
  };

  if (venues.length <= 1) {
    // If only one venue, auto-select it
    if (venues.length === 1 && !selectedVenue) {
      handleSelection(venues[0].displayName);
    }
    return null; // Don't show selection for single venue
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Building2 className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Select Floor Level</h2>
        </div>
        <p className="text-muted-foreground">
          Choose your preferred seating area for this event
        </p>
      </div>

      <RadioGroup 
        value={selectedVenue} 
        onValueChange={handleSelection}
        className="grid gap-4"
      >
        {venues.map((venue) => (
          <Card 
            key={venue.id}
            className={`cursor-pointer transition-colors ${
              selectedVenue === venue.displayName 
                ? 'ring-2 ring-primary bg-primary/5' 
                : 'hover:bg-muted/50'
            }`}
            onClick={() => handleSelection(venue.displayName)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <RadioGroupItem 
                  value={venue.displayName} 
                  id={`venue-${venue.id}`}
                  className="h-5 w-5"
                />
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {venue.displayName}
                  </CardTitle>
                </div>
                {venue.tableCount && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {venue.tableCount} tables
                  </div>
                )}
              </div>
            </CardHeader>
            {venue.description && (
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground ml-8">
                  {venue.description}
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </RadioGroup>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          * Required selection - please choose your preferred floor level to continue
        </p>
      </div>
    </div>
  );
}