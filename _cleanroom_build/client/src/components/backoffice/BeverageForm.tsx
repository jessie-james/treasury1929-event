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
import { Checkbox } from "@/components/ui/checkbox";
import { type FoodOption } from "@shared/schema";
import { Wine, Trash2 } from "lucide-react";

const beverageFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.number().min(0, "Price must be greater than 0"),
  type: z.literal("wine_bottle"),
  isAvailable: z.boolean().default(true),
});

type BeverageFormData = z.infer<typeof beverageFormSchema>;

interface Props {
  beverage?: FoodOption | null;
  onClose: () => void;
}

export function BeverageForm({ beverage, onClose }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<BeverageFormData>({
    resolver: zodResolver(beverageFormSchema),
    defaultValues: beverage 
      ? {
          name: beverage.name,
          description: beverage.description,
          price: (beverage.price ?? 0) / 100, // Convert cents to dollars for display
          type: "wine_bottle",
          isAvailable: beverage.isAvailable ?? true,
        }
      : {
          name: "",
          description: "",
          price: 0,
          type: "wine_bottle",
          isAvailable: true,
        },
  });

  const saveBeverage = useMutation({
    mutationFn: async (data: BeverageFormData) => {
      const url = beverage ? `/api/food-options/${beverage.id}` : "/api/food-options";
      const method = beverage ? "PUT" : "POST";
      
      const payload = {
        ...data,
        // Convert price to cents for storage
        price: Math.round(data.price * 100),
        // No image for beverages
        image: null,
        // No allergens/dietary restrictions for beverages
        allergens: [],
        dietaryRestrictions: [],
      };

      const response = await apiRequest(method, url, payload);
      if (!response.ok) {
        throw new Error("Failed to save beverage");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: beverage ? "Beverage updated" : "Beverage created",
        description: beverage 
          ? "The beverage has been updated successfully." 
          : "The beverage has been created successfully.",
      });
      
      // Invalidate and refetch food options
      queryClient.invalidateQueries({ queryKey: ["/api/food-options"] });
      
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteBeverage = useMutation({
    mutationFn: async () => {
      if (!beverage) return;
      
      const response = await apiRequest("DELETE", `/api/food-options/${beverage.id}`);
      if (!response.ok) {
        throw new Error("Failed to delete beverage");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Beverage deleted",
        description: "The beverage has been deleted successfully.",
      });
      
      // Invalidate and refetch food options
      queryClient.invalidateQueries({ queryKey: ["/api/food-options"] });
      
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { isPending } = saveBeverage;
  const { isPending: isDeleting } = deleteBeverage;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wine className="h-5 w-5" />
          {beverage ? "Edit Beverage" : "Add Beverage"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              console.log("Beverage form data:", data);
              saveBeverage.mutate(data);
            })}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Malbec Reserve" />
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
                    <Textarea {...field} placeholder="Wine description, vintage, region..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (per bottle)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </FormControl>
                  <FormDescription>
                    Price in dollars (e.g., 25.00 for $25)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isAvailable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Available</FormLabel>
                    <FormDescription>
                      Whether this beverage is available for selection
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              {beverage && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => deleteBeverage.mutate()}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Trash2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Beverage
                    </>
                  )}
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
                {isPending ? "Saving..." : beverage ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}