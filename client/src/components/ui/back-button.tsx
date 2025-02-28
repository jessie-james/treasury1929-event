import * as React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface BackButtonProps {
  className?: string;
  to?: string;
}

export function BackButton({ className = "", to }: BackButtonProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (to) {
      setLocation(to);
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`mb-4 flex items-center ${className}`}
      onClick={handleBack}
    >
      <ChevronLeft className="mr-2 h-4 w-4" />
      Back
    </Button>
  );
}