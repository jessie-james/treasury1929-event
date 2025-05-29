import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building, Plus, X, Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface EventVenue {
  id: number;
  eventId: number;
  venueId: number;
  displayName: string;
  displayOrder: number;
  isActive: boolean;
  venue: {
    id: number;
    name: string;
    description: string;
    width: number;
    height: number;
  };
}

interface Venue {
  id: number;
  name: string;
  description: string;
  width: number;
  height: number;
  isActive: boolean;
}

interface Props {
  eventId: number | null;
  isNewEvent?: boolean;
}

export function EventVenueManager({ eventId, isNewEvent = false }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [editingVenue, setEditingVenue] = useState<EventVenue | null>(null);

  // Fetch event venues
  const { data: eventVenues = [], isLoading: loadingEventVenues } = useQuery({
    queryKey: ['/api/events', eventId, 'venues'],
    enabled: !!eventId && !isNewEvent,
  });

  // Fetch all available venues
  const { data: allVenues = [], isLoading: loadingVenues } = useQuery({
    queryKey: ['/api/admin/venues'],
  });

  // Add venue to event mutation
  const addVenueMutation = useMutation({
    mutationFn: async (data: { venueId: number; displayName: string; displayOrder: number }) => {
      const response = await apiRequest('POST', `/api/events/${eventId}/venues`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add venue');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'venues'] });
      setShowAddDialog(false);
      setSelectedVenueId(null);
      setDisplayName("");
      toast({
        title: "Success",
        description: "Venue added to event successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update venue mutation
  const updateVenueMutation = useMutation({
    mutationFn: async (data: { venueId: number; displayName: string; displayOrder?: number }) => {
      const response = await apiRequest('PUT', `/api/events/${eventId}/venues/${data.venueId}`, {
        displayName: data.displayName,
        displayOrder: data.displayOrder,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update venue');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'venues'] });
      setEditingVenue(null);
      toast({
        title: "Success",
        description: "Venue updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove venue mutation
  const removeVenueMutation = useMutation({
    mutationFn: async (venueId: number) => {
      const response = await apiRequest('DELETE', `/api/events/${eventId}/venues/${venueId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove venue');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'venues'] });
      toast({
        title: "Success",
        description: "Venue removed from event successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddVenue = () => {
    if (!selectedVenueId || !displayName.trim()) {
      toast({
        title: "Error",
        description: "Please select a venue and provide a display name",
        variant: "destructive",
      });
      return;
    }

    addVenueMutation.mutate({
      venueId: selectedVenueId,
      displayName: displayName.trim(),
      displayOrder: eventVenues.length,
    });
  };

  const handleUpdateVenue = () => {
    if (!editingVenue || !displayName.trim()) return;

    updateVenueMutation.mutate({
      venueId: editingVenue.venueId,
      displayName: displayName.trim(),
      displayOrder: editingVenue.displayOrder,
    });
  };

  const handleRemoveVenue = (venueId: number) => {
    if (eventVenues.length <= 1) {
      toast({
        title: "Error",
        description: "Cannot remove the last venue from an event",
        variant: "destructive",
      });
      return;
    }
    removeVenueMutation.mutate(venueId);
  };

  const availableVenues = allVenues.filter(venue => 
    !eventVenues.some(ev => ev.venueId === venue.id)
  );

  const canAddVenue = eventVenues.length < 2 && availableVenues.length > 0;

  if (isNewEvent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Venue Layouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Save the event first to configure venue layouts</p>
            <p className="text-sm">You can add up to 2 different venue layouts per event</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Venue Layouts ({eventVenues.length}/2)
          </div>
          {canAddVenue && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => {
                  setSelectedVenueId(null);
                  setDisplayName("");
                }}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Venue
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Venue Layout</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select Venue</Label>
                    <Select 
                      value={selectedVenueId?.toString() || ""} 
                      onValueChange={(value) => setSelectedVenueId(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a venue layout" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVenues.map((venue) => (
                          <SelectItem key={venue.id} value={venue.id.toString()}>
                            {venue.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Display Name</Label>
                    <Input
                      placeholder="e.g., Main Floor, Mezzanine, Upper Level"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={handleAddVenue}
                      disabled={addVenueMutation.isPending || !selectedVenueId || !displayName.trim()}
                    >
                      {addVenueMutation.isPending ? "Adding..." : "Add Venue"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loadingEventVenues ? (
          <div className="text-center py-6">Loading venue layouts...</div>
        ) : eventVenues.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No venue layouts configured</p>
            <p className="text-sm">Add a venue layout to enable seat selection</p>
          </div>
        ) : (
          <div className="space-y-4">
            {eventVenues.map((eventVenue, index) => (
              <div key={eventVenue.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      Layout {index + 1}
                    </Badge>
                    <div>
                      <p className="font-medium">{eventVenue.displayName}</p>
                      <p className="text-sm text-muted-foreground">
                        {eventVenue.venue.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingVenue(eventVenue);
                            setDisplayName(eventVenue.displayName);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Venue Layout</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Venue</Label>
                            <Input value={eventVenue.venue.name} disabled />
                          </div>
                          <div>
                            <Label>Display Name</Label>
                            <Input
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-2 pt-4">
                            <Button 
                              onClick={handleUpdateVenue}
                              disabled={updateVenueMutation.isPending || !displayName.trim()}
                            >
                              {updateVenueMutation.isPending ? "Updating..." : "Update"}
                            </Button>
                            <Button variant="outline" onClick={() => setEditingVenue(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    {eventVenues.length > 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveVenue(eventVenue.venueId)}
                        disabled={removeVenueMutation.isPending}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}