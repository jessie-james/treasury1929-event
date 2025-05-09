import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { type User, type InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "email" | "password">;

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        // Clear any existing auth state flags
        localStorage.removeItem("user_auth_state");
        
        console.log("Attempting login for:", credentials.email);
        const res = await apiRequest("POST", "/api/login", credentials);
        
        // Network or server error handling
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: res.statusText || "Login failed" }));
          const errorMessage = errorData.message || errorData.error || "Authentication failed";
          throw new Error(errorMessage);
        }
        
        // Parse the user data with error handling
        let userData: User;
        try {
          userData = await res.json();
        } catch (parseError) {
          console.error("Error parsing login response:", parseError);
          throw new Error("Invalid response format from server");
        }
        
        // Additional validation of user data
        if (!userData || !userData.id) {
          throw new Error("Invalid user data received");
        }
        
        // Set auth state flag for status tracking
        localStorage.setItem("user_auth_state", "logged_in");
        localStorage.setItem("user_email", userData.email || '');
        
        return userData;
      } catch (error) {
        // Ensure errors are properly propagated
        console.error("Login error in mutation function:", error);
        throw error; // Rethrow for the onError handler
      }
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
    mutationFn: async (credentials: InsertUser) => {
      try {
        console.log('Registration mutation received data:', credentials);
        
        // Validate data before sending
        if (!credentials.email || !credentials.password) {
          throw new Error("Email and password are required");
        }
        
        const res = await apiRequest("POST", "/api/register", credentials);
        
        // Handle non-success responses
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: res.statusText || "Registration failed" }));
          const errorMessage = errorData.message || errorData.error || "Registration failed";
          throw new Error(errorMessage);
        }
        
        // Parse the user data with error handling
        let userData: User;
        try {
          userData = await res.json();
        } catch (parseError) {
          console.error("Error parsing registration response:", parseError);
          throw new Error("Invalid response format from server");
        }
        
        // Additional validation of user data
        if (!userData || !userData.id) {
          throw new Error("Invalid user data received");
        }
        
        console.log('Registration response received:', userData);
        
        // Set auth state flags
        localStorage.setItem("user_auth_state", "logged_in");
        localStorage.setItem("user_email", userData.email || '');
        
        return userData;
      } catch (error) {
        console.error("Registration error in mutation function:", error);
        throw error; // Rethrow for the onError handler
      }
    },
    onSuccess: (user: User) => {
      console.log('Registration success, setting user data:', user);
      queryClient.setQueryData(["/api/user"], user);
      
      // Set auth state
      localStorage.setItem("user_auth_state", "logged_in");
      localStorage.setItem("user_email", user.email || '');
      localStorage.setItem("auth_timestamp", Date.now().toString());
      
      toast({
        title: "Registration successful",
        description: "Your account has been created",
      });
    },
    onError: (error: Error) => {
      console.error('Registration error:', error);
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
        const res = await apiRequest("POST", "/api/logout");
        
        if (!res.ok) {
          console.warn("Logout returned non-success status:", res.status);
        }
      } catch (error) {
        console.error("Logout request failed:", error);
        // We still want to clear local state even on API failure
        // So we'll continue without throwing to let onSuccess handle it
      } finally {
        // Always clear local storage auth data regardless of API response
        localStorage.setItem("user_auth_state", "logged_out");
        localStorage.removeItem("payment_token");
        localStorage.removeItem("user_email");
        localStorage.removeItem("auth_timestamp");
      }
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
