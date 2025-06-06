import { Link } from "wouter";

export function Header() {
  return (
    <div className="border-b">
      <div className="container flex justify-center items-center h-24 py-4">
        <Link href="/">
          <img 
            src="/assets/logo.png" 
            alt="The Treasury 1929" 
            className="h-16 hover:opacity-80 transition-opacity"
          />
        </Link>
      </div>
    </div>
  );
}
