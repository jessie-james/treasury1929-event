
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-10 space-y-4">
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-muted-foreground max-w-md mx-auto">{description}</p>
      {action && (
        <Button asChild>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
