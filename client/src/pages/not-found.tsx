
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = 'Page Not Found';
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <h1 className="text-5xl font-bold mb-6">404</h1>
      <p className="text-xl mb-8">Page not found</p>
      <p className="mb-8">The page you are looking for doesn't exist or has been moved.</p>
      <Button onClick={() => setLocation('/')}>
        Return to Home
      </Button>
    </div>
  );
}
