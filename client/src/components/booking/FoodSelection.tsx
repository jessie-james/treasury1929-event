import { useQuery } from "@tanstack/react-query";
import { type FoodOption } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface FoodSelections {
  entree: number | undefined;
  dessert: number | undefined;
  wine: number | undefined;
}

interface Props {
  onComplete: (selection: Record<string, number>) => void;
}

export function FoodSelection({ onComplete }: Props) {
  const { data: options } = useQuery<FoodOption[]>({
    queryKey: ["/api/food-options"],
  });

  const [selection, setSelection] = useState<FoodSelections>({
    entree: undefined,
    dessert: undefined,
    wine: undefined,
  });

  const byType = options?.reduce((acc, option) => {
    if (!acc[option.type]) acc[option.type] = [];
    acc[option.type].push(option);
    return acc;
  }, {} as Record<string, FoodOption[]>) ?? {};

  const isComplete = selection.entree && selection.dessert && selection.wine;

  const handleComplete = () => {
    if (isComplete) {
      const selections: Record<string, number> = {
        entree: selection.entree!,
        dessert: selection.dessert!,
        wine: selection.wine!,
      };
      onComplete(selections);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Select Your Menu</h2>
        <p className="text-muted-foreground">
          Choose one item from each category
        </p>
      </div>

      <div className="space-y-8">
        {Object.entries(byType).map(([type, options]) => (
          <div key={type} className="space-y-4">
            <h3 className="text-lg font-semibold capitalize">{type}</h3>
            <RadioGroup
              value={selection[type as keyof FoodSelections]?.toString()}
              onValueChange={(value) =>
                setSelection({ ...selection, [type]: parseInt(value) })
              }
            >
              <div className="grid gap-4 md:grid-cols-3">
                {options.map((option) => (
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
                        <RadioGroupItem value={option.id.toString()} id={`${type}-${option.id}`} />
                        <Label htmlFor={`${type}-${option.id}`}>{option.name}</Label>
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
      </div>

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