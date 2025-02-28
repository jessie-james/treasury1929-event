import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { User } from "lucide-react";

export function UserMenu() {
  const { user, logoutMutation } = useAuth();
  const [_, setLocation] = useLocation();

  if (!user) {
    return (
      <Button variant="outline" onClick={() => setLocation("/auth")}>
        Sign In
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <User className="h-4 w-4" />
          {user.email}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {user.role === 'customer' ? (
          <DropdownMenuItem onClick={() => setLocation("/dashboard")}>
            My Tickets
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => setLocation("/backoffice")}>
            Backoffice
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
