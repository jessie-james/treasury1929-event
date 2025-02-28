import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import Link from 'next/link';

function BackButton() {
  return (
    <Link href="/">
      <button className="text-blue-500 hover:underline">Back</button>
    </Link>
  );
}

export default function AuthPage() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();

  // Redirect if already logged in
  if (user) {
    setLocation(user.role === 'customer' ? '/' : '/backoffice');
    return null;
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md mb-4 self-start pl-4">
          <BackButton />
        </div>
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
      <div className="hidden md:flex flex-col justify-center p-8 bg-muted">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Event Venue Booking</h1>
          <p className="text-lg text-muted-foreground">
            Book your perfect venue for any occasion. Our platform offers seamless
            booking experience with real-time seat availability.
          </p>
        </div>
      </div>
    </div>
  );
}