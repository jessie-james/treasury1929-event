import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, X, ChevronUp, ChevronDown, User, Camera } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

interface Artist {
  id: number;
  eventId: number;
  name: string;
  role: string;
  bio?: string;
  photoUrl?: string;
  displayOrder: number;
  createdAt: string;
}

interface Props {
  eventId?: number;
  isEditing: boolean;
}

const artistSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  bio: z.string().optional(),
  photoUrl: z.string().optional(),
});

type ArtistFormData = z.infer<typeof artistSchema>;

export function EventArtists({ eventId, isEditing }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Fetch artists for the event
  const { data: artists = [], isLoading } = useQuery<Artist[]>({
    queryKey: [`/api/admin/events/${eventId}/artists`],
    enabled: !!eventId && isEditing,
  });

  const form = useForm<ArtistFormData>({
    resolver: zodResolver(artistSchema),
    defaultValues: {
      name: "",
      role: "",
      bio: "",
      photoUrl: "",
    },
  });

  // Create artist mutation
  const { mutate: createArtist, isPending: isCreating } = useMutation({
    mutationFn: async (data: ArtistFormData) => {
      if (!eventId) throw new Error("Event ID is required");
      return apiRequest("POST", `/api/admin/events/${eventId}/artists`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${eventId}/artists`] });
      toast({ title: "Artist added successfully" });
      setIsAddingNew(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add artist", variant: "destructive" });
    },
  });

  // Update artist mutation
  const { mutate: updateArtist, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ArtistFormData> }) => {
      if (!eventId) throw new Error("Event ID is required");
      return apiRequest("PATCH", `/api/admin/events/${eventId}/artists/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${eventId}/artists`] });
      toast({ title: "Artist updated successfully" });
      setEditingArtist(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update artist", variant: "destructive" });
    },
  });

  // Delete artist mutation
  const { mutate: deleteArtist, isPending: isDeleting } = useMutation({
    mutationFn: async (artistId: number) => {
      if (!eventId) throw new Error("Event ID is required");
      return apiRequest("DELETE", `/api/admin/events/${eventId}/artists/${artistId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${eventId}/artists`] });
      toast({ title: "Artist removed successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove artist", variant: "destructive" });
    },
  });

  // Reorder artists mutation
  const { mutate: reorderArtists } = useMutation({
    mutationFn: async (orderedArtists: Artist[]) => {
      if (!eventId) throw new Error("Event ID is required");
      return apiRequest("PATCH", `/api/admin/events/${eventId}/artists/reorder`, {
        artists: orderedArtists.map((artist, index) => ({ id: artist.id, displayOrder: index }))
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${eventId}/artists`] });
      toast({ title: "Artists reordered successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reorder artists", variant: "destructive" });
    },
  });

  // Load artist data when editing
  useEffect(() => {
    if (editingArtist) {
      form.reset({
        name: editingArtist.name,
        role: editingArtist.role,
        bio: editingArtist.bio || "",
        photoUrl: editingArtist.photoUrl || "",
      });
    }
  }, [editingArtist, form]);

  // Ensure at least one artist form is shown for new events
  useEffect(() => {
    if (!isEditing && !eventId && artists.length === 0) {
      setIsAddingNew(true);
    }
  }, [isEditing, eventId, artists.length]);

  const handleSubmit = (data: ArtistFormData) => {
    if (editingArtist) {
      updateArtist({ id: editingArtist.id, data });
    } else {
      createArtist(data);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const reordered = [...artists];
      [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
      reorderArtists(reordered);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < artists.length - 1) {
      const reordered = [...artists];
      [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
      reorderArtists(reordered);
    }
  };

  const handleCancel = () => {
    setEditingArtist(null);
    setIsAddingNew(false);
    form.reset();
  };

  if (!isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5" />
          <h3 className="text-lg font-medium">Artists</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Artists will be displayed once the event is created.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <User className="h-5 w-5" />
        <h3 className="text-lg font-medium">Artists</h3>
        <Badge variant="secondary">{artists.length}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Manage the artists performing at this event. Artists will be displayed in the order specified.
      </p>

      {/* Existing Artists */}
      {isLoading ? (
        <p>Loading artists...</p>
      ) : (
        <div className="space-y-3">
          {artists.map((artist, index) => (
            <Card key={artist.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {artist.photoUrl ? (
                      <img 
                        src={artist.photoUrl} 
                        alt={artist.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Camera className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium">{artist.name}</h4>
                      <p className="text-sm text-muted-foreground">{artist.role}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Move Up/Down */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === artists.length - 1}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    
                    {/* Edit */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingArtist(artist)}
                      disabled={editingArtist?.id === artist.id}
                    >
                      Edit
                    </Button>
                    
                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteArtist(artist.id)}
                      disabled={isDeleting}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {artist.bio && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">{artist.bio}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add New Artist Form */}
      {(isAddingNew || editingArtist) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingArtist ? "Edit Artist" : "Add Artist"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Artist name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Pianist, Vocalist" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="photoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Photo URL (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="/assets/artists/artist-name.jpg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Biography (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Artist biography and background..."
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={isCreating || isUpdating}
                  >
                    {isCreating || isUpdating ? "Saving..." : "Save Artist"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Add Artist Button */}
      {!isAddingNew && !editingArtist && (
        <>
          <Separator />
          <Button
            variant="outline"
            onClick={() => setIsAddingNew(true)}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Artist
          </Button>
        </>
      )}
    </div>
  );
}