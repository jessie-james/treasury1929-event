import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function AuthPage() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();

  // Redirect if already logged in
  if (user) {
    // Check if this is a new user who needs onboarding (missing firstName or dietary preferences)
    const needsOnboarding = user.role === 'customer' && 
      (!user.firstName || (!user.allergens?.length && !user.dietaryRestrictions?.length));
      
    if (needsOnboarding) {
      setLocation('/onboarding');
    } else {
      setLocation(user.role === 'customer' ? '/' : '/backoffice');
    }
    return null;
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Tabs defaultValue="login">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <LoginForm />
              </TabsContent>
              <TabsContent value="register">
                <RegisterForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <div className="hidden md:flex flex-col justify-center p-8 bg-primary/5">
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-primary">Welcome to Venue Booking</h1>
            <p className="text-xl mt-2">Your personal event experience</p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Get Event Notifications</h3>
                <p className="text-muted-foreground">
                  Be the first to know about new events and special offers
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Easy Booking Process</h3>
                <p className="text-muted-foreground">
                  Select your seats and customize your experience in minutes
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M16 13H8" />
                  <path d="M16 17H8" />
                  <path d="M10 9H8" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Digital Tickets</h3>
                <p className="text-muted-foreground">
                  Access your booking confirmations and e-tickets anytime
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
