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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { type FoodOption } from "@shared/schema";
import { Allergen, DietaryRestriction, FoodIconSet, allergenIcons, dietaryIcons } from "@/components/ui/food-icons";
import { Separator } from "@/components/ui/separator";
import { useState, useRef, useEffect } from "react";
import { ImagePlus, Loader2, RefreshCw, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// Define the common allergens and dietary restrictions
const ALLERGENS: string[] = ["gluten", "dairy", "eggs", "peanuts", "tree_nuts", "soy", "fish", "shellfish", "sesame"];
const DIETARY_RESTRICTIONS: string[] = ["gluten-free", "vegan", "vegetarian", "dairy-free"];

const foodFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  // Allow empty string for image - not all food items may have images
  image: z.string().optional(),
  price: z.number().min(0, "Price must be greater than or equal to 0").optional(),
  type: z.enum(["salad", "entree", "dessert", "wine_bottle"]),
  allergens: z.array(z.string()).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
});

type FoodFormData = z.infer<typeof foodFormSchema>;

interface Props {
  food?: FoodOption | null;
  onClose: () => void;
}

export function FoodForm({ food, onClose }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(food?.image || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Set existing food image as uploaded image on component mount
  useEffect(() => {
    if (food?.image) {
      setUploadedImage(food.image);
    }
  }, [food]);

  const form = useForm<FoodFormData>({
    resolver: zodResolver(foodFormSchema),
    defaultValues: food 
      ? {
          name: food.name,
          description: food.description || "",
          image: food.image || "",
          // Convert price from cents to dollars for display (database stores in cents)
          price: food.price ? (food.price / 100) : 0,
          type: food.type as "salad" | "entree" | "dessert" | "wine_bottle",
          allergens: food.allergens ?? [],
          dietaryRestrictions: food.dietaryRestrictions ?? [],
        }
      : {
          name: "",
          description: "",
          image: "",
          price: 0,
          type: "salad",
          allergens: [],
          dietaryRestrictions: [],
        },
  });
  
  // Function to handle image upload
  const handleImageUpload = async (file: File) => {
    if (!file) return;
    
    setUploading(true);
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      console.log('Starting food image upload...');
      console.log('File info:', {
        name: file.name,
        type: file.type,
        size: file.size
      });
      
      const uploadUrl = '/api/upload/food-image';
      console.log('Making upload request to:', uploadUrl);
      console.log('Full URL:', window.location.origin + uploadUrl);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      console.log('Upload response status:', response.status);
      console.log('Upload response headers:', [...response.headers.entries()]);
      
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
      
      // Trigger form validation after image upload
      await form.trigger('image');
      
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

  const { mutate: saveFood, isPending } = useMutation({
    mutationFn: async (data: FoodFormData) => {
      const endpoint = food ? `/api/food-options/${food.id}` : "/api/food-options";
      const method = food ? "PATCH" : "POST";
      
      // Convert price to cents for storage
      const payload = {
        ...data,
        image: uploadedImage || data.image || "",
        price: data.price !== undefined ? Math.round(data.price * 100) : undefined,
      };
      
      return await apiRequest(method, endpoint, payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-options"] });
      toast({
        title: `Food item ${food ? "updated" : "created"} successfully`,
      });
      onClose();
    },
    onError: (error) => {
      console.error("Full error object:", error);
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      toast({
        title: "Error",
        description: `Failed to ${food ? "update" : "create"} food item: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    },
  });

  const { mutate: deleteFood, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      if (!food) return;
      return apiRequest("DELETE", `/api/food-options/${food.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-options"] });
      toast({
        title: "Food item deleted successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete food item",
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{food ? "Edit Food Item" : "Add Food Item"}</CardTitle>
        {user ? (
          <div className="text-sm text-green-600">
            Logged in as: {user.email} ({user.role})
          </div>
        ) : (
          <div className="text-sm text-red-600">
            Not logged in - You must log in as admin to save changes
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(
            (data) => {
              console.log("🎯 FORM SUBMIT SUCCESS");
              console.log("Form data:", data);
              console.log("Form errors:", form.formState.errors);
              console.log("About to call saveFood mutation");
              saveFood(data);
            },
            (errors) => {
              console.log("❌ FORM VALIDATION FAILED");
              console.log("Validation errors:", errors);
              console.log("All form state:", form.formState);
              toast({
                title: "Form validation failed",
                description: `Errors: ${Object.keys(errors).join(", ")}`,
                variant: "destructive"
              });
            }
          )} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
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
                  <FormLabel>Food Image</FormLabel>
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
                          alt="Food preview" 
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
                    
                    {/* Upload controls */}
                    <div className="flex items-center gap-4 w-full">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
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
                            Upload Image
                          </>
                        )}
                      </Button>
                      
                      {/* Hidden input to store the actual value - this is what gets submitted */}
                      <Input
                        type="hidden"
                        {...field}
                      />
                      
                      {/* Allow direct URL input as alternative */}
                      {!uploadedImage && (
                        <Input
                          type="url"
                          placeholder="Or enter image URL"
                          className="flex-1"
                          value={field.value}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                          }}
                          disabled={uploading}
                        />
                      )}
                    </div>
                  </div>
                  <FormDescription>
                    Upload a photo of the dish or provide a URL to an existing image.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select food type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="salad">Salad</SelectItem>
                      <SelectItem value="entree">Entree</SelectItem>
                      <SelectItem value="dessert">Dessert</SelectItem>
                      <SelectItem value="wine_bottle">Wine</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-4" />
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Dietary Information</h3>
            </div>

            {/* Dietary Restrictions */}
            <FormField
              control={form.control}
              name="dietaryRestrictions"
              render={({ field }) => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Dietary Labels</FormLabel>
                    <FormDescription>
                      Select all dietary options this dish is suitable for
                    </FormDescription>
                  </div>
                  <div className="space-y-2">
                    {DIETARY_RESTRICTIONS.map((restriction) => (
                      <div key={restriction} className="flex items-center gap-2">
                        <Checkbox
                          id={`diet-${restriction}`}
                          checked={field.value?.includes(restriction)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              field.onChange([...(field.value || []), restriction]);
                            } else {
                              field.onChange(field.value?.filter((value) => value !== restriction) || []);
                            }
                          }}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={`diet-${restriction}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {restriction === 'gluten-free' ? 'GF' :
                             restriction === 'vegan' ? 'VG' :
                             restriction === 'vegetarian' ? 'V' :
                             restriction === 'dairy-free' ? 'DF' : restriction}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              {food && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => deleteFood()}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete Food"}
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
              <Button 
                type="submit" 
                disabled={isPending}
                onClick={() => {
                  console.log("🔲 UPDATE BUTTON CLICKED");
                  console.log("Form state:", {
                    isValid: form.formState.isValid,
                    isDirty: form.formState.isDirty,
                    errors: form.formState.errors,
                    values: form.getValues()
                  });
                }}
              >
                {isPending ? "Saving..." : food ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
