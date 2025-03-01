import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  Utensils,
  LogOut,
  ClipboardList,
} from "lucide-react";

interface Props {
  children: React.ReactNode;
}

export function BackofficeLayout({ children }: Props) {
  const { user, logoutMutation } = useAuth();

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
      name: "Settings",
      href: "/backoffice/settings",
      icon: Settings,
      roles: ['admin', 'venue_owner'],
    },
  ];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted">
        <div className="h-16 flex items-center px-4 border-b">
          <h1 className="text-lg font-semibold">Venue Management</h1>
        </div>
        <nav className="p-4 space-y-2">
          {navigation
            .filter((item) => item.roles.includes(user?.role || ''))
            .map((item) => (
              <Link key={item.name} href={item.href}>
                <a className="flex items-center gap-2 px-4 py-2 rounded-md hover:bg-accent">
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </a>
              </Link>
            ))}
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-16 border-b flex items-center px-6">
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
