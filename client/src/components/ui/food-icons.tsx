import React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Define common allergens
export type Allergen = 
  | "gluten" 
  | "dairy" 
  | "eggs" 
  | "peanuts" 
  | "tree_nuts" 
  | "soy" 
  | "fish" 
  | "shellfish" 
  | "sesame";

// Define dietary restrictions
export type DietaryRestriction = 
  | "vegetarian" 
  | "vegan" 
  | "halal" 
  | "kosher" 
  | "low_carb" 
  | "keto" 
  | "paleo";

export const allergenLabels: Record<Allergen, string> = {
  gluten: "Contains Gluten",
  dairy: "Contains Dairy",
  eggs: "Contains Eggs",
  peanuts: "Contains Peanuts",
  tree_nuts: "Contains Tree Nuts",
  soy: "Contains Soy",
  fish: "Contains Fish",
  shellfish: "Contains Shellfish",
  sesame: "Contains Sesame",
};

export const dietaryLabels: Record<DietaryRestriction, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  halal: "Halal",
  kosher: "Kosher",
  low_carb: "Low Carb",
  keto: "Keto-Friendly",
  paleo: "Paleo-Friendly",
};

// SVG icons for allergens
export const allergenIcons: Record<Allergen, React.ReactNode> = {
  gluten: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wheat">
      <path d="M2 22 16 8" />
      <path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
      <path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
      <path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
      <path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" />
      <path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
      <path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
      <path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
    </svg>
  ),
  dairy: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-milk">
      <path d="M8 2h8" />
      <path d="M9 2v2.789a4 4 0 0 1-.672 2.219l-.656.984A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.789a4 4 0 0 0-.672-2.219l-.656-.984A4 4 0 0 1 15 4.788V2" />
      <path d="M7 15a6.472 6.472 0 0 1 5 0 6.47 6.47 0 0 0 5 0" />
    </svg>
  ),
  eggs: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-egg">
      <path d="M12 22c6.23-.05 7.87-5.57 7.5-10-.36-4.34-3.95-9.96-7.5-10-3.55.04-7.14 5.66-7.5 10-.37 4.43 1.27 9.95 7.5 10z" />
    </svg>
  ),
  peanuts: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 9.5c.5-1.5 1.5-2 2.5-2 1.5 0 3 1.5 3 3 0 .5 0 1-1 1-2 0-3 .5-3.5 2-1 2-2.5 1.5-3 1-.5-.5-1-1.5-.5-2.5.5-.5 2-1 2.5-2.5Z" />
      <path d="M14 7.5c1-1 2-1 3-.5 1.5 1 2 3 1 4.5-.5.5-1 .5-1.5 0-.5-1-1.5-1.5-2.5-1-1.5 1-3-.5-2.5-2 .5-.5 1.5-1 2.5-1Z" />
      <path d="M18 2c-2.5 2.5-8.5 10-7.5 13.5 1 4 9.5 5.5 11.5 0s-2-3-3-6c-1-3 2-3-1-7.5Z" />
      <path d="M18 9.5c3.5 4.5-.5 9-3 8.5-2-.5-5.5-1.5-7-3.5-1-1-1.5-2.5-1.5-4 0-1.5.5-2.5 1.5-3 1-.5 3.5 0 4 2s1.5 2.5 3 1.5c1-.5 1.5-1 3-1.5Z" />
    </svg>
  ),
  tree_nuts: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3c0 1.6.8 3 2 4l-3 7h8l-3-7c1.2-1 2-2.4 2-4a3 3 0 0 0-3-3z" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  ),
  soy: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sprout">
      <path d="M7 20h10" />
      <path d="M10 20c5.5-2.5.8-6.4 3-10" />
      <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
      <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
    </svg>
  ),
  fish: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-fish">
      <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z" />
      <path d="M18 12v.5" />
      <path d="M16 17.93a9.77 9.77 0 0 1 0-11.86" />
      <path d="M7.99 8.5A9.77 9.77 0 0 0 16 6.07" />
      <path d="M7.99 15.5A9.77 9.77 0 0 1 16 17.93" />
    </svg>
  ),
  shellfish: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c7.5 0 7.5-9 0-9-7.5 0-7.5 9 0 9Z" />
      <path d="M12 13V2a5 5 0 0 0-5 5c0 2 2 3 2 3" />
      <path d="M12 13v-3s3 1 3 3" />
    </svg>
  ),
  sesame: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2c-.8.8-2 2-2 6v10c0 .7.5 1 1 1h8c.5 0 1-.3 1-1V8c0-4-1.2-5.2-2-6" />
      <path d="M12 6v6" />
      <path d="M9 12h6" />
    </svg>
  ),
};

// SVG icons for dietary restrictions
export const dietaryIcons: Record<DietaryRestriction, React.ReactNode> = {
  vegetarian: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-salad">
      <path d="M7 21h10" />
      <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z" />
      <path d="M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.37 3.37 2.4 2.4 0 0 1-1.1 3.7 2.51 2.51 0 0 1 .03 1.1" />
      <path d="m13 12 4-4" />
      <path d="M10.9 7.25A3.99 3.99 0 0 0 4 10c0 .73.2 1.41.54 2" />
    </svg>
  ),
  vegan: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-leaf">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  ),
  halal: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17h9M5 12h14M5 7h6" />
      <circle cx="15" cy="7" r="2" />
    </svg>
  ),
  kosher: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v20M16 2v20M3 7h6M3 17h6M15 7h6M15 17h6" />
    </svg>
  ),
  low_carb: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-drumstick">
      <path d="M15.45 15.4c-2.13.65-4.3.32-5.7-1.1-2.29-2.27-1.76-6.5 1.17-9.42 2.93-2.93 7.15-3.46 9.43-1.18 1.41 1.41 1.74 3.57 1.1 5.71-1.4-.51-3.26-.02-4.64 1.36-1.38 1.38-1.87 3.23-1.36 4.63z" />
      <path d="m11.25 15.6-2.16 2.16a2.5 2.5 0 1 1-4.56 1.73 2.49 2.49 0 0 1-1.41-4.24 2.5 2.5 0 0 1 3.14-.32l2.16-2.16" />
    </svg>
  ),
  keto: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-banana">
      <path d="M4 13c3.5-2 8-2 10 2a5.5 5.5 0 0 1 8 5" />
      <path d="M5.15 17.89c5.52-1.52 8.65-6.89 7-12C11.55 4 11.5 2 13 2c3.22 0 5 5.5 5 8 0 .5-.5 1-1 1" />
      <path d="M18.08 17.09c.47-1.94.85-3.27-.37-5.83" />
      <path d="M4 9c0-1 1.5-2 3-2" />
    </svg>
  ),
  paleo: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-beef">
      <circle cx="12.5" cy="8.5" r="2.5" />
      <path d="M12.5 2a6.5 6.5 0 0 0-6.22 4.6c-1.1 3.13-.78 3.9-3.18 6.08A3 3 0 0 0 5 18c4 0 8.4-1.8 11.4-4.3A6.5 6.5 0 0 0 12.5 2Z" />
      <path d="m18.5 6 2.19 4.5a6.48 6.48 0 0 1 .31 2 6.49 6.49 0 0 1-2.6 5.2C15.4 20.2 11 22 7 22a3 3 0 0 1-2.68-1.66L2.4 16.5" />
    </svg>
  ),
};

interface AllergenIconProps {
  allergen: Allergen;
  className?: string;
  showLabel?: boolean;
}

interface DietaryIconProps {
  restriction: DietaryRestriction;
  className?: string;
  showLabel?: boolean;
}

export function AllergenIcon({ allergen, className, showLabel = false }: AllergenIconProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("inline-flex items-center justify-center rounded-full bg-destructive/20 text-destructive p-1 w-6 h-6", className)}>
            <div className="w-4 h-4">
              {allergenIcons[allergen]}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{allergenLabels[allergen]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function DietaryIcon({ restriction, className, showLabel = false }: DietaryIconProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("inline-flex items-center justify-center rounded-full bg-green-500/20 text-green-600 p-1 w-6 h-6", className)}>
            <div className="w-4 h-4">
              {dietaryIcons[restriction]}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{dietaryLabels[restriction]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface FoodIconSetProps {
  allergens?: Allergen[];
  dietaryRestrictions?: DietaryRestriction[];
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function FoodIconSet({ 
  allergens = [], 
  dietaryRestrictions = [], 
  size = "md", 
  className 
}: FoodIconSetProps) {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const hasAllergens = allergens && allergens.length > 0;
  const hasDietary = dietaryRestrictions && dietaryRestrictions.length > 0;

  if (!hasAllergens && !hasDietary) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {hasAllergens && (
        <div className="space-y-1">
          <h4 className="text-xs font-medium text-muted-foreground">Allergen Information:</h4>
          <ul className="space-y-1">
            {allergens.map((allergen) => (
              <li key={`allergen-${allergen}`} className="flex items-center gap-2 text-xs">
                <div className={cn("inline-flex items-center justify-center rounded-full bg-destructive/20 text-destructive p-1", sizeClasses[size])}>
                  <div className="w-4 h-4">{allergenIcons[allergen]}</div>
                </div>
                <span>{allergenLabels[allergen]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {hasDietary && (
        <div className="space-y-1">
          <h4 className="text-xs font-medium text-muted-foreground">Dietary Information:</h4>
          <ul className="space-y-1">
            {dietaryRestrictions.map((restriction) => (
              <li key={`diet-${restriction}`} className="flex items-center gap-2 text-xs">
                <div className={cn("inline-flex items-center justify-center rounded-full bg-green-500/20 text-green-600 p-1", sizeClasses[size])}>
                  <div className="w-4 h-4">{dietaryIcons[restriction]}</div>
                </div>
                <span>{dietaryLabels[restriction]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}