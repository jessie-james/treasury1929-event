import React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Define common allergens - REMOVED ALL ALLERGENS
export type Allergen = never;

// Define dietary restrictions - ONLY 4 TYPES ALLOWED
export type DietaryRestriction = 
  | "gluten-free" 
  | "vegan" 
  | "vegetarian" 
  | "dairy-free";

export const allergenLabels: Record<Allergen, string> = {};

export const dietaryLabels: Record<DietaryRestriction, string> = {
  "gluten-free": "GF",
  "vegan": "V",
  "vegetarian": "VG", 
  "dairy-free": "DF",
};

// SVG icons for allergens - REMOVED ALL ALLERGENS
export const allergenIcons: Record<Allergen, React.ReactNode> = {};

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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-drumstick">
      <path d="M15.45 15.4c-2.13.65-4.3.32-5.7-1.1-2.29-2.27-1.76-6.5 1.17-9.42 2.93-2.93 7.15-3.46 9.43-1.18 1.41 1.41 1.74 3.57 1.1 5.71-1.4-.51-3.26-.02-4.64 1.36-1.38 1.38-1.87 3.23-1.36 4.63z" />
      <path d="m11.25 15.6-2.16 2.16a2.5 2.5 0 1 1-4.56 1.73 2.49 2.49 0 0 1-1.41-4.24 2.5 2.5 0 0 1 3.14-.32l2.16-2.16" />
    </svg>
  ),
  paleo: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-drumstick">
      <path d="M15.45 15.4c-2.13.65-4.3.32-5.7-1.1-2.29-2.27-1.76-6.5 1.17-9.42 2.93-2.93 7.15-3.46 9.43-1.18 1.41 1.41 1.74 3.57 1.1 5.71-1.4-.51-3.26-.02-4.64 1.36-1.38 1.38-1.87 3.23-1.36 4.63z" />
      <path d="m11.25 15.6-2.16 2.16a2.5 2.5 0 1 1-4.56 1.73 2.49 2.49 0 0 1-1.41-4.24 2.5 2.5 0 0 1 3.14-.32l2.16-2.16" />
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