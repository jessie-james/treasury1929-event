import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { StripeProvider } from "@/components/providers/StripeProvider";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/HomePage";
import EventPage from "@/pages/EventPage";
import BookingPage from "@/pages/BookingPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/events/:id" component={EventPage} />
      <Route path="/events/:id/book" component={BookingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <StripeProvider>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </StripeProvider>
  );
}

export default App;