import { useQuery } from "@tanstack/react-query";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
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

export default function FoodPage() {
  const [selectedFood, setSelectedFood] = useState<FoodOption | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: foodOptions } = useQuery<FoodOption[]>({
    queryKey: ["/api/food-options"],
  });

  const foodByType = foodOptions?.reduce((acc, food) => {
    if (!acc[food.type]) {
      acc[food.type] = [];
    }
    acc[food.type].push(food);
    return acc;
  }, {} as Record<string, FoodOption[]>) ?? {};

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Food Management</h1>
          <Button onClick={() => setIsCreating(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Food Item
          </Button>
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
                {foodByType[type]?.map((food) => (
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
