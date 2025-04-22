import { useQuery, useMutation } from "@tanstack/react-query";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowUpDown, GripVertical } from "lucide-react";
import { useState, useMemo } from "react";
import { FoodForm } from "@/components/backoffice/FoodForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type FoodOption } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SortOption = "display-order" | "name-asc" | "name-desc" | "price-asc" | "price-desc" | "id-asc" | "id-desc";

export default function FoodPage() {
  const [selectedFood, setSelectedFood] = useState<FoodOption | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("display-order");
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("salad");
  const { toast } = useToast();

  const { data: foodOptions, refetch } = useQuery<FoodOption[]>({
    queryKey: ["/api/food-options"],
    staleTime: 0, // Make sure data is always fresh
  });
  
  const updateOrderMutation = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      const res = await apiRequest("POST", "/api/food-options/order", { orderedIds });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Order updated",
        description: "Food item display order has been updated successfully.",
      });
      
      // Force a complete cache invalidation and refetch
      queryClient.invalidateQueries({ queryKey: ["/api/food-options"] });
      
      // Wait a moment for the server to process the update
      setTimeout(async () => {
        await refetch(); // Explicitly refetch food options data with await
        
        // Switch back to non-reordering mode and use custom order
        setSortBy("display-order"); // Set sort to display custom order
        setIsReorderMode(false);
      }, 800); // Increased timeout to ensure the backend has time to process
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update order",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !foodOptions) return;
    
    // Use the active tab as the food type
    const foodType = activeTab;
    const foodsOfType = sortedFoodByType[foodType] || [];
    
    const items = Array.from(foodsOfType);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Get the ordered IDs to send to the server
    const orderedIds = items.map(item => item.id);
    
    // Update the order in the database
    updateOrderMutation.mutate(orderedIds);
  };

  const sortedFoodByType = useMemo(() => {
    if (!foodOptions) return {};
    
    // First, group by type
    const grouped = foodOptions.reduce((acc, food) => {
      if (!acc[food.type]) {
        acc[food.type] = [];
      }
      acc[food.type].push(food);
      return acc;
    }, {} as Record<string, FoodOption[]>);
    
    // Then sort each group
    Object.keys(grouped).forEach(type => {
      if (isReorderMode) {
        // In reorder mode, sort by display_order
        grouped[type].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      } else {
        grouped[type].sort((a, b) => {
          switch (sortBy) {
            case "display-order":
              return (a.displayOrder || 0) - (b.displayOrder || 0);
            case "name-asc":
              return a.name.localeCompare(b.name);
            case "name-desc":
              return b.name.localeCompare(a.name);
            case "price-asc":
              return (a.price || 0) - (b.price || 0);
            case "price-desc":
              return (b.price || 0) - (a.price || 0);
            case "id-asc":
              return a.id - b.id;
            case "id-desc":
              return b.id - a.id;
            default:
              // Default to display order if no sort is specified
              return (a.displayOrder || 0) - (b.displayOrder || 0);
          }
        });
      }
    });
    
    return grouped;
  }, [foodOptions, sortBy, isReorderMode]);

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Food Management</h1>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {!isReorderMode ? (
              <>
                <div className="flex items-center gap-2 w-full sm:w-[200px]">
                  <Label htmlFor="food-sort" className="whitespace-nowrap">Sort by:</Label>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                    <SelectTrigger id="food-sort">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="display-order">Custom Order</SelectItem>
                      <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                      <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                      <SelectItem value="price-asc">Price (Low to High)</SelectItem>
                      <SelectItem value="price-desc">Price (High to Low)</SelectItem>
                      <SelectItem value="id-asc">Added (Oldest first)</SelectItem>
                      <SelectItem value="id-desc">Added (Newest first)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setIsReorderMode(true)}
                  className="whitespace-nowrap"
                >
                  <GripVertical className="h-4 w-4 mr-2" />
                  Reorder Food Items
                </Button>
                <Button onClick={() => setIsCreating(true)} className="whitespace-nowrap">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Food Item
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Drag and drop food items to change their display order
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setIsReorderMode(false)}
                  className="whitespace-nowrap"
                >
                  Done Reordering
                </Button>
              </>
            )}
          </div>
        </div>

        {(isCreating || selectedFood) && (
          <FoodForm
            food={selectedFood}
            onClose={() => {
              setSelectedFood(null);
              setIsCreating(false);
            }}
          />
        )}

        <Tabs 
          defaultValue="salad" 
          value={activeTab}
          onValueChange={(value) => setActiveTab(value)}
        >
          <TabsList>
            <TabsTrigger value="salad">Salads</TabsTrigger>
            <TabsTrigger value="entree">Entrees</TabsTrigger>
            <TabsTrigger value="dessert">Desserts</TabsTrigger>
          </TabsList>

          {["salad", "entree", "dessert"].map((type) => (
            <TabsContent key={type} value={type}>
              {!isReorderMode ? (
                <div className="grid gap-6">
                  {sortedFoodByType[type]?.map((food) => (
                    <Card key={food.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{food.name}</CardTitle>
                            <CardDescription>{food.description}</CardDescription>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => setSelectedFood(food)}
                          >
                            Edit
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <img
                              src={food.image}
                              alt={food.name}
                              className="rounded-lg w-full aspect-video object-cover"
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              {food.description}
                            </p>
                            <p className="text-sm font-medium">
                              Price: ${food.price}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId={type}>
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="grid gap-4 mt-4"
                      >
                        {sortedFoodByType[type]?.map((food, index) => (
                          <Draggable key={food.id} draggableId={String(food.id)} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`rounded-lg border p-4 transition-colors ${
                                  snapshot.isDragging ? "border-primary bg-accent" : ""
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div {...provided.dragHandleProps} className="cursor-grab">
                                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                      <h3 className="font-medium">{food.name}</h3>
                                      <p className="text-sm text-muted-foreground">
                                        ${food.price}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="h-16 w-24 overflow-hidden rounded">
                                    <img
                                      src={food.image}
                                      alt={food.name}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </BackofficeLayout>
  );
}
