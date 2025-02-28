import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FoodOption } from "@shared/schema";

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
    { name: "Salads", key: "salads" as keyof FoodTotals },
    { name: "Entrees", key: "entrees" as keyof FoodTotals },
    { name: "Desserts", key: "desserts" as keyof FoodTotals },
    { name: "Wines", key: "wines" as keyof FoodTotals }
  ];

  const getFoodName = (id: number, type: string) => {
    const option = foodOptions.find(o => o.id === id && o.type === type.slice(0, -1));
    return option?.name || "Unknown";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Food & Drink Selections</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="grid grid-cols-2 gap-4">
            {categories.map(category => (
              <div key={category.key} className="space-y-2">
                <h3 className="font-semibold">{category.name}</h3>
                <div className="space-y-1">
                  {Object.entries(totals[category.key] || {}).map(([id, count]) => (
                    <div key={id} className="flex justify-between text-sm">
                      <span>{getFoodName(parseInt(id), category.key)}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}