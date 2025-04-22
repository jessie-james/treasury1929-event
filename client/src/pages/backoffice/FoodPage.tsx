import { useQuery } from "@tanstack/react-query";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowUpDown } from "lucide-react";
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

type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc" | "id-asc" | "id-desc";

export default function FoodPage() {
  const [selectedFood, setSelectedFood] = useState<FoodOption | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");

  const { data: foodOptions } = useQuery<FoodOption[]>({
    queryKey: ["/api/food-options"],
  });

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
      grouped[type].sort((a, b) => {
        switch (sortBy) {
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
            return 0;
        }
      });
    });
    
    return grouped;
  }, [foodOptions, sortBy]);

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Food Management</h1>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-[200px]">
              <Label htmlFor="food-sort" className="whitespace-nowrap">Sort by:</Label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger id="food-sort">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  <SelectItem value="price-asc">Price (Low to High)</SelectItem>
                  <SelectItem value="price-desc">Price (High to Low)</SelectItem>
                  <SelectItem value="id-asc">Added (Oldest first)</SelectItem>
                  <SelectItem value="id-desc">Added (Newest first)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setIsCreating(true)} className="whitespace-nowrap">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Food Item
            </Button>
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

        <Tabs defaultValue="salad">
          <TabsList>
            <TabsTrigger value="salad">Salads</TabsTrigger>
            <TabsTrigger value="entree">Entrees</TabsTrigger>
            <TabsTrigger value="dessert">Desserts</TabsTrigger>
          </TabsList>

          {["salad", "entree", "dessert"].map((type) => (
            <TabsContent key={type} value={type}>
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
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </BackofficeLayout>
  );
}
