import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Wine, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { FoodOption } from "@shared/schema";

interface WineSelectionProps {
  eventId: number;
  onComplete: (selections: WineSelection[]) => void;
  onSkip: () => void;
}

interface WineSelection {
  id: number;
  name: string;
  type: string;
  price: number;
  quantity: number;
}

export function WineSelection({ eventId, onComplete, onSkip }: WineSelectionProps) {
  const [selections, setSelections] = useState<Record<number, number>>({});

  // Fetch wine options
  const { data: wineOptions = [], isLoading } = useQuery<FoodOption[]>({
    queryKey: ["/api/food-options"],
    select: (data) => data.filter(option => 
      option.type === 'wine_glass' || option.type === 'wine_bottle'
    ),
  });

  const updateQuantity = (optionId: number, change: number) => {
    setSelections(prev => {
      const current = prev[optionId] || 0;
      const newQuantity = Math.max(0, current + change);
      
      if (newQuantity === 0) {
        const { [optionId]: _, ...rest } = prev;
        return rest;
      }
      
      return { ...prev, [optionId]: newQuantity };
    });
  };

  const handleComplete = () => {
    const wineSelections: WineSelection[] = Object.entries(selections)
      .map(([optionId, quantity]) => {
        const option = wineOptions.find(opt => opt.id === parseInt(optionId));
        if (!option || quantity === 0) return null;
        
        return {
          id: option.id,
          name: option.name,
          type: option.type,
          price: option.price,
          quantity
        };
      })
      .filter(Boolean) as WineSelection[];

    onComplete(wineSelections);
  };

  const totalCost = Object.entries(selections).reduce((total, [optionId, quantity]) => {
    const option = wineOptions.find(opt => opt.id === parseInt(optionId));
    return total + (option ? (option.price * quantity) / 100 : 0);
  }, 0);

  const hasSelections = Object.keys(selections).length > 0;

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading wine options...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Wine & Beverages</h2>
        <p className="text-muted-foreground">
          Enhance your evening with our curated wine selection
        </p>
      </div>

      {/* Alcohol Policy Notice */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>21+ Only:</strong> Valid ID required for alcohol service. 
          Wine orders can be modified until 48 hours before your event.
        </AlertDescription>
      </Alert>

      {/* Wine by the Glass */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wine className="h-5 w-5" />
            Wine by the Glass
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {wineOptions
              .filter(option => option.type === 'wine_glass')
              .map((option) => (
                <div key={option.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{option.name}</h4>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                    <p className="text-sm font-medium mt-1">
                      ${(option.price / 100).toFixed(2)} per glass
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(option.id, -1)}
                      disabled={!selections[option.id]}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">
                      {selections[option.id] || 0}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(option.id, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Wine Bottles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wine className="h-5 w-5" />
            Wine Bottles
            <Badge variant="secondary">Best Value</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {wineOptions
              .filter(option => option.type === 'wine_bottle')
              .map((option) => (
                <div key={option.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{option.name}</h4>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                    <p className="text-sm font-medium mt-1">
                      ${(option.price / 100).toFixed(2)} per bottle (750ml)
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(option.id, -1)}
                      disabled={!selections[option.id]}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">
                      {selections[option.id] || 0}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(option.id, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      {hasSelections && (
        <Card>
          <CardHeader>
            <CardTitle>Wine Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(selections).map(([optionId, quantity]) => {
                const option = wineOptions.find(opt => opt.id === parseInt(optionId));
                if (!option || quantity === 0) return null;
                
                return (
                  <div key={optionId} className="flex justify-between text-sm">
                    <span>{option.name} × {quantity}</span>
                    <span>${((option.price * quantity) / 100).toFixed(2)}</span>
                  </div>
                );
              })}
              <div className="border-t pt-2 font-medium">
                <div className="flex justify-between">
                  <span>Wine Total</span>
                  <span>${totalCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onSkip}>
          Skip Wine Selection
        </Button>
        <Button onClick={handleComplete}>
          {hasSelections ? "Continue with Wine" : "Continue without Wine"}
        </Button>
      </div>
    </div>
  );
}