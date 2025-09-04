import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "react-error-boundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, X, ChevronUp, ChevronDown, User, Camera, Upload, Trash2, Loader2 } from "lucide-react";
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentArtistPhoto, setCurrentArtistPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch artists for the event with crash protection
  const { data: artists = [], isLoading, error } = useQuery<Artist[]>({
    queryKey: [`/api/admin/events/${eventId}/artists`],
    enabled: !!eventId && isEditing,
    retry: 1,
    onError: (err) => {
      console.error('Failed to load artists:', err);
      toast({ title: "Warning", description: "Failed to load artists. Using default view.", variant: "destructive" });
    },
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

  // Photo upload mutation
  const { mutate: uploadPhoto, isPending: isUploadingPhoto } = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      
      setUploadingPhoto(true);
      
      const response = await fetch(`/api/admin/events/${eventId}/artists/photo`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentArtistPhoto(data.photoUrl);
      form.setValue('photoUrl', data.photoUrl);
      setUploadingPhoto(false);
      toast({
        title: "Success",
        description: "Photo uploaded successfully.",
      });
    },
    onError: (error: any) => {
      setUploadingPhoto(false);
      const errorMessage = error?.message || "Failed to upload photo";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Photo delete mutation  
  const { mutate: deletePhoto } = useMutation({
    mutationFn: async () => {
      const currentPhotoUrl = form.getValues('photoUrl');
      if (!currentPhotoUrl) return;
      
      const response = await fetch(`/api/admin/events/${eventId}/artists/photo`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl: currentPhotoUrl })
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete photo');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setCurrentArtistPhoto(null);
      form.setValue('photoUrl', '');
      toast({
        title: "Success", 
        description: "Photo removed successfully.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to delete photo";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
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
      setCurrentArtistPhoto(editingArtist.photoUrl || null);
    } else {
      setCurrentArtistPhoto(null);
    }
  }, [editingArtist, form]);

  // Ensure at least one artist form is shown for new events - crash safe
  useEffect(() => {
    try {
      const safeArtists = Array.isArray(artists) ? artists : [];
      if (!isEditing && !eventId && safeArtists.length === 0) {
        setIsAddingNew(true);
      }
    } catch (error) {
      console.error('Error in artist default logic:', error);
      // Fallback: always show add form if there's an error
      setIsAddingNew(true);
    }
  }, [isEditing, eventId, artists]);

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
    setCurrentArtistPhoto(null);
    form.reset();
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select a valid image file.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Photo must be smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }
    
    uploadPhoto(file);
  };

  const handleRemovePhoto = () => {
    if (currentArtistPhoto) {
      deletePhoto();
    }
  };

  const triggerPhotoUpload = () => {
    fileInputRef.current?.click();
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
                      <FormLabel>Artist Photo (Optional)</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          {/* Hidden file input */}
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                          
                          {/* Photo preview or placeholder */}
                          <div className="flex items-start gap-4">
                            <div className="flex flex-col items-center">
                              {currentArtistPhoto ? (
                                <img 
                                  src={currentArtistPhoto} 
                                  alt="Artist preview"
                                  className="w-24 h-24 rounded-lg object-cover border"
                                />
                              ) : (
                                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                                  <Camera className="w-8 h-8 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col gap-2 flex-1">
                              {/* Upload/Replace button */}
                              <Button
                                type="button"
                                variant="outline"
                                onClick={triggerPhotoUpload}
                                disabled={uploadingPhoto || isUploadingPhoto}
                                className="w-fit"
                              >
                                {uploadingPhoto || isUploadingPhoto ? (
                                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                                ) : (
                                  <><Upload className="w-4 h-4 mr-2" />{currentArtistPhoto ? 'Replace' : 'Upload'} Photo</>
                                )}
                              </Button>
                              
                              {/* Remove button - only show if photo exists */}
                              {currentArtistPhoto && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={handleRemovePhoto}
                                  className="w-fit text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />Remove Photo
                                </Button>
                              )}
                              
                              {/* Format info */}
                              <p className="text-xs text-muted-foreground">
                                JPG, PNG or WebP. Max 5MB.
                              </p>
                            </div>
                          </div>
                        </div>
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