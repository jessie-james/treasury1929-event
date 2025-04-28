
import { Link } from "wouter";

export function Header() {
  return (
    <div className="border-b">
      <div className="container flex justify-center items-center h-16">
        <Link href="/">
          <img 
            src="/attached_assets/image_1745295264810.png" 
            alt="The Treasury 1929" 
            className="h-8"
          />
        </Link>
      </div>
    </div>
  );
}
