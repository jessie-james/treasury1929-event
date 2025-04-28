import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronRight, 
  ArrowRight, 
  Check, 
  User, 
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

type OnboardingStep = "welcome" | "profile" | "dietary" | "events";

// Define lists of allergens and dietary restrictions
const ALLERGENS: Allergen[] = ["gluten", "dairy", "eggs", "peanuts", "tree_nuts", "soy", "fish", "shellfish", "sesame"];
const DIETARY_RESTRICTIONS: DietaryRestriction[] = ["vegetarian", "vegan", "halal", "kosher", "low_carb", "keto", "paleo"];

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile information has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setStep("dietary");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Setup mutation to update dietary preferences
  const updateDietaryMutation = useMutation({
    mutationFn: async (data: { allergens: Allergen[], dietaryRestrictions: DietaryRestriction[] }) => {
      return await apiRequest("PATCH", "/api/user/preferences", data);
    },
    onSuccess: () => {
      toast({
        title: "Preferences updated",
        description: "Your dietary preferences have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setStep("events");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update your preferences. Please try again.",
        variant: "destructive",
      });
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
  
  // Handle navigation between steps
  const handleNext = () => {
    switch (step) {
      case "welcome":
        setStep("profile");
        break;
      case "profile":
        updateProfileMutation.mutate({ firstName, lastName, phone });
        break;
      case "dietary":
        updateDietaryMutation.mutate({
          allergens: selectedAllergens,
          dietaryRestrictions: selectedDietaryRestrictions
        });
        break;
      case "events":
        setLocation("/");
        break;
    }
  };
  
  // Handle skip
  const handleSkip = () => {
    switch (step) {
      case "profile":
        setStep("dietary");
        break;
      case "dietary":
        setStep("events");
        break;
      default:
        setLocation("/");
    }
  };
  
  // Calculate progress
  const progressMap = {
    welcome: 0,
    profile: 33,
    dietary: 66,
    events: 100
  };
  
  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Progress value={progressMap[step]} className="h-2 mb-8" />
      
      {step === "welcome" && (
        <Card className="border-none shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Welcome to Venue Booking!</CardTitle>
            <CardDescription className="text-lg mt-2">
              Let's set up your account to enhance your booking experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/10">
              <User className="h-10 w-10 text-primary" />
              <div>
                <h3 className="font-semibold">Complete your profile</h3>
                <p className="text-sm text-muted-foreground">Tell us your name and contact information</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/10">
              <Pizza className="h-10 w-10 text-primary" />
              <div>
                <h3 className="font-semibold">Dietary preferences</h3>
                <p className="text-sm text-muted-foreground">Set your dietary restrictions and allergens</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/10">
              <CalendarDays className="h-10 w-10 text-primary" />
              <div>
                <h3 className="font-semibold">Explore events</h3>
                <p className="text-sm text-muted-foreground">Discover upcoming events and book your seats</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleNext}>
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {step === "profile" && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>
              Add your personal details to make bookings easier.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input 
                id="firstName" 
                value={firstName} 
                onChange={(e) => setFirstName(e.target.value)} 
                placeholder="Enter your first name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input 
                id="lastName" 
                value={lastName} 
                onChange={(e) => setLastName(e.target.value)} 
                placeholder="Enter your last name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} disabled />
              <p className="text-xs text-muted-foreground">This is the email you registered with</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="Enter your phone number"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="ghost" onClick={handleSkip}>
              Skip for now
            </Button>
            <Button onClick={handleNext} disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? "Saving..." : "Continue"}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {step === "dietary" && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Dietary Preferences</CardTitle>
            <CardDescription>
              Set up your dietary restrictions and allergens. This information will be used to recommend menu items and warn you about dishes that may contain allergens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-800">Important</h3>
                  <p className="text-sm text-amber-700">
                    While we'll try to highlight dishes that may contain allergens, 
                    please always inform venue staff about your allergies when attending events.
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Allergens</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select any allergens you want to avoid.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ALLERGENS.map((allergen: Allergen) => (
                  <div key={allergen} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`allergen-${allergen}`} 
                      checked={selectedAllergens.includes(allergen)}
                      onCheckedChange={() => toggleAllergen(allergen)}
                    />
                    <label
                      htmlFor={`allergen-${allergen}`}
                      className="text-sm font-medium leading-none flex items-center gap-2"
                    >
                      <div className="inline-flex items-center justify-center rounded-full bg-destructive/20 text-destructive p-1 w-6 h-6">
                        <div className="w-4 h-4">{allergenIcons[allergen]}</div>
                      </div>
                      <span className="capitalize">{allergen.replace('_', ' ')}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-medium mb-2">Dietary Restrictions</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select any dietary preferences you follow.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {DIETARY_RESTRICTIONS.map((restriction: DietaryRestriction) => (
                  <div key={restriction} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`restriction-${restriction}`}
                      checked={selectedDietaryRestrictions.includes(restriction)}
                      onCheckedChange={() => toggleDietaryRestriction(restriction)}
                    />
                    <label
                      htmlFor={`restriction-${restriction}`}
                      className="text-sm font-medium leading-none flex items-center gap-2"
                    >
                      <div className="inline-flex items-center justify-center rounded-full bg-primary/20 text-primary p-1 w-6 h-6">
                        <div className="w-4 h-4">{dietaryIcons[restriction]}</div>
                      </div>
                      <span className="capitalize">{restriction.replace('_', ' ')}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="ghost" onClick={handleSkip}>
              Skip for now
            </Button>
            <Button 
              onClick={handleNext} 
              disabled={updateDietaryMutation.isPending}
            >
              {updateDietaryMutation.isPending ? "Saving..." : "Continue"}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {step === "events" && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>You're all set!</CardTitle>
            <CardDescription>
              Your profile is now complete. Let's explore upcoming events.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-green-50 border border-green-100 flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-full">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-green-800">Profile Complete</h3>
                <p className="text-sm text-green-700">
                  Your profile has been set up successfully.
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">What's next?</h3>
              
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <CalendarDays className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Browse Events</h4>
                  <p className="text-sm text-muted-foreground">
                    Explore upcoming events and find one that interests you.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Select Your Seats</h4>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred seats from the interactive seating chart.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <Pizza className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Customize Your Experience</h4>
                  <p className="text-sm text-muted-foreground">
                    Select from food options that match your dietary preferences.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleNext}>
              Start Exploring <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}