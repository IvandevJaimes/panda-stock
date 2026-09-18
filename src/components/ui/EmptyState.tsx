import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex w-full animate-entry-fade flex-col items-center justify-center p-8 text-center md:p-12",
        className,
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 flex items-center justify-center text-slate-400 dark:text-slate-500/70">
          {icon}
        </div>
      )}

      <h3 className="mb-1.5 text-base font-semibold text-slate-800 dark:text-slate-200 sm:text-lg">
        {title}
      </h3>

      {description && (
        <p className="mx-auto mb-6 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
