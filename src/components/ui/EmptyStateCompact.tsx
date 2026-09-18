import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface EmptyStateCompactProps
  extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "default" | "danger";
}

export function EmptyStateCompact({
  icon,
  title,
  description,
  action,
  tone = "default",
  className,
  ...props
}: EmptyStateCompactProps) {
  const danger = tone === "danger";
  return (
    <div
      className={cn(
        "flex w-full animate-entry-fade flex-col items-center justify-center px-6 py-10 text-center",
        className,
      )}
      {...props}
    >
      {icon && (
        <div
          className={cn(
            "mb-4 flex items-center justify-center rounded-full p-3",
            danger
              ? "bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-500"
              : "bg-slate-100 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500",
          )}
        >
          {icon}
        </div>
      )}

      <h3
        className={cn(
          "mb-1.5 text-base font-semibold",
          danger
            ? "text-red-700 dark:text-red-400"
            : "text-slate-800 dark:text-slate-200",
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            "mx-auto mb-5 max-w-sm text-sm",
            danger
              ? "text-red-500/80 dark:text-red-400/70"
              : "text-slate-500 dark:text-slate-400",
          )}
        >
          {description}
        </p>
      )}

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}