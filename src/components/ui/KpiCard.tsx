import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type ActiveColor = "amber" | "rose" | "emerald";

type KpiCardProps = {
  icon: ReactNode;
  /** Clases de color del fondo del icono (ej. `bg-amber-100 text-amber-600 dark:bg-amber-950/40`) */
  iconBgClass: string;
  title: string;
  value: string | number;
  subtitle: string;
  /** Clases de color opcionales para resaltar el subtítulo (ej. rojo en alertas) */
  subtitleHighlightClass?: string;
  onClick?: () => void;
  isActive?: boolean;
  /** Color del anillo y borde cuando está activa */
  activeColor?: ActiveColor;
};

const activeStyles: Record<ActiveColor, string> = {
  amber:
    "border-amber-500/50 bg-amber-50/40 ring-2 ring-amber-500 dark:bg-amber-950/20",
  rose: "border-rose-500/50 bg-rose-50/40 ring-2 ring-rose-500 dark:bg-rose-950/20",
  emerald:
    "border-emerald-500/50 bg-emerald-50/30 ring-2 ring-emerald-500 dark:bg-emerald-950/20",
};

export function KpiCard({
  icon,
  iconBgClass,
  title,
  value,
  subtitle,
  subtitleHighlightClass,
  onClick,
  isActive = false,
  activeColor = "emerald",
}: KpiCardProps) {
  const contenido = (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10",
          iconBgClass,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {title}
        </p>
        <p className="font-display text-xl font-bold leading-tight tabular-nums text-slate-900 dark:text-white sm:text-2xl">
          {value}
        </p>
        <p
          className={cn(
            "mt-0.5 text-[11px] leading-tight text-slate-500 dark:text-slate-400",
            subtitleHighlightClass,
          )}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );

  const baseClases = cn(
    "rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-xs dark:border-slate-800/80 dark:bg-[#111827] sm:p-4",
    onClick &&
      "cursor-pointer transition-all duration-150 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:border-slate-700",
    isActive && activeStyles[activeColor],
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={isActive} className={baseClases}>
        {contenido}
      </button>
    );
  }

  return <div className={baseClases}>{contenido}</div>;
}