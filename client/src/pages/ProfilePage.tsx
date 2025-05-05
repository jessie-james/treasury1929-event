import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { User, Save, Edit, X, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  
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
        
        <div className="w-full max-w-3xl">
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
        </div>
      </div>
    </div>
  );
}