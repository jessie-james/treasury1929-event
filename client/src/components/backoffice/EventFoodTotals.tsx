
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FoodOption } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Props {
  eventId: number;
}

interface FoodTotals {
  salads: Record<string, number>;
  entrees: Record<string, number>;
  desserts: Record<string, number>;
  wines: Record<string, number>;
}

export function EventFoodTotals({ eventId }: Props) {
  const { data: foodOptions } = useQuery<FoodOption[]>({
    queryKey: ["/api/food-options"],
  });

  const { data: totals } = useQuery<FoodTotals>({
    queryKey: [`/api/events/${eventId}/food-totals`],
  });

  if (!totals || !foodOptions) return null;

  const categories = [
    { name: "Salads", key: "salads" as keyof FoodTotals, color: "bg-green-500" },
    { name: "Entrees", key: "entrees" as keyof FoodTotals, color: "bg-amber-500" },
    { name: "Desserts", key: "desserts" as keyof FoodTotals, color: "bg-pink-500" },
    { name: "Wines", key: "wines" as keyof FoodTotals, color: "bg-purple-500" }
  ];

  const getFoodName = (id: number, type: string) => {
    const option = foodOptions.find(o => o.id === id && o.type === type.slice(0, -1));
    return option?.name || "Unknown";
  };

  // Calculate total selections for all categories
  const getTotalSelections = () => {
    let total = 0;
    categories.forEach(category => {
      const categoryTotals = totals[category.key] || {};
      Object.values(categoryTotals).forEach(count => {
        total += count;
      });
    });
    return total;
  };

  const totalSelections = getTotalSelections();

  return (
    <Card className="shadow-md">
      <CardHeader className="bg-muted/50">
        <CardTitle className="text-lg">Food & Drink Selections</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <ScrollArea className="h-[300px] pr-4">
          {categories.map(category => {
            const categoryItems = Object.entries(totals[category.key] || {});
            if (categoryItems.length === 0) return null;
            
            return (
              <div key={category.key} className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{category.name}</h3>
                  <Badge variant="outline" className={category.color.replace('bg-', 'border-') + " text-xs"}>
                    {categoryItems.reduce((sum, [_, count]) => sum + count, 0)} orders
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {categoryItems.map(([id, count]) => {
                    const percentage = Math.round((count / totalSelections) * 100);
                    return (
                      <div key={id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{getFoodName(parseInt(id), category.key)}</span>
                          <span className="text-muted-foreground">{count} orders</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={percentage} className={`h-2 ${category.color}`} />
                          <span className="text-xs text-muted-foreground w-8">{percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
