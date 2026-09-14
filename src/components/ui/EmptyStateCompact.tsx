import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface EmptyStateCompactProps
  extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyStateCompact({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateCompactProps) {
  return (
    <div
      className={cn(
        "flex w-full animate-entry-fade flex-col items-center justify-center px-6 py-10 text-center",
        className,
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 flex items-center justify-center rounded-full bg-slate-100 p-3 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500">
          {icon}
        </div>
      )}

      <h3 className="mb-1.5 text-base font-semibold text-slate-800 dark:text-slate-200">
        {title}
      </h3>

      {description && (
        <p className="mx-auto mb-5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}