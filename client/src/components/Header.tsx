
import { Link } from "wouter";

export function Header() {
  return (
    <div className="border-b">
      <div className="container flex justify-center items-center h-16">
        <Link href="/">
          <img 
            src="/uploads/logo.png" 
            alt="The Treasury 1929" 
            className="h-8"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (img.src.includes('/uploads/')) {
                img.src = '/images/logo.png';
              }
            }}
          />
        </Link>
      </div>
    </div>
  );
}
