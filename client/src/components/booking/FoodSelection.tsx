import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { type FoodOption } from "@shared/schema";
import { cn } from "@/lib/utils";
import { FoodIconSet, Allergen, DietaryRestriction, allergenLabels, dietaryLabels, allergenIcons, dietaryIcons } from "@/components/ui/food-icons";
import { useAuth } from "@/hooks/use-auth";
import { 
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { ErrorBoundary, ErrorFallback } from "@/components/ErrorBoundary";

interface SeatSelections {
  name: string;
  salad: number | undefined;
  entree: number | undefined;
  dessert: number | undefined;
}

interface Props {
  selectedSeats: number[];
  eventId: number;
  onComplete: (selections: Record<string, number>[], names: Record<number, string>) => void;
}

const STEPS = ["name", "salad", "entree", "dessert"] as const;
type Step = typeof STEPS[number];

function FoodSelectionInner({ selectedSeats, eventId, onComplete }: Props) {
  const { user } = useAuth();
  
  if (!selectedSeats || selectedSeats.length === 0) {
    console.error("No seats selected for food selection");
    return (
      <div className="text-center p-8">
        <p className="text-red-600">Error: No seats selected. Please go back and select seats.</p>
      </div>
    );
  }
  
  // Get randomized food options for this event (3 per category)
  const { data: options } = useQuery<FoodOption[]>({
    queryKey: [`/api/events/${eventId}/food-options`]
  });
  
  const [currentSeat, setCurrentSeat] = useState<number>(() => {
    return selectedSeats[0];
  });
  const [currentStep, setCurrentStep] = useState<Step>("name");
  const [selectedOption, setSelectedOption] = useState<FoodOption | null>(null);
  const [showAllergyWarning, setShowAllergyWarning] = useState<boolean>(false);
  const [allergyConflicts, setAllergyConflicts] = useState<Allergen[]>([]);
  const [dietaryConflicts, setDietaryConflicts] = useState<DietaryRestriction[]>([]);
  const [selections, setSelections] = useState<Record<number, SeatSelections>>(() => {
    const initialSelections: Record<number, SeatSelections> = {};
    if (selectedSeats && selectedSeats.length > 0) {
      selectedSeats.forEach(seat => {
        initialSelections[seat] = { 
          name: "", 
          salad: undefined, 
          entree: undefined, 
          dessert: undefined 
        };
      });
    }
    console.log("Initial selections created:", initialSelections);
    return initialSelections;
  });

  // Group options by type for easier selection
  const byType = useMemo(() => {
    if (!options || options.length === 0) return {};
    
    // Initialize categories based on our steps
    const result: Record<string, FoodOption[]> = {
      salad: [],
      entree: [],
      dessert: []
    };
    
    // Sort options into appropriate categories
    options.forEach((option: FoodOption) => {
      if (option.type === 'salad') {
        result.salad.push(option);
      } else if (option.type === 'entree') {
        result.entree.push(option);
      } else if (option.type === 'dessert') {
        result.dessert.push(option);
      }
    });
    
    return result;
  }, [options]);

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = Math.round((currentStepIndex / (STEPS.length - 1)) * 100);
  
  // Check if a food option conflicts with user's allergens
  const checkAllergenConflicts = (option: FoodOption) => {
    if (!user || !user.allergens || !option.allergens) return [];
    
    const userAllergens = user.allergens as Allergen[];
    const foodAllergens = option.allergens as Allergen[];
    
    return foodAllergens.filter(allergen => userAllergens.includes(allergen));
  };
  
  // Check if a food option is incompatible with user's dietary restrictions
  // Returns conflicting dietary restrictions
  const checkDietaryRestrictionConflicts = (option: FoodOption): DietaryRestriction[] => {
    if (!user || !user.dietaryRestrictions || !option) return [];
    
    const userRestrictions = user.dietaryRestrictions as DietaryRestriction[];
    const conflicts: DietaryRestriction[] = [];
    
    // Check for vegetarian conflicts
    if (userRestrictions.includes('vegetarian') && 
        (option.type === 'entree' && !option.dietaryRestrictions?.includes('vegetarian'))) {
      conflicts.push('vegetarian');
    }
    
    // Check for vegan conflicts
    if (userRestrictions.includes('vegan') && 
        !option.dietaryRestrictions?.includes('vegan')) {
      conflicts.push('vegan');
    }
    
    // Check for other dietary restriction conflicts
    userRestrictions.forEach(restriction => {
      if (restriction !== 'vegetarian' && restriction !== 'vegan' && 
          !option.dietaryRestrictions?.includes(restriction)) {
        conflicts.push(restriction as DietaryRestriction);
      }
    });
    
    return conflicts;
  };

  const isCurrentSeatComplete = () => {
    if (!currentSeat || !selections[currentSeat]) return false;
    
    const selection = selections[currentSeat];

    return STEPS.every(step => {
      if (step === "name") return selection.name && selection.name.trim() !== "";
      return selection[step] !== undefined;
    });
  };

  const moveToNextStep = () => {
    if (!selectedSeats || selectedSeats.length === 0) return;
    
    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < STEPS.length) {
      setCurrentStep(STEPS[nextStepIndex]);
    } else if (currentSeat !== selectedSeats[selectedSeats.length - 1]) {
      // Move to next seat if available
      const nextSeatIndex = selectedSeats.indexOf(currentSeat) + 1;
      if (nextSeatIndex < selectedSeats.length) {
        setCurrentSeat(selectedSeats[nextSeatIndex]);
        setCurrentStep("name");
      }
    } else {
      // All seats and steps are complete
      try {
        const foodSelections = selectedSeats.map(seat => {
          const selection = selections[seat];
          if (!selection) {
            throw new Error(`Missing selection for seat ${seat}`);
          }
          return {
            salad: selection.salad!,
            entree: selection.entree!,
            dessert: selection.dessert!,
          };
        });

        const names = Object.fromEntries(
          selectedSeats.map((seat, index) => {
            const selection = selections[seat];
            return [index + 1, selection?.name || `Guest ${index + 1}`];
          })
        );

        onComplete(foodSelections, names);
      } catch (error) {
        console.error("Error completing food selection:", error);
      }
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

  // State to track if we're displaying dietary warnings or allergen warnings
  const [showingDietaryWarning, setShowingDietaryWarning] = useState(false);

  // Handle food option selection
  const handleFoodOptionSelect = (option: FoodOption) => {
    // Select the option directly without warnings
    setSelections({
      ...selections,
      [currentSeat]: {
        ...selections[currentSeat],
        [currentStep]: option.id
      }
    });
  };



  return (
    <div className="space-y-4">
      
      {/* NEW PRICING NOTICE */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold">Food Selection</h2>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800 font-medium">
            Food Selection Included • No Additional Charge
          </p>
          <p className="text-xs text-green-600 mt-1">
            Your $130 per person ticket includes salad + entrée + dessert selection
          </p>
          <p className="text-xs text-green-600 mt-1">
            • Tax and tip are included • NA beverages included
          </p>
        </div>
        
        {/* Top Action Buttons */}
        <div className="flex justify-center gap-3 pt-2">
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

      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex gap-2 items-center">
            <span className="inline-flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-medium">
              {selectedSeats.indexOf(currentSeat) + 1}
            </span>
            <span className="text-lg font-medium">
              {(() => {
                const guestNumber = selectedSeats.indexOf(currentSeat) + 1;
                const suffix = guestNumber === 1 ? 'st' : guestNumber === 2 ? 'nd' : guestNumber === 3 ? 'rd' : 'th';
                return `${guestNumber}${suffix} guest`;
              })()}
            </span>
          </div>
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
              onChange={(e) => {
                try {
                  console.log("Name input change:", {
                    currentSeat,
                    value: e.target.value,
                    currentSelection: selections[currentSeat],
                    allSelections: selections
                  });
                  
                  setSelections({
                    ...selections,
                    [currentSeat]: {
                      ...selections[currentSeat],
                      name: e.target.value
                    }
                  });
                } catch (error) {
                  console.error("Error in name input onChange:", error);
                }
              }}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="capitalize">{currentStep} Selection</Label>
            <RadioGroup
              value={selections[currentSeat]?.[currentStep]?.toString()}
              onValueChange={(value) => {
                // Find the selected option
                const option = byType[currentStep]?.find((opt: FoodOption) => opt.id === parseInt(value));
                if (option) {
                  handleFoodOptionSelect(option);
                }
              }}
            >
              <ScrollArea className="h-[450px] border rounded-lg">
                <div className="flex flex-col gap-4 p-4">
                  {byType[currentStep]?.map((option: FoodOption) => {
                    const isSelected = selections[currentSeat]?.[currentStep] === option.id;
                    return (
                      <Card
                        key={option.id}
                        className={cn(
                          "overflow-hidden cursor-pointer transition-colors relative w-full",
                          isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                        )}
                        onClick={() => handleFoodOptionSelect(option)}
                      >
                        <div className="flex flex-col sm:flex-row">
                          {/* Larger image on the left/top */}
                          <div className="sm:w-2/5 relative">
                            <div className="aspect-video sm:aspect-square h-full">
                              <img
                                src={option.image}
                                alt={option.name}
                                className="object-cover w-full h-full"
                              />
                            </div>
                          </div>
                          
                          {/* Content on the right/bottom */}
                          <div className="sm:w-3/5">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2">
                                <RadioGroupItem 
                                  value={option.id.toString()} 
                                  id={`${currentStep}-${currentSeat}-${option.id}`}
                                  className="h-5 w-5"
                                />
                                <Label 
                                  className="font-medium text-base food-item-name" 
                                  htmlFor={`${currentStep}-${currentSeat}-${option.id}`}
                                >
                                  {option.name}
                                </Label>
                              </div>
                              
                              <p className="mt-2 text-sm text-muted-foreground">
                                {option.description}
                              </p>
                              
                              {/* Food information section */}
                              <div className="mt-3">
                                {/* Only dietary information - NO ALLERGENS */}
                                <div className="space-y-2">
                                  {option.dietaryRestrictions && option.dietaryRestrictions.length > 0 && (
                                    <div>
                                      <p className="text-xs text-muted-foreground font-medium mb-1">
                                        {(option.dietaryRestrictions as DietaryRestriction[]).map((restriction) => {
                                          return dietaryLabels[restriction] || restriction;
                                        }).join(' • ')}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </RadioGroup>
          </div>
        )}

        {/* Note about wine selection */}
        {currentStepIndex === STEPS.length - 1 && currentSeat === selectedSeats[selectedSeats.length - 1] && (
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground">Wine selection available next step</p>
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

export function FoodSelection(props: Props) {
  return (
    <ErrorBoundary fallback={ErrorFallback}>
      <FoodSelectionInner {...props} />
    </ErrorBoundary>
  );
}