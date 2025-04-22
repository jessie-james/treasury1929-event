
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type FoodOption } from "@shared/schema";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface FoodTotals {
  salads: Record<string, number>;
  entrees: Record<string, number>;
  desserts: Record<string, number>;
  wines: Record<string, number>;
}

interface EventFoodTotalsProps {
  eventId: number;
}

export function EventFoodTotals({ eventId }: EventFoodTotalsProps) {
  const [totalItems, setTotalItems] = useState(0);

  const { data: foodOptions } = useQuery<FoodOption[]>({
    queryKey: ["/api/food-options"],
  });

  const { data: totals, isLoading } = useQuery<FoodTotals>({
    queryKey: [`/api/events/${eventId}/food-totals`],
    enabled: !!eventId,
  });

  useEffect(() => {
    if (totals) {
      const count = 
        Object.values(totals.salads).reduce((sum, count) => sum + count, 0) +
        Object.values(totals.entrees).reduce((sum, count) => sum + count, 0) +
        Object.values(totals.desserts).reduce((sum, count) => sum + count, 0) +
        Object.values(totals.wines).reduce((sum, count) => sum + count, 0);
      setTotalItems(count);
    }
  }, [totals]);

  const getFoodNameById = (id: string, type: 'salad' | 'entree' | 'dessert' | 'wine') => {
    const typeMap = {
      'salad': 'salad',
      'entree': 'entree',
      'dessert': 'dessert',
      'wine': 'wine'
    };
    
    const option = foodOptions?.find(o => o.id === parseInt(id) && o.type === typeMap[type]);
    return option?.name || `Item ${id}`;
  };

  const getPercentage = (count: number) => {
    return totalItems > 0 ? (count / totalItems) * 100 : 0;
  };

  const renderFoodSection = (title: string, items: Record<string, number>, type: 'salad' | 'entree' | 'dessert' | 'wine') => {
    const sortedItems = Object.entries(items)
      .sort(([, countA], [, countB]) => countB - countA);
    
    if (sortedItems.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <h3 className="font-medium">{title}</h3>
        {sortedItems.map(([id, count]) => (
          <div key={id} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{getFoodNameById(id, type)}</span>
              <span className="font-medium">{count} selections</span>
            </div>
            <Progress value={getPercentage(count)} className="h-2" />
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Food Orders</CardTitle>
          <CardDescription>Loading data...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!totals) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Food Orders</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">No food orders for this event yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Food Orders</CardTitle>
        <CardDescription>
          {totalItems} total selected items
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderFoodSection("Entrees", totals.entrees, 'entree')}
        {renderFoodSection("Salads", totals.salads, 'salad')}
        {renderFoodSection("Desserts", totals.desserts, 'dessert')}
        {renderFoodSection("Wines", totals.wines, 'wine')}
      </CardContent>
    </Card>
  );
}
