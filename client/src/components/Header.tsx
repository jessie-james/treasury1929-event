import { Link } from "wouter";

export function Header() {
  return (
    <div className="border-b">
      <div className="container flex justify-center items-center h-16">
        <Link href="/">
          <h1 className="text-xl font-semibold">Event Venue Booking</h1>
        </Link>
      </div>
    </div>
  );
}
