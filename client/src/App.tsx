import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/HomePage";
import EventPage from "@/pages/EventPage";
import BookingPage from "@/pages/BookingPage";
import AuthPage from "@/pages/auth-page";
import AdminLoginPage from "@/pages/AdminLoginPage";
import OnboardingPage from "@/pages/OnboardingPage";
import DashboardPage from "@/pages/backoffice/DashboardPage";
import OrdersPage from "@/pages/backoffice/OrdersPage";
import PaymentsPage from "@/pages/backoffice/PaymentsPage";
import EventsPage from "@/pages/backoffice/EventsPage";
import FoodPage from "@/pages/backoffice/FoodPage";
import UsersPage from "@/pages/backoffice/UsersPage";
import LogsPage from "@/pages/backoffice/LogsPage";
import BookingManagementPage from "@/pages/backoffice/BookingManagementPage";
import EntrancePage from "@/pages/backoffice/EntrancePage";

// Removed old layout components - now using VenueDesigner only
import VenueDesigner from "@/pages/admin/VenueDesigner";
import CustomerDashboard from "@/pages/CustomerDashboard";
import ProfilePage from "@/pages/ProfilePage";
import StripeDiagnostics from "@/pages/StripeDiagnostics";

import PaymentSuccessPage from "@/pages/PaymentSuccessPage";
import { Header } from "./components/Header";
import { BottomNavigation } from "./components/BottomNavigation";
import { useAuth } from "./hooks/use-auth";

function Router() {
  const [location] = useLocation();
  const { user } = useAuth();

  // Check if current path is in backoffice 
  const isBackoffice = location.startsWith("/backoffice");

  // Only show header and bottom navigation on non-backoffice pages
  const showNavigation = !isBackoffice;

  return (
    <div className="pb-16">
      {showNavigation && <Header />}

      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/admin-login" component={AdminLoginPage} />
        <Route path="/events/:id" component={EventPage} />
        <ProtectedRoute path="/events/:id/book" component={BookingPage} />
        <ProtectedRoute path="/onboarding" component={OnboardingPage} />
        <ProtectedRoute path="/backoffice" component={DashboardPage} />
        <ProtectedRoute path="/backoffice/orders" component={OrdersPage} />
        <ProtectedRoute path="/backoffice/payments" component={PaymentsPage} requiredRole="admin" />
        <ProtectedRoute path="/backoffice/entrance" component={EntrancePage} />
        <ProtectedRoute path="/backoffice/bookings" component={BookingManagementPage} />

        <ProtectedRoute path="/backoffice/events" component={EventsPage} />
        <ProtectedRoute path="/backoffice/food" component={FoodPage} />
        <ProtectedRoute path="/backoffice/venue-designer" component={VenueDesigner} requiredRole="admin" />
        <ProtectedRoute path="/backoffice/users" component={UsersPage} requiredRole="admin" />
        <ProtectedRoute path="/backoffice/logs" component={LogsPage} requiredRole="admin" />
        <ProtectedRoute path="/backoffice/stripe-diagnostics" component={StripeDiagnostics} requiredRole="admin" />
        <ProtectedRoute path="/dashboard" component={CustomerDashboard} />
        <Route path="/profile" component={ProfilePage} />

        <Route path="/payment-success" component={PaymentSuccessPage} />
        <Route component={NotFound} />
      </Switch>

      <BottomNavigation />
    </div>
  );
}

function App() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      
      // Enhanced debugging information
      const errorInfo = {
        type: typeof error,
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        isAuthError: error?.message?.includes('401') || error?.message?.includes('Not authenticated'),
        isNetworkError: error?.message?.includes('Network error') || error?.message?.includes('Failed to fetch'),
        isQueryError: error?.name?.includes('Query') || error?.toString?.()?.includes('TanStack')
      };

      console.group('🚨 Unhandled Promise Rejection');
      console.error('Error object:', error);
      console.error('Error analysis:', errorInfo);
      console.error('Full stack trace:', error?.stack);
      console.groupEnd();

      // Don't prevent default for auth errors - they should be handled by the auth system
      if (!errorInfo.isAuthError) {
        event.preventDefault();
      }
    };

    const handleError = (event: ErrorEvent) => {
      console.group('🚨 JavaScript Error');
      console.error('Error message:', event.message);
      console.error('File:', event.filename);
      console.error('Line:', event.lineno);
      console.error('Column:', event.colno);
      console.error('Error object:', event.error);
      console.groupEnd();
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;