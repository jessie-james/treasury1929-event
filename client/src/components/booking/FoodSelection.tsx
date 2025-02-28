import { useQuery } from "@tanstack/react-query";
import { type FoodOption } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SeatSelections {
  name: string;
  salad: number | undefined;
  entree: number | undefined;
  dessert: number | undefined;
  wine: number | undefined;
}

interface Props {
  selectedSeats: number[];
  onComplete: (selections: Record<string, number>[], names: Record<number, string>) => void;
}

export function FoodSelection({ selectedSeats, onComplete }: Props) {
  const { data: options } = useQuery<FoodOption[]>({
    queryKey: ["/api/food-options"],
  });

  const [currentSeat, setCurrentSeat] = useState<string>(selectedSeats[0].toString());
  const [selections, setSelections] = useState<Record<number, SeatSelections>>(
    Object.fromEntries(
      selectedSeats.map(seat => [
        seat,
        { name: "", salad: undefined, entree: undefined, dessert: undefined, wine: undefined }
      ])
    )
  );

  const byType = options?.reduce((acc, option) => {
    if (!acc[option.type]) acc[option.type] = [];
    acc[option.type].push(option);
    return acc;
  }, {} as Record<string, FoodOption[]>) ?? {};

  const isComplete = selectedSeats.every(seat => {
    const selection = selections[seat];
    return (
      selection?.name.trim() !== "" &&
      selection?.salad !== undefined &&
      selection?.entree !== undefined &&
      selection?.dessert !== undefined &&
      selection?.wine !== undefined
    );
  });

  const handleComplete = () => {
    if (isComplete) {
      const foodSelections = selectedSeats.map(seat => ({
        salad: selections[seat].salad!,
        entree: selections[seat].entree!,
        dessert: selections[seat].dessert!,
        wine: selections[seat].wine!,
      }));

      const names = Object.fromEntries(
        selectedSeats.map(seat => [seat, selections[seat].name])
      );

      onComplete(foodSelections, names);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Select Menu Items</h2>
        <p className="text-muted-foreground">
          Choose menu items for each person
        </p>
      </div>

      <Tabs value={currentSeat} onValueChange={setCurrentSeat}>
        <TabsList className="grid grid-cols-4 w-full">
          {selectedSeats.map(seat => (
            <TabsTrigger 
              key={seat} 
              value={seat.toString()}
              className="relative"
            >
              Seat #{seat}
              {selections[seat]?.name &&
               selections[seat]?.salad &&
               selections[seat]?.entree && 
               selections[seat]?.dessert && 
               selections[seat]?.wine && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {selectedSeats.map(seat => (
          <TabsContent key={seat} value={seat.toString()} className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Guest Information</h3>
              <Input
                placeholder="First Name"
                value={selections[seat]?.name || ""}
                onChange={(e) =>
                  setSelections({
                    ...selections,
                    [seat]: {
                      ...selections[seat],
                      name: e.target.value
                    }
                  })
                }
              />
            </div>

            {["salad", "entree", "dessert", "wine"].map((type) => (
              <div key={type} className="space-y-4">
                <h3 className="text-lg font-semibold capitalize">{type}</h3>
                <RadioGroup
                  value={selections[seat]?.[type as keyof SeatSelections]?.toString()}
                  onValueChange={(value) =>
                    setSelections({
                      ...selections,
                      [seat]: {
                        ...selections[seat],
                        [type]: parseInt(value)
                      }
                    })
                  }
                >
                  <div className="grid gap-4 md:grid-cols-3">
                    {byType[type]?.map((option) => (
                      <Card key={option.id} className="overflow-hidden">
                        <div className="aspect-[4/3] relative">
                          <img
                            src={option.image}
                            alt={option.name}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value={option.id.toString()} id={`${type}-${seat}-${option.id}`} />
                            <Label htmlFor={`${type}-${seat}-${option.id}`}>{option.name}</Label>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {option.description}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      <Button
        className="w-full"
        disabled={!isComplete}
        onClick={handleComplete}
      >
        Continue to Checkout
      </Button>
    </div>
  );
}