import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { type FoodOption } from "@shared/schema";
import { cn } from "@/lib/utils";
import { FoodIconSet, Allergen, DietaryRestriction } from "@/components/ui/food-icons";

interface SeatSelections {
  name: string;
  salad: number | undefined;
  entree: number | undefined;
  dessert: number | undefined;
}

interface Props {
  selectedSeats: number[];
  onComplete: (selections: Record<string, number>[], names: Record<number, string>) => void;
}

const STEPS = ["name", "salad", "entree", "dessert"] as const;
type Step = typeof STEPS[number];

export function FoodSelection({ selectedSeats, onComplete }: Props) {
  const { data: options } = useQuery<FoodOption[]>({
    queryKey: ["/api/food-options"],
  });

  const [currentSeat, setCurrentSeat] = useState<number>(selectedSeats[0]);
  const [currentStep, setCurrentStep] = useState<Step>("name");
  const [selections, setSelections] = useState<Record<number, SeatSelections>>(
    Object.fromEntries(
      selectedSeats.map(seat => [
        seat,
        { name: "", salad: undefined, entree: undefined, dessert: undefined }
      ])
    )
  );

  const byType = options?.reduce((acc, option) => {
    if (!acc[option.type]) acc[option.type] = [];
    acc[option.type].push(option);
    return acc;
  }, {} as Record<string, FoodOption[]>) ?? {};

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = Math.round((currentStepIndex / (STEPS.length - 1)) * 100);

  const isCurrentSeatComplete = () => {
    const selection = selections[currentSeat];
    if (!selection) return false;

    return STEPS.every(step => {
      if (step === "name") return selection.name.trim() !== "";
      return selection[step] !== undefined;
    });
  };

  const moveToNextStep = () => {
    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < STEPS.length) {
      setCurrentStep(STEPS[nextStepIndex]);
    } else if (currentSeat !== selectedSeats[selectedSeats.length - 1]) {
      // Move to next seat if available
      const nextSeatIndex = selectedSeats.indexOf(currentSeat) + 1;
      setCurrentSeat(selectedSeats[nextSeatIndex]);
      setCurrentStep("name");
    } else {
      // All seats and steps are complete
      const foodSelections = selectedSeats.map(seat => ({
        salad: selections[seat].salad!,
        entree: selections[seat].entree!,
        dessert: selections[seat].dessert!,
      }));

      const names = Object.fromEntries(
        selectedSeats.map(seat => [seat, selections[seat].name])
      );

      onComplete(foodSelections, names);
    }
  };

  const moveToPreviousStep = () => {
    const prevStepIndex = currentStepIndex - 1;
    if (prevStepIndex >= 0) {
      setCurrentStep(STEPS[prevStepIndex]);
    } else if (currentSeat !== selectedSeats[0]) {
      // Move to previous seat if available
      const prevSeatIndex = selectedSeats.indexOf(currentSeat) - 1;
      setCurrentSeat(selectedSeats[prevSeatIndex]);
      setCurrentStep(STEPS[STEPS.length - 1]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Seat #{currentSeat} Selections</h2>
          <span className="text-sm text-muted-foreground">
            Step {currentStepIndex + 1} of {STEPS.length}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current step content */}
      <div className="space-y-2">
        {currentStep === "name" ? (
          <div className="space-y-4">
            <Label htmlFor="guest-name">Guest's Name</Label>
            <Input
              id="guest-name"
              placeholder="Enter guest's name"
              value={selections[currentSeat]?.name || ""}
              onChange={(e) =>
                setSelections({
                  ...selections,
                  [currentSeat]: {
                    ...selections[currentSeat],
                    name: e.target.value
                  }
                })
              }
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="capitalize">{currentStep} Selection</Label>
            <RadioGroup
              value={selections[currentSeat]?.[currentStep]?.toString()}
              onValueChange={(value) =>
                setSelections({
                  ...selections,
                  [currentSeat]: {
                    ...selections[currentSeat],
                    [currentStep]: parseInt(value)
                  }
                })
              }
            >
              <ScrollArea className="h-[400px] border rounded-lg">
                <div className="grid grid-cols-3 gap-3 p-4">
                  {byType[currentStep]?.map((option) => {
                    const isSelected = selections[currentSeat]?.[currentStep] === option.id;
                    return (
                      <Card
                        key={option.id}
                        className={cn(
                          "overflow-hidden cursor-pointer transition-colors",
                          isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                        )}
                        onClick={() => {
                          setSelections({
                            ...selections,
                            [currentSeat]: {
                              ...selections[currentSeat],
                              [currentStep]: option.id
                            }
                          });
                        }}
                      >
                        <div className="aspect-video relative">
                          <img
                            src={option.image}
                            alt={option.name}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <CardContent className="p-2">
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value={option.id.toString()} id={`${currentStep}-${currentSeat}-${option.id}`} />
                            <Label className="font-medium text-sm" htmlFor={`${currentStep}-${currentSeat}-${option.id}`}>
                              {option.name}
                            </Label>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {option.description}
                          </p>
                          {/* Display allergen and dietary icons */}
                          <div className="mt-2">
                            <FoodIconSet 
                              allergens={(option.allergens || []) as Allergen[]} 
                              dietaryRestrictions={(option.dietaryRestrictions || []) as DietaryRestriction[]}
                              size="sm"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </RadioGroup>
          </div>
        )}

        {/* Navigation buttons moved closer to content */}
        <div className="flex justify-between items-center pt-2 pb-4">
          <Button
            variant="outline"
            onClick={moveToPreviousStep}
            disabled={currentStepIndex === 0 && currentSeat === selectedSeats[0]}
          >
            Previous
          </Button>
          <Button
            onClick={moveToNextStep}
            disabled={
              (currentStep === "name" && !selections[currentSeat]?.name.trim()) ||
              (currentStep !== "name" && selections[currentSeat]?.[currentStep] === undefined)
            }
          >
            {currentStepIndex === STEPS.length - 1 && currentSeat === selectedSeats[selectedSeats.length - 1]
              ? "Complete Selection"
              : "Next"
            }
          </Button>
        </div>
      </div>
    </div>
  );
}