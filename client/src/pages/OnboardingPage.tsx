import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  User, 
  PhoneCall,
  Mail,
  Check
} from "lucide-react";

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form states
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  
  // Redirect to home if no user is logged in
  if (!user) {
    setLocation("/auth");
    return null;
  }
  
  // Setup mutation to update user profile
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string, lastName: string, phone: string }) => {
      return await apiRequest("PATCH", "/api/user/profile", data);
    },
    onSuccess: () => {
      // Invalidate user query to refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: `Welcome ${firstName}!`,
        description: "Your profile is all set. Explore our upcoming events.",
      });
      
      // Redirect to homepage
      setLocation("/");
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
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your first and last name.",
        variant: "destructive",
      });
      return;
    }
    
    updateProfileMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim()
    });
  };
  
  return (
    <div className="min-h-screen bg-gray-50 pt-8 px-4">
      <div className="container max-w-md mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary">The Treasury 1929 Events</h1>
          <p className="text-muted-foreground">Complete your profile setup</p>
        </div>
        
        <Card className="border-none shadow-lg">
          <CardHeader>
            <div className="flex items-center mb-2">
              <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center text-primary font-medium mr-2">
                <User className="h-4 w-4" />
              </div>
              <CardTitle>Your Profile</CardTitle>
            </div>
            <CardDescription>
              Let us know how to address you and stay in touch
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input 
                  id="firstName" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input 
                  id="lastName" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <div className="relative">
                  <PhoneCall className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input 
                    id="phone" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  We'll only use this for important event notifications
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input 
                    value={user.email} 
                    disabled
                    className="pl-10 bg-muted"
                  />
                </div>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  "Setting up your profile..."
                ) : (
                  <>
                    Complete Setup
                    <Check className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}