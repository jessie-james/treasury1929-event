import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Event } from "@shared/schema";
import { useState, useRef, useEffect } from "react";
import { ImagePlus, Loader2, RefreshCw, X } from "lucide-react";

const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  image: z.string().min(1, "Image is required"),
  date: z.string().min(1, "Date is required"),
  totalSeats: z.number().min(1, "Must have at least 1 seat"),
  venueId: z.number().default(1), // For now, hardcode to venue 1
});

type EventFormData = z.infer<typeof eventFormSchema>;

interface Props {
  event?: Event | null;
  onClose: () => void;
}

export function EventForm({ event, onClose }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(event?.image || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Set existing event image as uploaded image on component mount
  useEffect(() => {
    if (event?.image) {
      setUploadedImage(event.image);
    }
  }, [event]);
  
  // Function to handle image upload
  const handleImageUpload = async (file: File) => {
    if (!file) return;
    
    setUploading(true);
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      console.log('Starting image upload...');
      console.log('File info:', {
        name: file.name,
        type: file.type,
        size: file.size
      });
      
      const response = await fetch('/api/upload/event-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      // Get response text first to debug any potential issues
      const responseText = await response.text();
      
      // Check if response starts with HTML or XML markup
      if (responseText.trim().startsWith('<!DOCTYPE') || 
          responseText.trim().startsWith('<html') || 
          responseText.trim().startsWith('<?xml')) {
        console.error('Server returned HTML/XML instead of JSON:', responseText);
        throw new Error('Server returned an HTML error page instead of JSON');
      }
      
      // Try to parse as JSON if we got here
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Upload response:', data);
      } catch (jsonError) {
        console.error('Failed to parse server response as JSON:', responseText);
        throw new Error(`Invalid JSON response: ${responseText.slice(0, 100)}...`);
      }
      
      if (!response.ok) {
        throw new Error(data.message || 'Upload failed - server returned an error');
      }
      
      if (!data || !data.path) {
        throw new Error('Upload failed - no file path returned');
      }
      
      const imagePath = data.path;
      
      // Update the form field with the new image path
      form.setValue('image', imagePath);
      setUploadedImage(imagePath);
      
      toast({
        title: 'Image uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      let errorMessage = 'Could not upload image. Please try again.';
      
      // Try to extract a more specific error message if available
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error instanceof Response) {
        try {
          const responseData = await error.json();
          errorMessage = responseData.error || responseData.message || errorMessage;
        } catch {
          // If we can't parse the JSON, use the default message
        }
      }
      
      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: event ? {
      ...event,
      date: new Date(event.date).toISOString().split('T')[0],
    } : {
      title: "",
      description: "",
      image: "",
      date: new Date().toISOString().split('T')[0],
      totalSeats: 80,
      venueId: 1,
    },
  });

  const { mutate: saveEvent, isPending } = useMutation({
    mutationFn: async (data: EventFormData) => {
      // Convert form data to proper types before submission
      const date = new Date(data.date);
      
      // Validate the date
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date format');
      }
      
      const formattedData = {
        ...data,
        totalSeats: Number(data.totalSeats),
        date: date.toISOString(), // Ensure we're sending a proper ISO string
      };
      
      console.log("Submitting event data:", formattedData);
      const endpoint = event ? `/api/events/${event.id}` : "/api/events";
      const method = event ? "PATCH" : "POST";
      return apiRequest(method, endpoint, formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: `Event ${event ? "updated" : "created"} successfully`,
      });
      onClose();
    },
    onError: (error) => {
      console.error("Event save error:", error);
      toast({
        title: "Error",
        description: `Failed to ${event ? "update" : "create"} event`,
        variant: "destructive",
      });
    },
  });

  const { mutate: deleteEvent, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      if (!event) return;
      return apiRequest("DELETE", `/api/events/${event.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Event deleted successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{event ? "Edit Event" : "Create Event"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => {
            console.log("Form data before submission:", data);
            console.log("Form validation state:", form.formState);
            if (form.formState.errors) {
              console.log("Form errors:", form.formState.errors);
            }
            saveEvent(data);
          })} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Image</FormLabel>
                  <div className="flex flex-col items-center gap-4">
                    {/* Hidden file input controlled by our custom UI */}
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageUpload(e.target.files[0]);
                        }
                      }}
                    />
                    
                    {/* Image preview */}
                    {(uploadedImage || field.value) && (
                      <div className="relative w-full max-w-[300px] h-[200px] rounded-md overflow-hidden bg-muted">
                        <img 
                          src={uploadedImage || field.value} 
                          alt="Event preview" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Show a placeholder on error
                            (e.target as HTMLImageElement).src = 'https://placehold.co/300x200?text=Image+Error';
                          }}
                        />
                        {/* Remove image button */}
                        <button
                          type="button"
                          onClick={() => {
                            field.onChange('');
                            setUploadedImage(null);
                          }}
                          className="absolute top-2 right-2 p-1 rounded-full bg-destructive text-white"
                          aria-label="Remove image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    
                    {/* Upload button */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : uploadedImage || field.value ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Change Image
                        </>
                      ) : (
                        <>
                          <ImagePlus className="mr-2 h-4 w-4" />
                          Upload Event Image
                        </>
                      )}
                    </Button>
                    
                    {/* Hidden input to store the actual value */}
                    <Input
                      type="hidden"
                      {...field}
                    />
                  </div>
                  <FormDescription>
                    Upload a photo for this event.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalSeats"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Seats</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="number" 
                      onChange={e => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              {event && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => deleteEvent()}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete Event"}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : (event ? "Update" : "Create")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}