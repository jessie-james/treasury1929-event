import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { type User, type NewUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, NewUser>;
};

type LoginData = Pick<NewUser, "email" | "password">;

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const res = await fetch('/api/user', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (res.status === 401 || res.status === 204) {
          return null;
        }
        
        if (!res.ok) {
          return null;
        }
        
        return await res.json();
      } catch (error: any) {
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    throwOnError: false, // Prevent unhandled promise rejection
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      // Clear any existing auth state flags
      localStorage.removeItem("user_auth_state");
      
      console.log("Attempting login for:", credentials.email);
      const res = await apiRequest("POST", "/api/login", credentials);
      
      // Parse the user data with error handling
      const userData = await res.json();
      
      // Additional validation of user data
      if (!userData || !userData.id) {
        throw new Error("Invalid user data received");
      }
      
      // Set auth state flag for status tracking
      localStorage.setItem("user_auth_state", "logged_in");
      localStorage.setItem("user_email", userData.email || '');
      
      return userData;
    },
    onSuccess: (user: User) => {
      console.log("Login successful, setting user data");
      queryClient.setQueryData(["/api/user"], user);
      
      // Ensure auth state flag is set
      localStorage.setItem("user_auth_state", "logged_in");
      localStorage.setItem("user_email", user.email || '');
      
      // Store login timestamp
      localStorage.setItem("auth_timestamp", Date.now().toString());
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      
      // Mark auth state as failed
      localStorage.setItem("user_auth_state", "logged_out");
      
      toast({
        title: "Login failed",
        description: error.message || "Authentication failed. Please try again.",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: NewUser) => {
      console.log('Registration mutation received data:', credentials);
      
      // Validate data before sending
      if (!credentials.email || !credentials.password) {
        throw new Error("Email and password are required");
      }
      
      const res = await apiRequest("POST", "/api/register", credentials);
      const userData = await res.json();
      
      // Additional validation of user data
      if (!userData || !userData.id) {
        throw new Error("Invalid user data received");
      }
      
      console.log('Registration response received:', userData);
      
      // Set auth state flags
      localStorage.setItem("user_auth_state", "logged_in");
      localStorage.setItem("user_email", userData.email || '');
      
      return userData;
    },
    onSuccess: (user: User & { autoLoginFailed?: boolean; message?: string }) => {
      console.log('Registration success, setting user data:', user);
      
      if (user.autoLoginFailed) {
        // Account created but auto-login failed
        console.log('Account created but auto-login failed');
        
        // Clear any auth state since login failed
        localStorage.removeItem("user_auth_state");
        localStorage.removeItem("user_email");
        localStorage.removeItem("auth_timestamp");
        
        toast({
          title: "Account created successfully!",
          description: user.message || "Your account has been created. Please log in to continue.",
        });
        
        // Don't set user data since they're not logged in
        return;
      }
      
      // Normal successful registration with auto-login
      queryClient.setQueryData(["/api/user"], user);
      
      // Set auth state
      localStorage.setItem("user_auth_state", "logged_in");
      localStorage.setItem("user_email", user.email || '');
      localStorage.setItem("auth_timestamp", Date.now().toString());
      
      toast({
        title: "Registration successful",
        description: "Your account has been created and you're now logged in",
      });
    },
    onError: (error: Error) => {
      console.error('Registration error:', error);
      
      // Check if it's an email already exists error
      if (error.message.includes("Email already exists")) {
        // Don't show a generic error, let the form handle this
        return;
      }
      
      toast({
        title: "Registration failed",
        description: error.message || "Could not create your account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await apiRequest("POST", "/api/logout");
      } catch (error) {
        console.warn("Logout request failed:", error);
        // Continue with local cleanup even if API fails
      }
      
      // Always clear local storage auth data
      localStorage.setItem("user_auth_state", "logged_out");
      localStorage.removeItem("payment_token");
      localStorage.removeItem("user_email");
      localStorage.removeItem("auth_timestamp");
    },
    onSuccess: () => {
      // Clear all auth state
      queryClient.setQueryData(["/api/user"], null);
      
      // Ensure all related caches are cleared to prevent stale data
      queryClient.invalidateQueries();
      
      console.log("User successfully logged out");
    },
    onError: (error: Error) => {
      console.error("Logout error:", error);
      
      // Even if the API call fails, we still want to log the user out locally
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Logout Issues",
        description: "You have been logged out locally, but there was an issue with the server. Please refresh the page.",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
