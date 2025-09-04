import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { VenueLayoutDesigner } from '@/components/venue/VenueLayoutDesigner';
import { Plus, Building, Settings, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import type { Venue, Stage, Table } from '@shared/schema';

export default function VenueDesigner() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  const [showNewVenueForm, setShowNewVenueForm] = useState(false);
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueDescription, setNewVenueDescription] = useState('');

  // Fetch venues
  const { data: venues = [], isLoading: isLoadingVenues } = useQuery({
    queryKey: ['venues'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/venues');
      if (!response.ok) throw new Error('Failed to fetch venues');
      return response.json();
    }
  });

  // Create venue mutation
  const createVenueMutation = useMutation({
    mutationFn: async (venueData: { name: string; description: string }) => {
      const response = await apiRequest('POST', '/api/admin/venues', {
        name: venueData.name,
        description: venueData.description
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const result = await response.json();
      return result;
    },
    onSuccess: (newVenue) => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      setSelectedVenueId(newVenue.id);
      setShowNewVenueForm(false);
      setNewVenueName('');
      setNewVenueDescription('');
      toast({
        title: "Venue Created",
        description: `${newVenue.name} has been created successfully.`
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create venue: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Fetch venue layout data
  const { data: venueData, isLoading: isLoadingVenue } = useQuery({
    queryKey: ['venue-layout', selectedVenueId],
    queryFn: async () => {
      if (!selectedVenueId) return null;
      const response = await apiRequest('GET', `/api/admin/venues/${selectedVenueId}/layout`);
      if (!response.ok) {
        if (response.status === 404) return null; // No layout exists yet
        throw new Error('Failed to fetch venue layout');
      }
      return response.json();
    },
    enabled: !!selectedVenueId
  });

  // Set first venue as default if none selected
  useEffect(() => {
    if (!selectedVenueId && venues.length > 0) {
      setSelectedVenueId(venues[0].id);
    }
  }, [venues, selectedVenueId]);

  // Save layout handler
  const handleSaveLayout = async (layoutData: { venue: Venue; stages: Stage[]; tables: Table[] }) => {
    if (!selectedVenueId) return;
    
    try {
      const response = await apiRequest('PUT', `/api/admin/venues/${selectedVenueId}/layout`, layoutData);
      if (!response.ok) throw new Error('Failed to save layout');
      
      queryClient.invalidateQueries({ queryKey: ['venue-layout', selectedVenueId] });
      toast({
        title: "Layout Saved",
        description: "Venue layout has been saved successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save venue layout.",
        variant: "destructive"
      });
    }
  };

  const handleCreateVenue = () => {
    if (!newVenueName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a venue name.",
        variant: "destructive"
      });
      return;
    }
    
    createVenueMutation.mutate({
      name: newVenueName.trim(),
      description: newVenueDescription.trim()
    });
  };

  // Back navigation handler
  const handleBackToBackoffice = () => {
    setLocation('/backoffice');
  };

  if (isLoadingVenues) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading venues...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={handleBackToBackoffice}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">🏟️ Venue Layout Designer</h1>
        </div>
        <p className="text-gray-600">Create and manage your venue layouts with interactive table positioning.</p>
      </div>

      {/* Venue Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Venue Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Select Venue</Label>
              <Select 
                value={selectedVenueId?.toString() || ""} 
                onValueChange={(value) => setSelectedVenueId(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a venue to edit" />
                </SelectTrigger>
                <SelectContent>
                  {venues.map((venue: any) => (
                    <SelectItem key={venue.id} value={venue.id.toString()}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowNewVenueForm(!showNewVenueForm)} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              New Venue
            </Button>
          </div>

          {/* New Venue Form */}
          {showNewVenueForm && (
            <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
              <h3 className="font-semibold">Create New Venue</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Venue Name</Label>
                  <Input 
                    value={newVenueName}
                    onChange={(e) => setNewVenueName(e.target.value)}
                    placeholder="Enter venue name"
                  />
                </div>
                <div>
                  <Label>Description (Optional)</Label>
                  <Textarea 
                    value={newVenueDescription}
                    onChange={(e) => setNewVenueDescription(e.target.value)}
                    placeholder="Enter venue description"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateVenue}
                  disabled={createVenueMutation.isPending || !newVenueName.trim()}
                >
                  {createVenueMutation.isPending ? 'Creating...' : 'Create Venue'}
                </Button>
                <Button 
                  onClick={() => {
                    setShowNewVenueForm(false);
                    setNewVenueName('');
                    setNewVenueDescription('');
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Layout Designer */}
      {selectedVenueId && (
        <>
          {isLoadingVenue ? (
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Loading venue layout...</p>
              </div>
            </div>
          ) : (
            <VenueLayoutDesigner
              venue={venues.find((v: any) => v.id === selectedVenueId)!}
              initialStages={venueData?.stages || []}
              initialTables={venueData?.tables || []}
              onSave={handleSaveLayout}
            />
          )}
        </>
      )}

      {!selectedVenueId && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Venues Found</h3>
              <p className="text-gray-500 mb-4">
                Create your first venue to start designing layouts.
              </p>
              <Button onClick={() => setShowNewVenueForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Venue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}