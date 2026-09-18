import { AlertCircle } from "lucide-react";
import { cn } from "../../lib/cn";

export interface FieldErrorProps {
  error?: string;
  className?: string;
}

export function FieldError({ error, className }: FieldErrorProps) {
  if (!error) return null;

  return (
    <p
      key={error}
      role="alert"
      className={cn(
        "ml-1 mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 animate-shake",
        className,
      )}
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      <span>{error}</span>
    </p>
  );
}