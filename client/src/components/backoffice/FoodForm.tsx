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
import { type FoodOption } from "@shared/schema";

const foodFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  image: z.string().url("Must be a valid URL"),
  price: z.number().min(0, "Price must be greater than or equal to 0"),
  type: z.enum(["salad", "entree", "dessert"]),
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
    defaultValues: food || {
      name: "",
      description: "",
      image: "",
      price: 0,
      type: "salad",
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
