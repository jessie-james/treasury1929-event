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

export function FoodSelection({ selectedSeats, eventId, onComplete }: Props) {
  const { user } = useAuth();
  // Get randomized food options for this event (3 per category)
  const { data: options, isError, error } = useQuery<FoodOption[]>({
    queryKey: [`/api/events/${eventId}/food-options`],
    // Temporarily fall back to the old endpoint if the randomized endpoint fails
    onError: () => {
      console.error("Error loading randomized food options, falling back to all options");
    }
  });
  
  // Debugging
  console.log("Food options loaded:", options ? options.length : 0, "options");

  const [currentSeat, setCurrentSeat] = useState<number>(selectedSeats[0]);
  const [currentStep, setCurrentStep] = useState<Step>("name");
  const [selectedOption, setSelectedOption] = useState<FoodOption | null>(null);
  const [showAllergyWarning, setShowAllergyWarning] = useState<boolean>(false);
  const [allergyConflicts, setAllergyConflicts] = useState<Allergen[]>([]);
  const [dietaryConflicts, setDietaryConflicts] = useState<DietaryRestriction[]>([]);
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

  // State to track if we're displaying dietary warnings or allergen warnings
  const [showingDietaryWarning, setShowingDietaryWarning] = useState(false);

  // Handle food option selection
  const handleFoodOptionSelect = (option: FoodOption) => {
    // Check for allergen conflicts
    const allergenConflicts = checkAllergenConflicts(option);
    const dietaryConflictArray = checkDietaryRestrictionConflicts(option);
    
    if (allergenConflicts.length > 0) {
      // Store conflicts and selected option temporarily
      setAllergyConflicts(allergenConflicts);
      setSelectedOption(option);
      setShowingDietaryWarning(false);
      setShowAllergyWarning(true);
    } else if (dietaryConflictArray.length > 0) {
      // Display dietary warning
      setDietaryConflicts(dietaryConflictArray);
      setSelectedOption(option);
      setShowingDietaryWarning(true);
      setShowAllergyWarning(true);
    } else {
      // No conflicts, select the option directly
      setSelections({
        ...selections,
        [currentSeat]: {
          ...selections[currentSeat],
          [currentStep]: option.id
        }
      });
    }
  };

  // Confirm selection despite allergen or dietary warnings
  const confirmAllergenSelection = () => {
    if (selectedOption) {
      setSelections({
        ...selections,
        [currentSeat]: {
          ...selections[currentSeat],
          [currentStep]: selectedOption.id
        }
      });
      setShowAllergyWarning(false);
      setSelectedOption(null);
      setAllergyConflicts([]);
      setDietaryConflicts([]);
      setShowingDietaryWarning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Dietary Warning Dialog */}
      <Dialog open={showAllergyWarning} onOpenChange={setShowAllergyWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {showingDietaryWarning ? "Dietary Restriction Warning" : "Allergen Warning"}
            </DialogTitle>
            <DialogDescription>
              {showingDietaryWarning 
                ? "This food doesn't align with your dietary preferences." 
                : "This food contains allergens that match your dietary restrictions."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {showingDietaryWarning ? (
              // Dietary restriction warning content
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Dietary preference conflict</AlertTitle>
                <AlertDescription>
                  <p className="mb-2">
                    {selectedOption?.name} doesn't align with the following dietary preferences in your profile:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {dietaryConflicts.map(restriction => (
                      <li key={restriction} className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center rounded-full bg-destructive/20 text-destructive p-1 w-6 h-6">
                          <div className="w-4 h-4">{dietaryIcons[restriction]}</div>
                        </span>
                        <span>{dietaryLabels[restriction]}</span>
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : (
              // Allergen warning content
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Potential allergens detected</AlertTitle>
                <AlertDescription>
                  <p className="mb-2">
                    {selectedOption?.name} contains the following allergens you've listed in your profile:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {allergyConflicts.map(allergen => (
                      <li key={allergen} className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center rounded-full bg-destructive/20 text-destructive p-1 w-6 h-6">
                          <div className="w-4 h-4">{allergenIcons[allergen]}</div>
                        </span>
                        <span>{allergenLabels[allergen]}</span>
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <p className="text-sm text-muted-foreground">
              Please consider selecting a different option or proceed with caution if you still want to select this item.
            </p>
          </div>
          
          <DialogFooter className="flex sm:flex-row sm:justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowAllergyWarning(false)}
            >
              Choose Something Else
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={confirmAllergenSelection}
            >
              Select Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex gap-2 items-center">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-medium">
              {currentSeat}
            </span>
            <span className="text-sm text-muted-foreground">
              of {selectedSeats.length} seats
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
              onValueChange={(value) => {
                // Find the selected option
                const option = byType[currentStep]?.find(opt => opt.id === parseInt(value));
                if (option) {
                  handleFoodOptionSelect(option);
                }
              }}
            >
              <ScrollArea className="h-[400px] border rounded-lg">
                <div className="grid grid-cols-3 gap-3 p-4">
                  {byType[currentStep]?.map((option) => {
                    const isSelected = selections[currentSeat]?.[currentStep] === option.id;
                    const allergenConflicts = checkAllergenConflicts(option);
                    const dietaryConflictArray = checkDietaryRestrictionConflicts(option);
                    const hasConflicts = allergenConflicts.length > 0 || dietaryConflictArray.length > 0;
                    
                    return (
                      <Card
                        key={option.id}
                        className={cn(
                          "overflow-hidden cursor-pointer transition-colors relative",
                          isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50',
                          hasConflicts && 'border-destructive'
                        )}
                        onClick={() => handleFoodOptionSelect(option)}
                      >
                        <div className="aspect-video relative">
                          <img
                            src={option.image}
                            alt={option.name}
                            className="object-cover w-full h-full"
                          />
                          {hasConflicts && (
                            <div 
                              className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1" 
                              title={allergenConflicts.length > 0 
                                ? "Contains allergens you've listed in your profile" 
                                : "Doesn't align with your dietary preferences"
                              }
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-2">
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value={option.id.toString()} id={`${currentStep}-${currentSeat}-${option.id}`} />
                            <Label className="font-medium text-sm food-item-name" htmlFor={`${currentStep}-${currentSeat}-${option.id}`}>
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