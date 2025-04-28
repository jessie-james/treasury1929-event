import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  Utensils,
  LogOut,
  ClipboardList,
  Menu,
  X,
  BookOpenCheck,
  History,
  CreditCard,
  DoorOpen,
  QrCode,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface Props {
  children: React.ReactNode;
}

export function BackofficeLayout({ children }: Props) {
  const { user, logoutMutation } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();

  const navigation = [
    {
      name: "Dashboard",
      href: "/backoffice",
      icon: LayoutDashboard,
      roles: ['admin', 'venue_owner', 'venue_manager'],
    },
    {
      name: "Orders",
      href: "/backoffice/orders",
      icon: ClipboardList,
      roles: ['admin', 'venue_owner', 'venue_manager'],
    },
    {
      name: "Payments",
      href: "/backoffice/payments",
      icon: CreditCard,
      roles: ['admin', 'venue_owner'],
    },
    {
      name: "Entrance",
      href: "/backoffice/entrance",
      icon: DoorOpen,
      roles: ['admin', 'venue_owner', 'venue_manager'],
    },
    {
      name: "Bookings",
      href: "/backoffice/bookings",
      icon: BookOpenCheck,
      roles: ['admin', 'venue_owner', 'venue_manager'],
    },
    {
      name: "Events",
      href: "/backoffice/events",
      icon: Calendar,
      roles: ['admin', 'venue_owner', 'venue_manager'],
    },
    {
      name: "Food",
      href: "/backoffice/food",
      icon: Utensils,
      roles: ['admin', 'venue_owner', 'venue_manager'],
    },
    {
      name: "Users",
      href: "/backoffice/users",
      icon: Users,
      roles: ['admin'],
    },
    {
      name: "Logs",
      href: "/backoffice/logs",
      icon: History,
      roles: ['admin'],
    },
    {
      name: "Settings",
      href: "/backoffice/settings",
      icon: Settings,
      roles: ['admin', 'venue_owner'],
    },
  ];

  const filteredNav = navigation.filter((item) => item.roles.includes(user?.role || ''));

  const handleNavigation = (href: string) => {
    setLocation(href);
    setIsOpen(false);
  };

  const handleLogout = () => {
    setIsOpen(false);
    logoutMutation.mutate();
  };

  const NavItems = () => (
    <>
      {filteredNav.map((item) => (
        <Button
          key={item.name}
          variant="ghost"
          className="w-full justify-start"
          onClick={() => handleNavigation(item.href)}
        >
          <item.icon className="h-5 w-5 mr-2" />
          {item.name}
        </Button>
      ))}
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={handleLogout}
      >
        <LogOut className="h-5 w-5 mr-2" />
        Logout
      </Button>
    </>
  );

  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 border-r bg-muted flex-col">
        <div className="h-16 flex items-center px-4 border-b">
          <h1 className="text-lg font-semibold">Venue Management</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavItems />
        </nav>
      </div>

      {/* Mobile navigation */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden absolute top-3 left-3">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="h-16 flex items-center px-4 border-b">
            <SheetTitle className="text-lg font-semibold">Venue Management</SheetTitle>
          </SheetHeader>
          <nav className="flex-1 p-4 space-y-1">
            <NavItems />
          </nav>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-16 border-b flex items-center px-6">
          <div className="w-12 md:w-0" /> {/* Spacer for mobile menu button */}
          <p className="text-sm text-muted-foreground">
            Logged in as {user?.email} ({user?.role})
          </p>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}