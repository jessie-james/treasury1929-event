import { Switch, Route } from "wouter";
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
import CustomerDashboard from "@/pages/CustomerDashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/events/:id" component={EventPage} />
      <ProtectedRoute path="/events/:id/book" component={BookingPage} />
      <ProtectedRoute path="/backoffice" component={DashboardPage} />
      <ProtectedRoute path="/backoffice/orders" component={OrdersPage} />
      <ProtectedRoute path="/backoffice/events" component={EventsPage} />
      <ProtectedRoute path="/backoffice/food" component={FoodPage} />
      <ProtectedRoute path="/backoffice/users" component={UsersPage} requiredRole="admin" />
      <ProtectedRoute path="/dashboard" component={CustomerDashboard} />
      <Route component={NotFound} />
    </Switch>
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