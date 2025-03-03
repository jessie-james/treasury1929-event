import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import type { FoodOption } from "@shared/schema";

interface Props {
  eventId: number;
  type: string;
  className?: string;
}

interface FoodTotals {
  [type: string]: Record<string, number>;
}

export function EventFoodTotals({ eventId, type, className }: Props) {
  const { data: foodOptions } = useQuery<FoodOption[]>({
    queryKey: ["/api/food-options"],
  });

  const { data: totals } = useQuery<FoodTotals>({
    queryKey: [`/api/events/${eventId}/food-totals`],
  });

  if (!totals || !foodOptions) return null;

  const getFoodName = (id: string) => {
    const option = foodOptions.find(o => o.id === parseInt(id) && o.type === type);
    return option?.name || "Unknown";
  };

  const currentTotals = totals[`${type}s`] || {};
  const entries = Object.entries(currentTotals);

  if (entries.length === 0) {
    return (
      <div className="col-span-full">
        <p className="text-lg text-muted-foreground italic text-center py-4">
          No {type} selections
        </p>
      </div>
    );
  }

  return (
    <>
      {entries.map(([id, count]) => (
        <Card key={id} className="col-span-1">
          <CardContent className="p-4">
            <div className="flex flex-col items-start gap-2">
              <h3 className="font-medium text-lg line-clamp-2">
                {getFoodName(id)}
              </h3>
              <p className={className}>
                {count}
                <span className="text-base font-normal text-muted-foreground ml-2">orders</span>
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}