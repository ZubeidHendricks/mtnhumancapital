import { useLocation } from "wouter";
import { Button } from "./button";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  fallbackPath?: string;
  label?: string;
  className?: string;
}

export function BackButton({ fallbackPath = "/", label = "Back", className = "" }: BackButtonProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation(fallbackPath);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={`gap-2 ${className}`}
      data-testid="button-back"
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </Button>
  );
}
