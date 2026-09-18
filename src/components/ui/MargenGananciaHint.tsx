import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "../../lib/cn";

export interface MargenGananciaHintProps {
  /** Costo unitario (0 si aún no se cargó). */
  costo: number;
  /** Precio de venta tipeado. Oculto si no es un valor válido > 0. */
  precio: number;
  className?: string;
}

export function MargenGananciaHint({
  costo,
  precio,
  className,
}: MargenGananciaHintProps) {
  if (!Number.isFinite(precio) || precio <= 0) return null;

  const delta = precio - costo;
  const porcentaje = costo > 0 ? (delta / costo) * 100 : null;
  const esGanancia = delta > 0;

  return (
    <p
      className={cn(
        "mt-1.5 flex items-center gap-1 text-xs",
        esGanancia
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400",
        className,
      )}
    >
      {esGanancia ? (
        <TrendingUp className="h-3 w-3 shrink-0" aria-hidden />
      ) : (
        <TrendingDown className="h-3 w-3 shrink-0" aria-hidden />
      )}
      <span className="font-semibold">
        Margen:{" "}
        {porcentaje !== null
          ? `${porcentaje.toFixed(1).replace(/\.0$/, "")}%`
          : "—"}{" "}
        · {delta > 0 ? "+" : ""}${delta.toFixed(2)}
      </span>
    </p>
  );
}