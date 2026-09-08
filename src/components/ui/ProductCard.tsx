import { Calendar, Pencil, Trash2 } from "lucide-react";
import { ProgressBar } from "./ProgressBar";
import { Tooltip } from "./Tooltip";
import { TruncatedText } from "./TruncatedText";
import { cn } from "../../lib/cn";
import { evaluateExpiry } from "../../lib/dateUtils";

export type ProductStatus =
  | "normal"
  | "low_stock"
  | "expiring_soon"
  | "out_of_stock"
  | "expired";

export interface ProductCardProps {
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  expiresAt?: string;
  status?: ProductStatus;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const statusStyles: Record<ProductStatus, string> = {
  expired:
    "bg-red-50/70 dark:bg-red-950/25 border-red-200/90 dark:border-red-900/40 hover:border-red-400 dark:hover:border-red-600/60 hover:shadow-red-500/5",
  out_of_stock:
    "bg-red-50/70 dark:bg-red-950/25 border-red-200/90 dark:border-red-900/40 hover:border-red-400 dark:hover:border-red-600/60 hover:shadow-red-500/5",
  low_stock:
    "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/90 dark:border-amber-900/40 hover:border-amber-400 dark:hover:border-amber-700 hover:shadow-amber-500/5",
  expiring_soon:
    "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/90 dark:border-amber-900/40 hover:border-amber-400 dark:hover:border-amber-700 hover:shadow-amber-500/5",
  normal:
    "bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-slate-500/5",
};

export function ProductCard({
  name,
  category,
  price,
  stock,
  minStock,
  expiresAt,
  status = "normal",
  onEdit,
  onDelete,
  className,
  style,
}: ProductCardProps) {
  const maxReference = Math.max(minStock * 2, 20);
  const stockPercentage = Math.round((stock / maxReference) * 100);

  // La barra mide únicamente inventario físico; el vencimiento nunca pinta la barra.
  const stockVariant: "red" | "amber" | "emerald" =
    stock === 0 ? "red" : stock <= minStock ? "amber" : "emerald";

  // Única fuente de verdad: el estado de vencimiento y su texto relativo
  // se derivan juntos de evaluateExpiry para que el badge y el tooltip
  // jamás se contradigan (misma regla, misma zona horaria local).
  const isStockStatus = status === "out_of_stock" || status === "low_stock";
  const expiry = expiresAt ? evaluateExpiry(expiresAt) : null;

  // Los estados basados en stock prevalecen; el resto se resuelve desde la fecha.
  const resolvedStatus: ProductStatus = isStockStatus
    ? status
    : expiry
      ? expiry.status
      : status;

  const isExpiryBadge =
    resolvedStatus === "expired" || resolvedStatus === "expiring_soon";

  return (
    <div
      style={style}
      className={cn(
        "w-full h-14 sm:h-16 px-3 sm:px-4 rounded-2xl cursor-pointer border transition-colors duration-150 select-none shadow-xs overflow-hidden animate-entry-up",
        "grid grid-cols-[1fr_auto_1fr] min-w-0 items-center gap-3 sm:gap-4",
        statusStyles[resolvedStatus] || statusStyles.normal,
        className,
      )}
    >
      {/* 1. Izquierda: Textos (prioridad de espacio en móvil/ancho chico) */}
      <div className="flex min-w-0 flex-col justify-center">
        <div className="flex min-w-0 items-center gap-1.5">
          <TruncatedText
            text={name}
            className="text-xs font-bold text-slate-900 sm:text-sm dark:text-white"
          />
          <span className="shrink-0 font-display text-[11px] font-bold text-emerald-600 sm:text-xs dark:text-emerald-400">
            ${price.toFixed(2)}
          </span>
        </div>
        <TruncatedText
          text={category}
          className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:text-[11px] dark:text-slate-500"
        />
      </div>

      {/* 2. Centro: Columna de stock con ancho fijo, exactamente en el centro geométrico */}
      <div className="flex w-36 shrink-0 flex-col justify-center gap-1 px-1 md:w-40">
        <div className="flex items-center justify-between text-[10px] leading-none sm:text-[11px]">
          <span className="hidden text-slate-400 md:inline dark:text-slate-500">
            Stock
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {stock}
            <span className="text-[9px] font-normal text-slate-400 sm:text-[10px]">
              {" "}
              / {minStock}
            </span>
          </span>
        </div>
        <div className="w-full min-w-0">
          <ProgressBar
            value={stock === 0 ? 0 : stockPercentage}
            variant={stockVariant}
          />
        </div>
      </div>

      {/* 3. Derecha: Información (fecha + badge) y acciones ancladas a la derecha */}
      <div className="flex min-w-0 items-center justify-end gap-2.5 sm:gap-3">
        {/* Bloque de información: fecha y badge */}
        <div className="flex shrink-0 items-center justify-end gap-2">
          {/* Fecha suelta: siempre visible en normal; se oculta en pantallas chicas si hay badge */}
          {expiresAt && expiry && (
            <Tooltip content={expiry.relativeText} placement="top">
              <div
                className={cn(
                  "flex shrink-0 cursor-default select-none items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium sm:text-[11px]",
                  resolvedStatus !== "normal" && "hidden md:flex",
                  resolvedStatus === "expired"
                    ? "text-red-600 dark:text-red-400"
                    : resolvedStatus === "expiring_soon"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-slate-400 dark:text-slate-500",
                )}
              >
                <Calendar className="h-3 w-3 shrink-0 opacity-70" />
                <span className="tabular-nums">{expiry.formattedDate}</span>
              </div>
            </Tooltip>
          )}

          {!expiresAt && (
            <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium italic opacity-70 sm:text-[11px]">
              Sin vencimiento
            </span>
          )}

          {resolvedStatus !== "normal" && (
            <Tooltip
              content={
                isExpiryBadge
                  ? `${expiry?.formattedDate} • ${expiry?.relativeText}`
                  : expiry?.relativeText
              }
              placement="top"
            >
              <span
                className={cn(
                  "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide sm:text-[11px]",
                  resolvedStatus === "expired" &&
                    "bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300 border border-red-200/90 dark:border-red-900/50",
                  resolvedStatus === "out_of_stock" &&
                    "bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300 border border-red-200/90 dark:border-red-900/50",
                  (resolvedStatus === "low_stock" ||
                    resolvedStatus === "expiring_soon") &&
                    "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50",
                )}
              >
                {resolvedStatus === "expired" && "Vencido"}
                {resolvedStatus === "out_of_stock" && "Agotado"}
                {resolvedStatus === "low_stock" && "Stock bajo"}
                {resolvedStatus === "expiring_soon" && "Por vencer"}
              </span>
            </Tooltip>
          )}
        </div>

        {/* Divisor vertical y acciones fijas en X */}
        {(onEdit || onDelete) && (
          <div className="flex shrink-0 items-center gap-0.5 border-l border-slate-200/60 pl-2 dark:border-slate-800/80">
            {onEdit && (
              <Tooltip content="Editar producto" placement="top">
                <button
                  type="button"
                  onClick={onEdit}
                  aria-label="Editar"
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-black/5 hover:text-slate-800 sm:h-8 sm:w-8 sm:rounded-xl dark:hover:bg-white/5 dark:hover:text-slate-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip content="Eliminar producto" placement="top">
                <button
                  type="button"
                  onClick={onDelete}
                  aria-label="Eliminar"
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 sm:h-8 sm:w-8 sm:rounded-xl dark:hover:bg-red-950/40 dark:hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
