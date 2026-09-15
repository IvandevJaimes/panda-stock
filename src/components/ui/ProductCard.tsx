import {
  Barcode,
  Calendar,
  Layers,
  PackageX,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Tooltip } from "./Tooltip";
import { TruncatedText } from "./TruncatedText";
import { HighlightMatch } from "./HighlightMatch";
import { Button } from "./Button";
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
  variant?: string | null;
  brand?: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  expiresAt?: string;
  status?: ProductStatus;
  codigoInterno?: string;
  codigosBarras?: string;
  highlightQuery?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onOpenDetail?: () => void;
  onOpenLotes?: () => void;
  onConfirmarPerdida?: () => void;
  onAgregarInventario?: () => void;
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
  variant,
  brand,
  category,
  price,
  stock,
  minStock,
  expiresAt,
  status = "normal",
  codigoInterno,
  codigosBarras,
  highlightQuery,
  onEdit,
  onDelete,
  onOpenDetail,
  onOpenLotes,
  onConfirmarPerdida,
  onAgregarInventario,
  className,
  style,
}: ProductCardProps) {
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

  const subtitulo = brand ? `${brand} · ${category}` : category;

  const terminoConsulta = highlightQuery?.trim() ?? "";
  const codigoResaltado =
    terminoConsulta.length >= 2
      ? [codigoInterno, codigosBarras].find(
          (codigo) => codigo?.toLowerCase().includes(terminoConsulta.toLowerCase()),
        )
      : undefined;

  return (
    <div
      style={style}
      onClick={onOpenDetail}
      aria-label={name}
      className={cn(
        "w-full h-14 sm:h-16 px-3 sm:px-4 rounded-2xl cursor-pointer border transition-colors duration-150 select-none shadow-xs overflow-hidden animate-entry-up",
        "grid grid-cols-[minmax(0,1fr)_auto] min-w-0 items-center gap-3 sm:gap-4",
        statusStyles[resolvedStatus] || statusStyles.normal,
        className,
      )}
    >
      {/* 1. Izquierda: Información del producto (nombre, variante, precio, marca · categoría) */}
      <div className="flex min-w-0 flex-col justify-center">
        <div className="flex min-w-0 items-center gap-1.5">
          <TruncatedText
            text={name}
            className="min-w-0 text-xs font-bold text-slate-900 sm:text-sm dark:text-white"
          >
            <HighlightMatch text={name} query={terminoConsulta} />
          </TruncatedText>
          {variant && (
            <>
              <span
                aria-hidden
                className="shrink-0 text-slate-400 dark:text-slate-500"
              >
                ·
              </span>
              <TruncatedText
                text={variant}
                className="min-w-0 text-[11px] font-medium text-slate-500 sm:text-xs dark:text-slate-400"
              >
                <HighlightMatch text={variant} query={terminoConsulta} />
              </TruncatedText>
            </>
          )}
          {codigoResaltado && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 sm:text-xs">
              <Barcode className="h-3.5 w-3.5 opacity-70" />
              <span>
                <HighlightMatch
                  text={codigoResaltado}
                  query={terminoConsulta}
                  compact
                />
              </span>
            </span>
          )}
          <span className="shrink-0 font-display text-[11px] font-semibold text-emerald-600 sm:text-xs dark:text-emerald-400">
            ${price.toFixed(2)}
          </span>
        </div>
        <div className="mt-0.5 min-w-0">
          <TruncatedText
            text={subtitulo}
            className="text-[10px] font-medium uppercase tracking-wider text-slate-400 sm:text-xs dark:text-slate-500"
          >
            {brand ? (
              <>
                <HighlightMatch text={brand} query={terminoConsulta} />
                {category && (
                  <span aria-hidden className="shrink-0">
                    {" · "}
                    {category}
                  </span>
                )}
              </>
            ) : (
              category
            )}
          </TruncatedText>
        </div>
      </div>

      {/* 2. Derecha: métricas y acciones agrupadas */}
      <div className="flex min-w-0 items-center justify-end gap-4 sm:gap-6 md:gap-8">
        {/* Bloque de stock: número destacado + mínimo */}
        <div className="flex shrink-0 flex-col items-end justify-center gap-0.5">
          <span
            className={cn(
              "text-sm font-semibold leading-none tabular-nums",
              stock === 0
                ? "text-red-600 dark:text-red-400"
                : stock < minStock
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-900 dark:text-slate-100",
            )}
          >
            {stock}
          </span>
          {minStock > 0 && (
            <div className="mt-0.5 h-1 w-10 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/60">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  stock <= 0
                    ? "bg-red-500"
                    : stock < minStock
                      ? "bg-amber-500"
                      : "bg-emerald-500",
                )}
                style={{
                  width: `${Math.min(100, (stock / minStock) * 100)}%`,
                }}
              />
            </div>
          )}
          <span className="text-[10px] font-normal leading-none text-slate-500 dark:text-slate-400 sm:text-[11px]">
            {minStock > 0 ? `Mín. ${minStock}` : "Sin mín."}
          </span>
        </div>

        {/* Bloque de vencimiento: fecha + badge (solo cuando hay contenido visible) */}
        {(expiresAt || resolvedStatus !== "normal") && (
        <div className="flex shrink-0 items-center justify-end gap-2">
          {/* Fecha suelta: siempre visible en normal; se oculta en pantallas chicas si hay badge; se omite si está vencido (el badge ya lo comunica) */}
          {expiresAt && expiry && resolvedStatus !== "expired" && (
            <Tooltip content={expiry.relativeText} placement="top">
              <div
                className={cn(
                  "flex shrink-0 cursor-default select-none items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium sm:text-[11px]",
                  resolvedStatus !== "normal" && "hidden md:flex",
                  resolvedStatus === "expiring_soon"
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
            <span className="sr-only">Sin vencimiento</span>
          )}

          {resolvedStatus !== "normal" && (
            <Tooltip
              content={
                isExpiryBadge
                  ? `${expiry?.formattedDate} • ${expiry?.relativeText}`
                  : expiry?.relativeText
              }
              placement="top"
              disabled={resolvedStatus === "low_stock" || resolvedStatus === "out_of_stock" ? true : false}
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
          {onConfirmarPerdida && resolvedStatus === "expired" && (
            <Button
              variant="danger"
              size="sm"
              className="h-8 shrink-0 whitespace-nowrap px-2.5 py-0 text-[11px] sm:text-xs"
              icon={<PackageX className="h-3.5 w-3.5" aria-hidden />}
              onClick={(e) => {
                e.stopPropagation();
                onConfirmarPerdida();
              }}
            >
              Confirmar pérdida
            </Button>
          )}
          {onAgregarInventario && resolvedStatus === "out_of_stock" && (
            <Button
              variant="primary"
              size="sm"
              className="h-8 shrink-0 whitespace-nowrap px-2.5 py-0 text-[11px] sm:text-xs"
              icon={<Plus className="h-3.5 w-3.5" aria-hidden />}
              onClick={(e) => {
                e.stopPropagation();
                onAgregarInventario();
              }}
            >
              Agregar inventario
            </Button>
          )}
        </div>
        )}

        {/* Divisor vertical y acciones fijas en X */}
        {(onEdit || onDelete || onOpenLotes) && (
          <div className="flex shrink-0 items-center gap-0.5 border-l border-slate-200/60 pl-2 dark:border-slate-800/80">
            {onOpenLotes && (
              <Tooltip content="Ver lotes" placement="top">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenLotes?.();
                  }}
                  aria-label="Ver lotes"
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 sm:h-8 sm:w-8 sm:rounded-xl dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
                >
                  <Layers className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            )}
            {onEdit && (
              <Tooltip content="Editar producto" placement="top">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.();
                  }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.();
                  }}
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