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

// Define the common allergens and dietary restrictions
const ALLERGENS: Allergen[] = ["gluten", "dairy", "eggs", "peanuts", "tree_nuts", "soy", "fish", "shellfish", "sesame"];
const DIETARY_RESTRICTIONS: DietaryRestriction[] = ["vegetarian", "vegan", "halal", "kosher", "low_carb", "keto", "paleo"];

const foodFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  image: z.string().url("Must be a valid URL"),
  price: z.number().min(0, "Price must be greater than or equal to 0"),
  type: z.enum(["salad", "entree", "dessert"]),
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

  const form = useForm<FoodFormData>({
    resolver: zodResolver(foodFormSchema),
    defaultValues: food 
      ? {
          name: food.name,
          description: food.description,
          image: food.image,
          price: food.price ?? 0,
          type: food.type as "salad" | "entree" | "dessert",
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

  const { mutate: saveFood, isPending } = useMutation({
    mutationFn: async (data: FoodFormData) => {
      console.log("Submitting food data:", data);
      const endpoint = food ? `/api/food-options/${food.id}` : "/api/food-options";
      const method = food ? "PATCH" : "POST";
      return apiRequest(method, endpoint, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-options"] });
      toast({
        title: `Food item ${food ? "updated" : "created"} successfully`,
      });
      onClose();
    },
    onError: (error) => {
      console.error("Food save error:", error);
      toast({
        title: "Error",
        description: `Failed to ${food ? "update" : "create"} food item`,
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
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              console.log("Form data:", data);
              saveFood(data);
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
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input {...field} type="url" />
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
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
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
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-4" />
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Dietary Information</h3>
              <p className="text-sm text-muted-foreground">
                Add allergen warnings and dietary labels to help guests make informed choices.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Allergens */}
              <FormField
                control={form.control}
                name="allergens"
                render={({ field }) => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Allergens</FormLabel>
                      <FormDescription>
                        Select all allergens present in this dish
                      </FormDescription>
                    </div>
                    <div className="space-y-2">
                      {ALLERGENS.map((allergen) => (
                        <div key={allergen} className="flex items-center gap-2">
                          <Checkbox
                            id={`allergen-${allergen}`}
                            checked={field.value?.includes(allergen)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...(field.value || []), allergen]);
                              } else {
                                field.onChange(field.value?.filter((value) => value !== allergen) || []);
                              }
                            }}
                          />
                          <div className="grid gap-1.5 leading-none">
                            <label
                              htmlFor={`allergen-${allergen}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                            >
                              <div className="inline-flex items-center justify-center rounded-full bg-destructive/20 text-destructive p-1 w-6 h-6">
                                <div className="w-4 h-4">{allergenIcons[allergen as Allergen]}</div>
                              </div>
                              <span className="capitalize">{allergen.replace('_', ' ')}</span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                            >
                              <div className="inline-flex items-center justify-center rounded-full bg-green-500/20 text-green-600 p-1 w-6 h-6">
                                <div className="w-4 h-4">{dietaryIcons[restriction as DietaryRestriction]}</div>
                              </div>
                              <span className="capitalize">{restriction.replace('_', ' ')}</span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : food ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
