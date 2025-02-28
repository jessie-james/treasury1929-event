
import * as React from "react";
import { useNavigate } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface BackButtonProps {
  className?: string;
}

export function BackButton({ className }: BackButtonProps) {
  const [, navigate] = useNavigate();

  const goBack = () => {
    // Go back in browser history, or navigate to home if no history
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/");
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={goBack} 
      className={`mb-4 ${className || ""}`}
    >
      <ChevronLeft className="mr-1 h-4 w-4" />
      Back
    </Button>
  );
}
