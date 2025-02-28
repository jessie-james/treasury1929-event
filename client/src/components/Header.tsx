import { Link } from "wouter";
import { UserMenu } from "./UserMenu";
import { Home } from "lucide-react";
import { Button } from "./ui/button";

export function Header() {
  return (
    <div className="border-b">
      <div className="container flex justify-between items-center h-16">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Event Venue Booking</h1>
        </div>
        <UserMenu />
      </div>
    </div>
  );
}
