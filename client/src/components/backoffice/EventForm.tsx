import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { type Event, type FoodOption } from "@shared/schema";
import { useState, useRef, useEffect } from "react";
import { ImagePlus, Loader2, RefreshCw, X, Building, UtensilsCrossed, Check, Wine, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EventPricingManager } from "./EventPricingManager";
import { EventVenueManager } from "./EventVenueManager";
import { EventArtists } from "./EventArtists";
import { formatPhoenixDateForInput } from "@/lib/timezone";
import { formatPriceDisplay } from "@/lib/price";

const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  image: z.string().min(1, "Image is required"),
  date: z.string().min(1, "Date is required"),
  venueId: z.number().min(1, "Venue is required"),
  isActive: z.boolean().default(true),
  // NEW EVENT FLEXIBILITY TOGGLES
  includeFoodService: z.boolean().default(true),
  includeBeverages: z.boolean().default(true),
  includeAlcohol: z.boolean().default(true),
  isPrivate: z.boolean().default(false),
  eventType: z.enum(['full', 'ticket-only']).default('full'),
  maxTicketsPerPurchase: z.number().min(1).max(8).default(8),
  // PRICING FIELDS
  basePrice: z.number().min(100).default(13000), // $130.00 in cents - required for full events
  priceDisplay: z.string().optional(), // Custom price display text
  ticketPrice: z.number().min(100).default(5000), // $50.00 in cents
}).refine((data) => {
  // Validate basePrice is set for full events
  if (data.eventType === 'full' && (!data.basePrice || data.basePrice < 100)) {
    return false;
  }
  return true;
}, {
  message: "Base price is required for full events (minimum $1.00)",
  path: ["basePrice"]
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
  const [totalTables, setTotalTables] = useState<number>(0);
  const [totalSeats, setTotalSeats] = useState<number>(0);
  const [selectedFoodOptions, setSelectedFoodOptions] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch venues for selection
  const { data: venues = [], isLoading: isLoadingVenues } = useQuery({
    queryKey: ['venues'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/venues');
      if (!response.ok) throw new Error('Failed to fetch venues');
      return response.json();
    },
    throwOnError: false
  });

  // Fetch all food options
  const { data: allFoodOptions = [] } = useQuery<FoodOption[]>({
    queryKey: ["/api/food-options"],
  });

  // Fetch current event food options if editing
  const { data: currentEventFoodOptions = [] } = useQuery({
    queryKey: [`/api/events/${event?.id}/food-options`],
    enabled: !!event?.id,
  });

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: event ? {
      title: event.title,
      description: event.description || "",
      image: event.image || "",
      date: formatPhoenixDateForInput(event.date),
      venueId: event.venueId,
      isActive: event.isActive ?? true,
      includeFoodService: event.includeFoodService ?? true,
      includeBeverages: event.includeBeverages ?? true,
      includeAlcohol: event.includeAlcohol ?? true,
      isPrivate: event.isPrivate ?? false,
      eventType: (event.eventType ?? 'full') as 'full' | 'ticket-only',
      maxTicketsPerPurchase: event.maxTicketsPerPurchase ?? 8,
      basePrice: event.basePrice ?? 13000,
      priceDisplay: event.priceDisplay || '',
      ticketPrice: event.ticketPrice ?? 5000,
    } : {
      title: "",
      description: "",
      image: "",
      date: new Date().toISOString().split('T')[0],
      venueId: venues?.[0]?.id || 1, // Default to first venue
      isActive: true,
      includeFoodService: true,
      includeBeverages: true,
      includeAlcohol: true,
      isPrivate: false,
      eventType: 'full' as const,
      maxTicketsPerPurchase: 8,
      basePrice: 13000,
      priceDisplay: '',
      ticketPrice: 5000,
    },
  });

  // Fetch venue layout when venue is selected to calculate total seats
  const selectedVenueId = form.watch('venueId');
  const { data: venueLayout } = useQuery({
    queryKey: ['venue-layout', selectedVenueId],
    queryFn: async () => {
      if (!selectedVenueId) return null;
      const response = await apiRequest('GET', `/api/admin/venues/${selectedVenueId}/layout`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!selectedVenueId,
    throwOnError: false
  });

  // Calculate total tables and seats when venue layout changes
  useEffect(() => {
    if (venueLayout?.tables) {
      const calculatedTables = venueLayout.tables.length;
      const calculatedSeats = venueLayout.tables.reduce((total: number, table: any) => {
        return total + (table.capacity || 0);
      }, 0);
      setTotalTables(calculatedTables);
      setTotalSeats(calculatedSeats);
    }
  }, [venueLayout]);
  
  // Set existing event image as uploaded image on component mount
  useEffect(() => {
    if (event?.image) {
      setUploadedImage(event.image);
    }
  }, [event]);

  // Load existing event food options
  useEffect(() => {
    if (Array.isArray(currentEventFoodOptions) && currentEventFoodOptions.length > 0) {
      const selectedIds = Array.isArray(currentEventFoodOptions) ? currentEventFoodOptions.map((option: any) => option.id) : [];
      setSelectedFoodOptions(selectedIds);
    }
  }, [currentEventFoodOptions]);
  
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
        totalTables: totalTables,
        totalSeats: totalSeats,
        availableTables: totalTables, // Initially all tables are available
        date: date.toISOString(), // Ensure we're sending a proper ISO string
      };
      
      console.log("Submitting event data:", formattedData);
      const endpoint = event ? `/api/events/${event.id}` : "/api/events";
      const method = event ? "PATCH" : "POST";
      return apiRequest(method, endpoint, formattedData);
    },
    onSuccess: async (response) => {
      const savedEvent = await response.json();
      
      // Save food options for the event
      if (selectedFoodOptions.length > 0) {
        try {
          await apiRequest("PUT", `/api/events/${savedEvent.id || event?.id}/food-options`, {
            foodOptionIds: selectedFoodOptions
          });
        } catch (error) {
          console.error("Error saving food options:", error);
          toast({
            title: "Warning",
            description: "Event saved but food options could not be updated",
            variant: "destructive",
          });
        }
      }
      
      // Force refresh the events list
      await queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      await queryClient.refetchQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${savedEvent.id || event?.id}/food-options`] });
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
              name="eventType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="full">Full Event (with venue/table selection)</SelectItem>
                      <SelectItem value="ticket-only">Ticket-Only Event (simple ticket purchase)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Full events include venue layouts and table selection. Ticket-only events are simple quantity-based purchases.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Base Price for Full Events */}
            {form.watch('eventType') === 'full' && (
              <>
                <FormField
                  control={form.control}
                  name="basePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Price (USD)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min="1" 
                          step="0.01"
                          placeholder="130.00" 
                          onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value) * 100) || 13000)}
                          value={field.value ? (field.value / 100).toFixed(2) : ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Base price per guest in dollars for full dinner events. Default: $130.00
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="priceDisplay"
                  render={({ field }) => {
                    const currentEvent = {
                      eventType: form.watch('eventType'),
                      basePrice: form.watch('basePrice') || 13000,
                      priceDisplay: field.value,
                      ticketPrice: form.watch('ticketPrice') || 5000,
                      // Add other required fields to satisfy type
                      id: event?.id || 0,
                      title: form.watch('title') || '',
                      description: form.watch('description') || '',
                      image: form.watch('image') || '',
                      date: new Date(),
                      venueId: form.watch('venueId') || 1,
                      isActive: true,
                    } as any;
                    const previewPrice = formatPriceDisplay(currentEvent);
                    
                    return (
                      <FormItem>
                        <FormLabel>Price Display Text (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="$130 per guest — tax & gratuity included"
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Custom price display text. Leave empty to use default: <strong>{previewPrice}</strong>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </>
            )}
            
            {/* Ticket Price for Ticket-Only Events */}
            {form.watch('eventType') === 'ticket-only' && (
              <>
                <FormField
                  control={form.control}
                  name="ticketPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ticket Price (in dollars)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min="1" 
                          step="0.01"
                          placeholder="50.00" 
                          onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value) * 100) || 0)}
                          value={field.value ? (field.value / 100).toFixed(2) : ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Price per ticket in dollars. Example: 50.00 = $50.00
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
              </>
            )}

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Active Event
                    </FormLabel>
                    <FormDescription>
                      Whether this event is active and should be displayed to customers
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <Separator className="my-6" />
            
            {/* Artists Section */}
            <EventArtists 
              eventId={event?.id} 
              isEditing={!!event} 
            />
            
            <Separator className="my-6" />
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                <h3 className="text-lg font-medium">Food Options</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Select which food options to serve at this event. Only selected items will be available to guests.
              </p>
              
              {allFoodOptions.length > 0 ? (
                <Tabs defaultValue="salad" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="salad">Salads</TabsTrigger>
                    <TabsTrigger value="entree">Entrees</TabsTrigger>
                    <TabsTrigger value="dessert">Desserts</TabsTrigger>
                  </TabsList>
                  
                  {["salad", "entree", "dessert"].map((type) => {
                    const selectedForThisType = selectedFoodOptions.filter(id => {
                      const option = allFoodOptions.find(opt => opt.id === id);
                      return option?.type === type;
                    }).length;
                    
                    return (
                      <TabsContent key={type} value={type} className="space-y-4">
                        {selectedForThisType >= 3 && (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Maximum reached:</strong> You can only select up to 3 {type} options per event.
                            </AlertDescription>
                          </Alert>
                        )}
                        <div className="grid gap-3">
                          {allFoodOptions
                            .filter((option) => option.type === type)
                            .map((option) => (
                              <div
                                key={option.id}
                                className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                                  selectedFoodOptions.includes(option.id)
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:bg-muted/50"
                                }`}
                                onClick={() => {
                                  if (selectedFoodOptions.includes(option.id)) {
                                    setSelectedFoodOptions(prev => prev.filter(id => id !== option.id));
                                  } else {
                                    // Check if we already have 3 options selected for this type
                                    if (selectedForThisType < 3) {
                                      setSelectedFoodOptions(prev => [...prev, option.id]);
                                    } else {
                                      toast({
                                        title: "Maximum reached",
                                        description: `You can only select up to 3 ${type} options per event.`,
                                        variant: "destructive",
                                      });
                                    }
                                  }
                                }}
                              >
                                <div className={`w-5 h-5 border rounded flex items-center justify-center ${
                                  selectedFoodOptions.includes(option.id)
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground"
                                }`}>
                                  {selectedFoodOptions.includes(option.id) && (
                                    <Check className="w-3 h-3" />
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={option.image || ''}
                                      alt={option.name}
                                      className="w-12 h-12 object-cover rounded"
                                    />
                                    <div className="flex-1">
                                      <h4 className="font-medium text-sm">{option.name}</h4>
                                      <p className="text-xs text-muted-foreground line-clamp-1">
                                        {option.description}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        {option.allergens && option.allergens.length > 0 && (
                                          <div className="flex gap-1">
                                            {option.allergens.slice(0, 2).map((allergen) => (
                                              <Badge key={allergen} variant="secondary" className="text-xs">
                                                {allergen}
                                              </Badge>
                                            ))}
                                            {option.allergens.length > 2 && (
                                              <Badge variant="secondary" className="text-xs">
                                                +{option.allergens.length - 2}
                                              </Badge>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <UtensilsCrossed className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No food options available</p>
                  <p className="text-sm">Create food options first in the Food management section</p>
                </div>
              )}

              {selectedFoodOptions.length > 0 && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm font-medium mb-2">
                    Selected: {selectedFoodOptions.length} food options
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedFoodOptions.map((id) => {
                      const option = allFoodOptions.find(opt => opt.id === id);
                      return option ? (
                        <Badge key={id} variant="default" className="text-xs">
                          {option.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            <Separator className="my-6" />
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Wine className="h-5 w-5" />
                <h3 className="text-lg font-medium">Wine & Beverages</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Select which wine and beverage options to serve at this event. Only selected items will be available to guests.
              </p>
              
              {allFoodOptions.filter(option => option.type === 'wine_bottle').length > 0 ? (
                <div className="grid gap-3">
                  {allFoodOptions
                    .filter(option => option.type === 'wine_bottle')
                    .map((option) => (
                      <div
                        key={option.id}
                        className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                          selectedFoodOptions.includes(option.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                        onClick={() => {
                          if (selectedFoodOptions.includes(option.id)) {
                            setSelectedFoodOptions(prev => prev.filter(id => id !== option.id));
                          } else {
                            setSelectedFoodOptions(prev => [...prev, option.id]);
                          }
                        }}
                      >
                        <div className={`w-5 h-5 border rounded flex items-center justify-center ${
                          selectedFoodOptions.includes(option.id)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground"
                        }`}>
                          {selectedFoodOptions.includes(option.id) && (
                            <Check className="w-3 h-3" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <Wine className="w-8 h-8 text-purple-600" />
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{option.name}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {option.description}
                              </p>
                              <Badge variant="outline" className="text-xs mt-1">
                                By Bottle
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Wine className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Create wine options first in the Beverage management section</p>
                </div>
              )}
            </div>

            {/* Event Pricing Management - Only show for existing events */}
            {event && (
              <>
                <Separator className="my-6" />
                <EventPricingManager eventId={event.id} />
              </>
            )}

            {/* Event Venue Management */}
            <Separator className="my-6" />
            <EventVenueManager eventId={event?.id || null} isNewEvent={!event} />

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