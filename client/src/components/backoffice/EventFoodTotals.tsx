
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
import { FoodIconSet, Allergen, DietaryRestriction } from "@/components/ui/food-icons";

interface FoodTotals {
  salads: Record<string, number>;
  entrees: Record<string, number>;
  desserts: Record<string, number>;
}

interface EventFoodTotalsProps {
  eventId: number;
  type?: 'salad' | 'entree' | 'dessert';
  className?: string;
}

export function EventFoodTotals({ eventId, type, className }: EventFoodTotalsProps) {
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
        Object.values(totals.desserts).reduce((sum, count) => sum + count, 0);
      setTotalItems(count);
    }
  }, [totals]);

  const getFoodOptionById = (id: string, type: 'salad' | 'entree' | 'dessert') => {
    const typeMap = {
      'salad': 'salad',
      'entree': 'entree',
      'dessert': 'dessert'
    };
    
    return foodOptions?.find(o => o.id === parseInt(id) && o.type === typeMap[type]);
  };
  
  const getFoodNameById = (id: string, type: 'salad' | 'entree' | 'dessert') => {
    const option = getFoodOptionById(id, type);
    return option?.name || `Item ${id}`;
  };

  const getPercentage = (count: number) => {
    return totalItems > 0 ? (count / totalItems) * 100 : 0;
  };

  const renderFoodSection = (title: string, items: Record<string, number>, type: 'salad' | 'entree' | 'dessert') => {
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
            {/* Display allergen and dietary icons */}
            {(() => {
              const foodOption = getFoodOptionById(id, type);
              if (foodOption) {
                return (
                  <FoodIconSet 
                    allergens={(foodOption.allergens || []) as Allergen[]} 
                    dietaryRestrictions={(foodOption.dietaryRestrictions || []) as DietaryRestriction[]}
                    size="sm"
                  />
                );
              }
              return null;
            })()}
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

  // If specific type is passed, only show that type's data
  if (type) {
    const data = type === 'entree' ? totals.entrees :
                 type === 'salad' ? totals.salads :
                 totals.desserts;
                 
    const title = type === 'entree' ? 'Entrees' :
                  type === 'salad' ? 'Salads' :
                  'Desserts';
                  
    return (
      <div className={className}>
        {renderFoodSection(title, data, type)}
      </div>
    );
  }
  
  // Otherwise show all types
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
      </CardContent>
    </Card>
  );
}
