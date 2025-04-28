import { Link } from "wouter";

export function Header() {
  return (
    <div className="border-b">
      <div className="container flex justify-center items-center h-16">
        <Link href="/">
          <img 
            src="/assets/treasury-logo.png" 
            alt="The Treasury 1929" 
            className="h-8 hover:opacity-80 transition-opacity"
          />
        </Link>
      </div>
    </div>
  );
}
