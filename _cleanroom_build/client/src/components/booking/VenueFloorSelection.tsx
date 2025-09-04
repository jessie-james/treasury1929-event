import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Building, Users, Eye, Star, ArrowLeft } from "lucide-react";

interface Venue {
  id: number;
  displayName: string;
  description: string;
  tableCount: number;
}

interface VenueFloorSelectionProps {
  venues: Venue[];
  onSelect: (venueDisplayName: string, venueIndex: number) => void;
  onBack?: () => void;
}

export function VenueFloorSelection({ venues, onSelect, onBack }: VenueFloorSelectionProps) {
  return (
    <div className="space-y-6">
      {/* Back Button */}
      {onBack && (
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Event Details
          </Button>
        </div>
      )}
      
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Choose Your Seating Area</h2>
        <p className="text-muted-foreground">
          Select your preferred venue floor for the best experience
        </p>
      </div>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Building className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="truncate">Venue Floor Selection</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
          <Tabs defaultValue={venues[0]?.displayName.toLowerCase().replace(' ', '-') || 'main-floor'} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-auto">
              {venues.map((venue) => (
                <TabsTrigger 
                  key={venue.id}
                  value={venue.displayName.toLowerCase().replace(' ', '-')}
                  className="relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-2 text-xs sm:text-sm whitespace-normal text-center"
                >
                  <span className="truncate">{venue.displayName}</span>
                  {venue.displayName === "Mezzanine" && (
                    <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 py-0 h-auto flex items-center gap-0.5">
                      <Star className="h-2 w-2 sm:h-3 sm:w-3" />
                      <span className="hidden xs:inline">Premium</span>
                      <span className="xs:hidden">★</span>
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {venues.map((venue, index) => (
              <TabsContent 
                key={venue.id}
                value={venue.displayName.toLowerCase().replace(' ', '-')}
                className="space-y-3 sm:space-y-4 mt-3 sm:mt-4"
              >
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">{venue.description}</p>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    <span>{venue.tableCount} tables available</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    <span>
                      {venue.displayName === "Main Floor" ? "Stage view" : "Elevated view"}
                    </span>
                  </div>
                </div>

                {/* Venue-specific highlights */}
                <div className="space-y-2">
                  {venue.displayName === "Main Floor" && (
                    <div className="text-xs sm:text-sm">
                      <h4 className="font-medium mb-2">Highlights:</h4>
                      <ul className="text-muted-foreground space-y-1 leading-relaxed">
                        <li>• Close to stage and performers</li>
                        <li>• Easy access to restrooms and bar</li>
                      </ul>
                    </div>
                  )}
                  
                  {venue.displayName === "Mezzanine" && (
                    <div className="text-xs sm:text-sm">
                      <h4 className="font-medium mb-2">Highlights:</h4>
                      <ul className="text-muted-foreground space-y-1 leading-relaxed">
                        <li>• Panoramic view of the venue</li>
                        <li>• Quieter, more exclusive setting</li>
                      </ul>
                    </div>
                  )}
                </div>

                <Button 
                  className="w-full text-sm sm:text-base py-2 sm:py-3"
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