import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { User, Save, AlertTriangle, Edit, X, Phone } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { allergenIcons, dietaryIcons, Allergen, DietaryRestriction } from "@/components/ui/food-icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define the common allergens and dietary restrictions
const ALLERGENS: Allergen[] = ["gluten", "dairy", "eggs", "peanuts", "tree_nuts", "soy", "fish", "shellfish", "sesame"];
const DIETARY_RESTRICTIONS: DietaryRestriction[] = ["vegetarian", "vegan", "halal", "kosher", "low_carb", "keto", "paleo"];

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Set up state for user's allergens and dietary restrictions
  const [selectedAllergens, setSelectedAllergens] = useState<Allergen[]>(
    (user?.allergens || []) as Allergen[]
  );
  const [selectedDietaryRestrictions, setSelectedDietaryRestrictions] = useState<DietaryRestriction[]>(
    (user?.dietaryRestrictions || []) as DietaryRestriction[]
  );
  const [isSaving, setIsSaving] = useState(false);
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Set up mutation to update user preferences
  const updateUserMutation = useMutation({
    mutationFn: async (data: { allergens: Allergen[], dietaryRestrictions: DietaryRestriction[] }) => {
      const response = await apiRequest("PATCH", "/api/user/preferences", data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Preferences updated",
        description: "Your dietary preferences have been saved successfully.",
      });
      // Invalidate user data to refresh the user context
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setIsSaving(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update your preferences. Please try again.",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  });
  
  // Set up mutation to update user profile
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string, lastName: string, phone?: string }) => {
      const response = await apiRequest("PATCH", "/api/user/profile", data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile information has been saved successfully.",
      });
      // Invalidate user data to refresh the user context
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setIsUpdatingProfile(false);
      setIsEditingProfile(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
      setIsUpdatingProfile(false);
    }
  });
  
  // Handle saving preferences
  const handleSavePreferences = () => {
    setIsSaving(true);
    updateUserMutation.mutate({
      allergens: selectedAllergens,
      dietaryRestrictions: selectedDietaryRestrictions
    });
  };
  
  // Handle saving profile
  const handleSaveProfile = () => {
    // Basic validation
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Validation Error",
        description: "First name and last name are required.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUpdatingProfile(true);
    updateProfileMutation.mutate({
      firstName,
      lastName,
      phone: phone || undefined
    });
  };
  
  // Handle cancel editing profile
  const handleCancelEdit = () => {
    // Reset form values to current user data
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
    }
    setIsEditingProfile(false);
  };
  
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

  if (!user) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold mb-4">Profile</h1>
          <p>Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-6">My Profile</h1>
        
        <Tabs defaultValue="profile" className="w-full max-w-3xl">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="dietary">Dietary Preferences</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <Card>
              <CardHeader className="flex flex-col items-center">
                <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-2">
                  <User className="h-12 w-12 text-muted-foreground" />
                </div>
                <CardTitle className="text-xl mt-2">{user.email}</CardTitle>
                <CardDescription>
                  Account Type: {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {isEditingProfile ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground">Email</h3>
                      <p>{user.email}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">First Name</label>
                        <Input 
                          value={firstName} 
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="First name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Last Name</label>
                        <Input 
                          value={lastName} 
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Last name"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Phone (Optional)</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          value={phone} 
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="(555) 123-4567"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground">Account Created</h3>
                      <p>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground">Email</h3>
                      <p>{user.email}</p>
                    </div>
                    
                    {(user.firstName || user.lastName) && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">Name</h3>
                        <p>{`${user.firstName || ''} ${user.lastName || ''}`}</p>
                      </div>
                    )}
                    
                    {user.phone && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">Phone</h3>
                        <p>{user.phone}</p>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground">Account Created</h3>
                      <p>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}</p>
                    </div>
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="flex flex-wrap gap-2">
                {isEditingProfile ? (
                  <>
                    <Button 
                      className="flex-1"
                      onClick={handleSaveProfile}
                      disabled={isUpdatingProfile}
                    >
                      {isUpdatingProfile ? (
                        <>
                          <span className="mr-2 h-4 w-4 animate-spin">◌</span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Profile
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleCancelEdit}
                      disabled={isUpdatingProfile}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      className="flex-1"
                      onClick={() => setIsEditingProfile(true)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-1"
                      onClick={() => logoutMutation.mutate()}
                    >
                      Sign Out
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="dietary">
            <Card>
              <CardHeader>
                <CardTitle>Dietary Preferences</CardTitle>
                <CardDescription>
                  Set up your dietary restrictions and allergens. This information will be used to recommend menu items and warn you about dishes that may contain allergens.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    While we'll try to highlight dishes that may contain allergens, please always inform venue staff about your allergies when attending events.
                  </AlertDescription>
                </Alert>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Allergens</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select any allergens you want to avoid.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {ALLERGENS.map((allergen) => (
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
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {DIETARY_RESTRICTIONS.map((restriction) => (
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
              
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={handleSavePreferences}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin">◌</span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}