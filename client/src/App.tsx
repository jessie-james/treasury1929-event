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
import DashboardPage from "@/pages/backoffice/DashboardPage";
import OrdersPage from "@/pages/backoffice/OrdersPage";
import EventsPage from "@/pages/backoffice/EventsPage";
import FoodPage from "@/pages/backoffice/FoodPage";
import UsersPage from "@/pages/backoffice/UsersPage";
import LogsPage from "@/pages/backoffice/LogsPage";
import BookingManagementPage from "@/pages/backoffice/BookingManagementPage";
import EntrancePage from "@/pages/backoffice/EntrancePage";
import CustomerDashboard from "@/pages/CustomerDashboard";
import ProfilePage from "@/pages/ProfilePage";
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
    <div className={showNavigation ? "pb-16" : ""}>
      {showNavigation && <Header />}
      
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/events/:id" component={EventPage} />
        <ProtectedRoute path="/events/:id/book" component={BookingPage} />
        <ProtectedRoute path="/backoffice" component={DashboardPage} />
        <ProtectedRoute path="/backoffice/orders" component={OrdersPage} />
        <ProtectedRoute path="/backoffice/entrance" component={EntrancePage} />
        <ProtectedRoute path="/backoffice/bookings" component={BookingManagementPage} />
        <ProtectedRoute path="/backoffice/events" component={EventsPage} />
        <ProtectedRoute path="/backoffice/food" component={FoodPage} />
        <ProtectedRoute path="/backoffice/users" component={UsersPage} requiredRole="admin" />
        <ProtectedRoute path="/backoffice/logs" component={LogsPage} requiredRole="admin" />
        <ProtectedRoute path="/dashboard" component={CustomerDashboard} />
        <Route path="/profile" component={ProfilePage} />
        <Route component={NotFound} />
      </Switch>
      
      {showNavigation && <BottomNavigation />}
    </div>
  );
}

function App() {
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