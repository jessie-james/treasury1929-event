import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronRight, 
  ChevronLeft,
  ArrowRight, 
  Check, 
  CheckCircle2,
  User, 
  PhoneCall,
  Mail,
  CalendarDays, 
  MapPin, 
  Pizza, 
  AlertTriangle
} from "lucide-react";
import { 
  allergenIcons, 
  dietaryIcons, 
  type Allergen, 
  type DietaryRestriction 
} from "@/components/ui/food-icons";

// Detailed step breakdown
type OnboardingStep = 
  // Profile steps (broken down by field)
  "firstName" | "lastName" | "email" | "phone" | 
  // Dietary preference steps
  "allergensIntro" | "allergens" | "dietaryIntro" | "dietary";

// Define lists of allergens and dietary restrictions
const ALLERGENS: Allergen[] = ["gluten", "dairy", "eggs", "peanuts", "tree_nuts", "soy", "fish", "shellfish", "sesame"];
const DIETARY_RESTRICTIONS: DietaryRestriction[] = ["vegetarian", "vegan", "halal", "kosher", "low_carb", "keto", "paleo"];

// Step progression
const STEP_SEQUENCE: OnboardingStep[] = [
  "firstName", "lastName", "email", "phone",
  "allergensIntro", "allergens", "dietaryIntro", "dietary"
];

export default function OnboardingPage() {
  // Track current step index for sequential navigation
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = STEP_SEQUENCE[currentStepIndex];
  
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // We removed events from the onboarding flow
  
  // Initialize states for form data
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedAllergens, setSelectedAllergens] = useState<Allergen[]>([]);
  const [selectedDietaryRestrictions, setSelectedDietaryRestrictions] = useState<DietaryRestriction[]>([]);
  
  // Redirect to home if no user is logged in
  if (!user) {
    setLocation("/auth");
    return null;
  }
  
  // Setup mutation to update user profile
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName?: string, lastName?: string, phone?: string }) => {
      return await apiRequest("PATCH", "/api/user/profile", data);
    }
  });
  
  // Setup mutation to update dietary preferences
  const updateDietaryMutation = useMutation({
    mutationFn: async (data: { allergens: Allergen[], dietaryRestrictions: DietaryRestriction[] }) => {
      return await apiRequest("PATCH", "/api/user/preferences", data);
    }
  });
  
  // Handle allergen toggle
  const toggleAllergen = (allergen: Allergen) => {
    setSelectedAllergens(prev => {
      if (prev.includes(allergen)) {
        return prev.filter(a => a !== allergen);
      } else {
        return [...prev, allergen];
      }
    });
  };
  
  // Handle dietary restriction toggle
  const toggleDietaryRestriction = (restriction: DietaryRestriction) => {
    setSelectedDietaryRestrictions(prev => {
      if (prev.includes(restriction)) {
        return prev.filter(r => r !== restriction);
      } else {
        return [...prev, restriction];
      }
    });
  };
  
  // Handle next step with appropriate actions
  const handleNext = () => {
    // Execute any save actions needed for the current step
    if (currentStep === "phone") {
      // Save all profile data at once
      updateProfileMutation.mutate({ 
        firstName, 
        lastName, 
        phone 
      }, {
        onSuccess: () => {
          // Invalidate user query to refresh user data
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          
          // Show success message
          toast({
            title: "Profile updated",
            description: "Your personal information has been saved.",
          });
          
          // Move to next step only after successful update
          setCurrentStepIndex(prev => Math.min(prev + 1, STEP_SEQUENCE.length - 1));
        },
        onError: (error) => {
          console.error("Profile update error:", error);
          toast({
            title: "Error",
            description: "Failed to update your profile. Please try again.",
            variant: "destructive",
          });
        }
      });
      return; // Don't advance to next step yet - wait for API response
    }
    
    if (currentStep === "dietary") {
      // Save dietary preferences and redirect to homepage with a welcome toast
      updateDietaryMutation.mutate({
        allergens: selectedAllergens,
        dietaryRestrictions: selectedDietaryRestrictions
      }, {
        onSuccess: () => {
          // Invalidate user query to refresh user data
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          
          // Show a welcome message with the user's first name
          toast({
            title: `Welcome ${firstName}!`,
            description: "Your profile is all set. Explore our upcoming events.",
          });
          
          // Redirect to homepage after saving preferences
          setLocation("/");
        },
        onError: (error) => {
          console.error("Preferences update error:", error);
          toast({
            title: "Error",
            description: "Failed to update your preferences. Please try again.",
            variant: "destructive",
          });
        }
      });
      return; // Don't advance or redirect yet - wait for API response
    }
    
    // For other steps, just move to next step
    setCurrentStepIndex(prev => Math.min(prev + 1, STEP_SEQUENCE.length - 1));
  };
  
  // Go back to previous step
  const handleBack = () => {
    setCurrentStepIndex(prev => Math.max(prev - 1, 0));
  };
  
  // Calculate progress percentage
  const getProgressPercentage = () => {
    return (currentStepIndex / (STEP_SEQUENCE.length - 1)) * 100;
  };
  
  return (
    <div className="min-h-screen bg-gray-50 pt-8 px-4">
      <div className="container max-w-md mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary">The Treasury 1929 Events</h1>
          <p className="text-muted-foreground">Complete your profile setup</p>
        </div>
        
        <Progress value={getProgressPercentage()} className="h-2 mb-6" />
        
        <Card className="border-none shadow-lg">
          
          {/* First Name Step */}
          {currentStep === "firstName" && (
            <>
              <CardHeader>
                <div className="flex items-center mb-2">
                  <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center text-primary font-medium mr-2">1</div>
                  <CardTitle>First Name</CardTitle>
                </div>
                <CardDescription>
                  How should we address you?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Input 
                    id="firstName" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)} 
                    placeholder="Enter your first name"
                    className="text-lg py-6"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNext}>
                  Continue <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardFooter>
            </>
          )}
          
          {/* Last Name Step */}
          {currentStep === "lastName" && (
            <>
              <CardHeader>
                <div className="flex items-center mb-2">
                  <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center text-primary font-medium mr-2">1</div>
                  <CardTitle>Last Name</CardTitle>
                </div>
                <CardDescription>
                  Please enter your last name
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Input 
                    id="lastName" 
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)} 
                    placeholder="Enter your last name"
                    className="text-lg py-6"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNext}>
                  Continue <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardFooter>
            </>
          )}
          
          {/* Email Step */}
          {currentStep === "email" && (
            <>
              <CardHeader>
                <div className="flex items-center mb-2">
                  <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center text-primary font-medium mr-2">1</div>
                  <CardTitle>Email Address</CardTitle>
                </div>
                <CardDescription>
                  Your registered email address
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                      id="email" 
                      value={user.email} 
                      disabled
                      className="pl-10 text-lg py-6 opacity-80"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This is the email you registered with and can't be changed here
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNext}>
                  Continue <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardFooter>
            </>
          )}
          
          {/* Phone Step */}
          {currentStep === "phone" && (
            <>
              <CardHeader>
                <div className="flex items-center mb-2">
                  <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center text-primary font-medium mr-2">1</div>
                  <CardTitle>Phone Number</CardTitle>
                </div>
                <CardDescription>
                  How can we reach you for important event updates?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="relative">
                    <PhoneCall className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                      id="phone" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      placeholder="(555) 123-4567"
                      className="pl-10 text-lg py-6"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We'll only use this for important event notifications and updates
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNext} disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? "Saving..." : "Continue"}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardFooter>
            </>
          )}
          
          {/* Allergens Intro Step */}
          {currentStep === "allergensIntro" && (
            <>
              <CardHeader>
                <div className="flex items-center mb-2">
                  <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center text-primary font-medium mr-2">2</div>
                  <CardTitle>Food Allergies</CardTitle>
                </div>
                <CardDescription>
                  Help us understand your dietary needs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-amber-800">Important Notice</h3>
                      <p className="text-sm text-amber-700">
                        While we'll highlight dishes that may contain allergens, 
                        please always inform venue staff about your allergies when attending events.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="text-center mt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    On the next screen, you'll be able to select any allergies you have.
                  </p>
                  <div className="flex justify-center gap-2 flex-wrap mt-4">
                    {ALLERGENS.slice(0, 5).map((allergen) => (
                      <div key={allergen} className="inline-flex items-center justify-center rounded-full bg-destructive/20 text-destructive p-1 w-8 h-8">
                        <div className="w-5 h-5">{allergenIcons[allergen]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNext}>
                  Continue <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardFooter>
            </>
          )}
          
          {/* Allergens Selection Step */}
          {currentStep === "allergens" && (
            <>
              <CardHeader>
                <div className="flex items-center mb-2">
                  <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center text-primary font-medium mr-2">2</div>
                  <CardTitle>Select Allergens</CardTitle>
                </div>
                <CardDescription>
                  Check any ingredients you need to avoid
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {ALLERGENS.map((allergen: Allergen) => (
                    <div 
                      key={allergen}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedAllergens.includes(allergen) 
                          ? 'bg-destructive/10 border-destructive/30' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => toggleAllergen(allergen)}
                    >
                      <Checkbox 
                        id={`allergen-${allergen}`} 
                        checked={selectedAllergens.includes(allergen)}
                        onCheckedChange={() => toggleAllergen(allergen)}
                        className="mr-3"
                      />
                      <label
                        htmlFor={`allergen-${allergen}`}
                        className="text-sm font-medium leading-none flex items-center gap-2 cursor-pointer flex-1"
                      >
                        <div className="inline-flex items-center justify-center rounded-full bg-destructive/20 text-destructive p-1 w-6 h-6">
                          <div className="w-4 h-4">{allergenIcons[allergen]}</div>
                        </div>
                        <span className="capitalize">{allergen.replace('_', ' ')}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNext}>
                  Continue <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardFooter>
            </>
          )}
          
          {/* Dietary Intro Step */}
          {currentStep === "dietaryIntro" && (
            <>
              <CardHeader>
                <div className="flex items-center mb-2">
                  <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center text-primary font-medium mr-2">2</div>
                  <CardTitle>Dietary Preferences</CardTitle>
                </div>
                <CardDescription>
                  Let us know about any special diets you follow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-center text-muted-foreground">
                  This information helps us recommend appropriate menu items for events you attend.
                </p>
                
                <div className="text-center mt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    On the next screen, you'll be able to select your dietary preferences.
                  </p>
                  <div className="flex justify-center gap-2 flex-wrap mt-4">
                    {DIETARY_RESTRICTIONS.slice(0, 4).map((restriction) => (
                      <div key={restriction} className="inline-flex items-center justify-center rounded-full bg-primary/20 text-primary p-1 w-8 h-8">
                        <div className="w-5 h-5">{dietaryIcons[restriction]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNext}>
                  Continue <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardFooter>
            </>
          )}
          
          {/* Dietary Selection Step */}
          {currentStep === "dietary" && (
            <>
              <CardHeader>
                <div className="flex items-center mb-2">
                  <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center text-primary font-medium mr-2">2</div>
                  <CardTitle>Almost Done, {firstName}!</CardTitle>
                </div>
                <CardDescription>
                  Check any dietary preferences you follow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {DIETARY_RESTRICTIONS.map((restriction: DietaryRestriction) => (
                    <div 
                      key={restriction}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedDietaryRestrictions.includes(restriction) 
                          ? 'bg-primary/10 border-primary/30' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => toggleDietaryRestriction(restriction)}
                    >
                      <Checkbox 
                        id={`restriction-${restriction}`}
                        checked={selectedDietaryRestrictions.includes(restriction)}
                        onCheckedChange={() => toggleDietaryRestriction(restriction)}
                        className="mr-3"
                      />
                      <label
                        htmlFor={`restriction-${restriction}`}
                        className="text-sm font-medium leading-none flex items-center gap-2 cursor-pointer flex-1"
                      >
                        <div className="inline-flex items-center justify-center rounded-full bg-primary/20 text-primary p-1 w-6 h-6">
                          <div className="w-4 h-4">{dietaryIcons[restriction]}</div>
                        </div>
                        <span className="capitalize">{restriction.replace('_', ' ')}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={handleNext} 
                  disabled={updateDietaryMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {updateDietaryMutation.isPending ? "Saving..." : (
                    <>Finish & Explore Events <CheckCircle2 className="ml-1 h-4 w-4" /></>
                  )}
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}