import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { type FoodOption } from "@shared/schema";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Wine, Plus, Minus, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WineSelectionProps {
  eventId: number;
  onComplete: (selections: any[]) => void;
  onSkip: () => void;
}

interface WineSelection {
  id: number;
  name: string;
  type: 'wine_glass' | 'wine_bottle';
  quantity: number;
  price: number;
}

export function WineSelection({ eventId, onComplete, onSkip }: WineSelectionProps) {
  const [selections, setSelections] = useState<WineSelection[]>([]);
  const [showAlcoholModal, setShowAlcoholModal] = useState(false);

  // Get wine options for this event
  const { data: options, isLoading } = useQuery<FoodOption[]>({
    queryKey: [`/api/events/${eventId}/food-options`]
  });

  const wineOptions = options?.filter(option => 
    option.type === 'wine_glass' || option.type === 'wine_bottle'
  ) || [];

  const glasses = wineOptions.filter(option => option.type === 'wine_glass');
  const bottles = wineOptions.filter(option => option.type === 'wine_bottle');

  const updateQuantity = (optionId: number, delta: number) => {
    setSelections(prev => {
      const existing = prev.find(s => s.id === optionId);
      const option = wineOptions.find(o => o.id === optionId);
      
      if (!option) return prev;

      if (!existing && delta > 0) {
        return [...prev, {
          id: optionId,
          name: option.name,
          type: option.type as 'wine_glass' | 'wine_bottle',
          quantity: 1,
          price: option.price
        }];
      }

      return prev.map(s => {
        if (s.id === optionId) {
          const newQuantity = Math.max(0, s.quantity + delta);
          return newQuantity > 0 ? { ...s, quantity: newQuantity } : null;
        }
        return s;
      }).filter(Boolean) as WineSelection[];
    });
  };

  const getQuantity = (optionId: number) => {
    return selections.find(s => s.id === optionId)?.quantity || 0;
  };

  const totalCost = selections.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleComplete = () => {
    onComplete(selections);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading wine options...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Wine className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Wine Selection</h2>
        </div>
        <p className="text-muted-foreground">
          Add wine to your order or skip to continue without wine
        </p>
      </div>

      {wineOptions.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Wine Glasses */}
          {glasses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wine className="h-5 w-5" />
                  Wine by the Glass
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {glasses.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">{option.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {option.description}
                          </p>
                          <p className="text-sm font-medium mt-1">
                            ${(option.price / 100).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(option.id, -1)}
                            disabled={getQuantity(option.id) === 0}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center">{getQuantity(option.id)}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(option.id, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Wine Bottles */}
          {bottles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wine className="h-5 w-5" />
                  Wine Bottles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {bottles.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">{option.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {option.description}
                          </p>
                          <p className="text-sm font-medium mt-1">
                            ${(option.price / 100).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(option.id, -1)}
                            disabled={getQuantity(option.id) === 0}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center">{getQuantity(option.id)}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(option.id, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="text-center p-8">
          <p className="text-muted-foreground">No wine options available for this event.</p>
        </div>
      )}

      {/* Summary */}
      {selections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Wine Selection Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selections.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.name} x{item.quantity}</span>
                  <span>${((item.price * item.quantity) / 100).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 font-medium">
                <div className="flex justify-between">
                  <span>Total Wine Cost:</span>
                  <span>${(totalCost / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alcohol Policy Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Alcohol Policy:</strong> Mixed drinks are available at the venue. 
          Please arrive 5-10 minutes early and bring a valid ID.
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Dialog open={showAlcoholModal} onOpenChange={setShowAlcoholModal}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-1 sm:flex-none">
              <Wine className="h-4 w-4 mr-2" />
              Select Alcohol at Venue
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Order Alcohol at Venue</DialogTitle>
              <DialogDescription>
                You can order alcoholic beverages directly at the venue during your event.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Available at Venue:</strong> Full bar with mixed drinks, additional wine options, 
                  beer, and specialty cocktails. Payment accepted at the venue.
                </AlertDescription>
              </Alert>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Please arrive 5-10 minutes early and bring a valid ID 
                  for alcohol service.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowAlcoholModal(false)}>
                Got it
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={onSkip} className="flex-1 sm:flex-none">
          Skip Wine Selection
        </Button>

        {selections.length > 0 && (
          <Button onClick={handleComplete} className="flex-1 sm:flex-none">
            Continue with Wine (${(totalCost / 100).toFixed(2)})
          </Button>
        )}
      </div>
    </div>
  );
}