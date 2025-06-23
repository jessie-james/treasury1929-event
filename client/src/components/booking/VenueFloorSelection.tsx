import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Venue Floor Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={venues[0]?.displayName.toLowerCase().replace(' ', '-') || 'main-floor'} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              {venues.map((venue) => (
                <TabsTrigger 
                  key={venue.id}
                  value={venue.displayName.toLowerCase().replace(' ', '-')}
                  className="relative"
                >
                  {venue.displayName}
                  {venue.displayName === "Mezzanine" && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {venues.map((venue, index) => (
              <TabsContent 
                key={venue.id}
                value={venue.displayName.toLowerCase().replace(' ', '-')}
                className="space-y-4 mt-4"
              >
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
                  className="w-full"
                  onClick={() => onSelect(venue.displayName, index)}
                >
                  Select {venue.displayName}
                </Button>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          <strong>Note:</strong> Table availability varies by venue floor. 
          Premium locations may have limited seating.
        </p>
      </div>
    </div>
  );
}