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
    <Card className="bg-card/50">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Food & Drink Selections</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-6">
            {categories.map(category => (
              <Card key={category.key} className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-bold">{category.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(totals[category.key] || {}).map(([id, count]) => (
                      <div key={id} className="flex items-center justify-between border-b pb-3 last:border-0">
                        <span className="text-lg">
                          {getFoodName(parseInt(id), category.key)}
                        </span>
                        <span className="text-3xl font-bold text-primary">{count}</span>
                      </div>
                    ))}
                    {Object.keys(totals[category.key] || {}).length === 0 && (
                      <p className="text-lg text-muted-foreground italic text-center py-4">
                        No {category.name.toLowerCase()} selected
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}