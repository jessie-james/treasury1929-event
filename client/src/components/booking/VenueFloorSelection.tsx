import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, Users, Eye, Star } from "lucide-react";

interface Venue {
  id: number;
  displayName: string;
  description: string;
  tableCount: number;
}

interface VenueFloorSelectionProps {
  venues: Venue[];
  onSelect: (venueDisplayName: string, venueIndex: number) => void;
}

export function VenueFloorSelection({ venues, onSelect }: VenueFloorSelectionProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Choose Your Seating Area</h2>
        <p className="text-muted-foreground">
          Select your preferred venue floor for the best experience
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {venues.map((venue, index) => (
          <Card 
            key={venue.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => onSelect(venue.displayName, index)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  {venue.displayName}
                </div>
                {venue.displayName === "Mezzanine" && (
                  <Badge variant="secondary" className="text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{venue.description}</p>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{venue.tableCount} tables available</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {venue.displayName === "Main Floor" ? "Stage view" : "Elevated view"}
                  </span>
                </div>
              </div>

              {/* Venue-specific highlights */}
              <div className="space-y-2">
                {venue.displayName === "Main Floor" && (
                  <div className="text-sm">
                    <h4 className="font-medium mb-1">Highlights:</h4>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• Close to stage and performers</li>
                      <li>• Intimate candlelit atmosphere</li>
                      <li>• Easy access to restrooms and bar</li>
                    </ul>
                  </div>
                )}
                
                {venue.displayName === "Mezzanine" && (
                  <div className="text-sm">
                    <h4 className="font-medium mb-1">Highlights:</h4>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• Elevated premium seating</li>
                      <li>• Panoramic view of the venue</li>
                      <li>• Quieter, more exclusive setting</li>
                    </ul>
                  </div>
                )}
              </div>

              <Button 
                className="w-full group-hover:bg-primary/90 transition-colors"
                onClick={() => onSelect(venue.displayName, index)}
              >
                Select {venue.displayName}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          <strong>Note:</strong> Table availability varies by venue floor. 
          Premium locations may have limited seating.
        </p>
      </div>
    </div>
  );
}