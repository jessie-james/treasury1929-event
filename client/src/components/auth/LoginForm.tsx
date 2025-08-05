import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Mail, KeyRound, EyeIcon, EyeOffIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export function LoginForm() {
  const { loginMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPassword = async () => {
    const email = form.getValues('email');
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address first",
        variant: "destructive",
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      await apiRequest("POST", "/api/forgot-password", { email });
      toast({
        title: "Password reset sent",
        description: "If an account with that email exists, we've sent you a password reset link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email",
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => loginMutation.mutate(data))}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input {...field} type="email" className="pl-10" placeholder="you@example.com" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input 
                    {...field} 
                    type={showPassword ? "text" : "password"} 
                    className="pl-10 pr-10" 
                    placeholder="••••••" 
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? 
                      <EyeOffIcon className="h-5 w-5" /> : 
                      <EyeIcon className="h-5 w-5" />
                    }
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? "Signing in..." : "Sign In"}
        </Button>

        <div className="text-center">
          <Button
            type="button"
            variant="link"
            className="text-sm text-muted-foreground p-0 h-auto"
            onClick={handleForgotPassword}
            disabled={isResettingPassword}
          >
            {isResettingPassword ? "Sending reset link..." : "Forgot your password?"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
