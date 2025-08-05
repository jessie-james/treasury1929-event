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
  "gluten-free": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wheat-off">
      <path d="m2 22 20-20" />
      <path d="M12 6V2c0 .6.4 1 1 1h2" />
      <path d="M14 3.5c0 .6.4 1 1 1h2" />
      <path d="M16 5c0 .6.4 1 1 1h2" />
      <path d="m22 9-6.15 6.15a2.5 2.5 0 0 1-3.54 0L8.77 11.6a2.5 2.5 0 0 1 0-3.54l3.54-3.54a2.5 2.5 0 0 1 3.54 0L19.39 8.1a2.5 2.5 0 0 1 0 3.54l-1.24 1.25" />
    </svg>
  ),
  "dairy-free": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-milk-off">
      <path d="M8 2h8l-1 12a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2L8 2Z" />
      <path d="M12 7v5" />
      <path d="M16 7v10" />
      <path d="m2 2 20 20" />
    </svg>
  ),
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