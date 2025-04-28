import { Link, useLocation } from "wouter";
import { Calendar, AlertTriangle, Ticket, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export function BottomNavigation() {
  const { user } = useAuth();
  const [location] = useLocation();

  const navigationItems = [
    {
      title: "Events",
      href: "/",
      icon: Calendar,
    },
    {
      title: "My Tickets",
      href: "/dashboard",
      icon: Ticket,
      requireAuth: true,
    },
    {
      title: "My Profile",
      href: user ? "/profile" : "/auth",
      icon: User,
    },
    {
      title: "Backoffice",
      href: "/backoffice",
      icon: AlertTriangle,
      requireAuth: true,
      requireAdmin: true,
    },
  ];

  return (
    <div className="fixed bottom-0 w-full border-t bg-background z-50">
      <div className="container flex justify-around items-center h-16">
        {navigationItems.map((item) => {
          if ((item.requireAuth && !user) || (item.requireAdmin && user?.role !== 'admin') || (item.hideForAdmin && user?.role === 'admin')) return null;
          
          const isActive = location === item.href;
          
          return (
            <Link 
              key={item.title} 
              href={item.href}
              className="flex flex-col items-center justify-center w-full"
            >
              <div 
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-xs",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}