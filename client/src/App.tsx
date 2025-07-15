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
import BookingSuccessSimple from "@/pages/BookingSuccessSimple";


import PaymentSuccessPage from "@/pages/PaymentSuccessPage";
import TicketOnlyBookingPage from "@/pages/TicketOnlyBookingPage";
import KitchenDashboard from "@/pages/backoffice/KitchenDashboard";
import TicketDetailPage from "@/pages/TicketDetailPage";

import { BookingCancel } from "@/pages/BookingCancel";
import { Header } from "./components/Header";
import { BottomNavigation } from "./components/BottomNavigation";
import { useAuth } from "./hooks/use-auth";
import { QueryErrorBoundary } from "./components/QueryErrorBoundary";

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
        <ProtectedRoute path="/events/:id/tickets" component={TicketOnlyBookingPage} />
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
        <ProtectedRoute path="/backoffice/kitchen" component={KitchenDashboard} />

        <ProtectedRoute path="/dashboard" component={CustomerDashboard} />
        <Route path="/profile" component={ProfilePage} />
        <ProtectedRoute path="/ticket/:bookingId" component={TicketDetailPage} />

        <Route path="/payment-success" component={PaymentSuccessPage} />
        <Route path="/booking-success" component={BookingSuccessSimple} />
        <Route path="/booking-cancel" component={BookingCancel} />
        <Route component={NotFound} />
      </Switch>

      <BottomNavigation />
    </div>
  );
}

function App() {
  // Error handling is now managed by queryClient.ts globally

  return (
    <QueryClientProvider client={queryClient}>
      <QueryErrorBoundary>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </QueryErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;