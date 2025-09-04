
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { type FoodOption } from "@shared/schema";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FoodTotals {
  salads: Record<string, number>;
  entrees: Record<string, number>;
  desserts: Record<string, number>;
  wines?: Record<string, number>;
}

interface EventFoodTotalsProps {
  eventId: number;
  type?: 'salad' | 'entree' | 'dessert';
  className?: string;
}

export function EventFoodTotals({ eventId, type, className }: EventFoodTotalsProps) {
  const [totalItems, setTotalItems] = useState(0);
  const [saladsTotal, setSaladsTotal] = useState(0);
  const [entreesTotal, setEntreesTotal] = useState(0);
  const [dessertsTotal, setDessertsTotal] = useState(0);

  const { data: foodOptions } = useQuery<FoodOption[]>({
    queryKey: ["/api/food-options"],
  });

  const { data: totals, isLoading } = useQuery<FoodTotals>({
    queryKey: [`/api/events/${eventId}/food-totals`],
    enabled: !!eventId,
  });

  useEffect(() => {
    if (totals) {
      const saladCount = Object.values(totals.salads).reduce((sum, count) => sum + count, 0);
      const entreeCount = Object.values(totals.entrees).reduce((sum, count) => sum + count, 0);
      const dessertCount = Object.values(totals.desserts).reduce((sum, count) => sum + count, 0);
      
      setSaladsTotal(saladCount);
      setEntreesTotal(entreeCount);
      setDessertsTotal(dessertCount);
      setTotalItems(saladCount + entreeCount + dessertCount);
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

  const getPercentage = (count: number, total: number) => {
    return total > 0 ? (count / total) * 100 : 0;
  };

  const renderFoodSection = (items: Record<string, number>, type: 'salad' | 'entree' | 'dessert', sectionTotal: number) => {
    const sortedItems = Object.entries(items)
      .sort(([, countA], [, countB]) => countB - countA);
    
    if (sortedItems.length === 0) {
      return <p className="text-muted-foreground py-4 text-center">No {type} selections</p>;
    }
    
    return (
      <div className="space-y-4">
        {sortedItems.map(([id, count]) => (
          <div key={id} className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="font-medium">{getFoodNameById(id, type)}</div>
              <div className="flex space-x-2 items-center">
                <span className="font-bold text-lg">{count}</span>
                <span className="text-muted-foreground text-sm">({Math.round(getPercentage(count, sectionTotal))}%)</span>
              </div>
            </div>
            <Progress 
              value={getPercentage(count, sectionTotal)} 
              className="h-2" 
            />
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!totals) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground py-6">No food orders for this event yet.</p>
        </CardContent>
      </Card>
    );
  }

  // If specific type is passed, only show that type's data
  if (type) {
    const data = type === 'entree' ? totals.entrees :
                 type === 'salad' ? totals.salads :
                 totals.desserts;
    
    const sectionTotal = type === 'entree' ? entreesTotal :
                         type === 'salad' ? saladsTotal :
                         dessertsTotal;
                 
    return (
      <div className={className}>
        {renderFoodSection(data, type, sectionTotal)}
      </div>
    );
  }
  
  // Otherwise show all types in tabs
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">Total selections: <span className="font-medium">{totalItems}</span></p>
        <div className="flex space-x-3 text-sm">
          <span className="px-2 py-1 rounded-full bg-primary/10">Salads: {saladsTotal}</span>
          <span className="px-2 py-1 rounded-full bg-primary/10">Entrees: {entreesTotal}</span>
          <span className="px-2 py-1 rounded-full bg-primary/10">Desserts: {dessertsTotal}</span>
        </div>
      </div>

      <Tabs defaultValue="entrees" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="salads">Salads</TabsTrigger>
          <TabsTrigger value="entrees">Entrees</TabsTrigger>
          <TabsTrigger value="desserts">Desserts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="salads">
          <Card>
            <CardContent className="p-4 pt-6">
              {renderFoodSection(totals.salads, 'salad', saladsTotal)}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="entrees">
          <Card>
            <CardContent className="p-4 pt-6">
              {renderFoodSection(totals.entrees, 'entree', entreesTotal)}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="desserts">
          <Card>
            <CardContent className="p-4 pt-6">
              {renderFoodSection(totals.desserts, 'dessert', dessertsTotal)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
