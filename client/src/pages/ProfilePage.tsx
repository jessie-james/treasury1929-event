import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();

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
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-6">My Profile</h1>
        
        <Card className="w-full max-w-md">
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
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Email</h3>
                <p>{user.email}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Account Created</h3>
                <p>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}</p>
              </div>
            </div>
          </CardContent>
          
          <CardFooter>
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={() => logoutMutation.mutate()}
            >
              Sign Out
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}