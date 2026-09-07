import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type ProgressBarVariant = "auto" | "emerald" | "amber" | "red";

type ProgressBarProps = HTMLAttributes<HTMLDivElement> & {
  /** Valor de 0 a 100 */
  value: number;
  /** Forzar color; en `auto` se deriva del valor */
  variant?: ProgressBarVariant;
};

/** Color automático según el valor: rojo en 0, ámbar ≤ 25%, verde esmeralda el resto */
const autoColor = (value: number) =>
  value <= 0 ? "bg-red-500" : value <= 25 ? "bg-amber-500" : "bg-emerald-500";

const variants: Record<Exclude<ProgressBarVariant, "auto">, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export function ProgressBar({
  value,
  variant = "auto",
  className,
  ...props
}: ProgressBarProps) {
  const porcentaje = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={porcentaje}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full",
        variant === "red"
          ? "bg-red-100 dark:bg-red-950/40"
          : "bg-slate-300 dark:bg-slate-800",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-300",
          variant === "auto" ? autoColor(porcentaje) : variants[variant],
        )}
        style={{ width: `${porcentaje}%` }}
      />
    </div>
  );
}
