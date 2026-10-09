/* eslint-disable react-refresh/only-export-components */
// ─── StockAlert ──────────────────────────────────────────────
// API pública para mostrar alertas de inventario.
// Usa sonner con toasterId="stock" — el Toaster independiente
// en App.tsx se encarga del render, stacking y hover.
// ─────────────────────────────────────────────────────────────

import { toast } from "sonner";
import type { JSX } from "react";
import { differenceInCalendarDays } from "date-fns";
import { AlertCircle, AlertTriangle, Skull, Clock, X } from "lucide-react";
import Tooltip from "../tooltip/Tooltip";
import { formatISODate, parseISO } from "../../../utils/dates";


// ─── Tipos ───────────────────────────────────────────────────

type StockAlertType = "stockout" | "lowStock" | "expired" | "nearExpiry";

export interface IngredientBadge {
  name: string;
  /** Stock restante después de la venta (solo para Stock bajo) */
  remaining?: number;
  /** Unidad base del ingrediente */
  unit?: string;
  /** Fecha de vencimiento (solo para alertas de vencimiento) */
  expiryDate?: string;
}

interface StockToastProps {
  type: StockAlertType;
  title: string;
  items: IngredientBadge[];
  toastId: string | number;
}

function AlertIcon({ type }: { type: StockAlertType }) {
  switch (type) {
    case "stockout":
      return <AlertCircle className="w-5 h-5" />;
    case "lowStock":
      return <AlertTriangle className="w-5 h-5" />;
    case "expired":
      return <Skull className="w-5 h-5" />;
    case "nearExpiry":
      return <Clock className="w-5 h-5" />;
  }
}

const BG: Record<StockAlertType, string> = {
  stockout: " bg-red-600",
  lowStock: " bg-amber-500",
  expired: " bg-red-600",
  nearExpiry: " bg-amber-500",
};

const BORDER: Record<StockAlertType, string> = {
  stockout: "border-red-400",
  lowStock: "border-amber-400",
  expired: "border-red-400",
  nearExpiry: "border-amber-400",
};

const BADGE_BASE =
  "font-bold inline-block bg-black/30 mt-0.5 text-white rounded-full px-2.5 py-0.5 text-[11px] leading-tight font-medium";

// ─── Tooltip helpers ────────────────────────────────────────

function unitLabel(unit?: string): string {
  if (!unit) return "";
  return unit === "unidad" ? "und" : unit;
}

function getBadgeTooltip(
  type: StockAlertType,
  item: IngredientBadge,
): JSX.Element | null {
  switch (type) {
    case "lowStock":
      if (item.remaining === undefined) return null;
      return (
        <div className="flex items-center gap-0.5">
          <span className="text-[12px] dark:text-gray-200 text-gray-600 whitespace-nowrap">
            Quedan:
          </span>
          <span className="font-semibold text-xs whitespace-nowrap leading-tight">
            {item.remaining} {unitLabel(item.unit)}
          </span>
        </div>
      );
    case "nearExpiry": {
      if (!item.expiryDate) return null;
      const expiry = parseISO(item.expiryDate);
      if (!expiry) return null;
      const days = differenceInCalendarDays(expiry, new Date());
      const text =
        days <= 0 ? "Vence hoy" : days === 1 ? "Vence mañana" : `Vence en ${days} días`;
      return (
        <span className="text-xs font-semibold whitespace-nowrap">{text}</span>
      );
    }
    case "expired":
      return (
        <div className="flex items-center gap-0.5">
          <span className="text-[12px] dark:text-gray-200 text-gray-600 whitespace-nowrap">
            Vencido desde:
          </span>
          <span className="font-semibold text-xs whitespace-nowrap leading-tight">
            {formatISODate(item.expiryDate)}
          </span>
        </div>
      );
    case "stockout":
      return (
        <span className="text-xs font-semibold whitespace-nowrap">
          Sin stock disponible
        </span>
      );
  }
}

// ─── Componente del toast ────────────────────────────────────

const MAX_BADGES = 6;

function StockToast({
  type,
  title,
  items,
  toastId,
}: StockToastProps): JSX.Element {
  const visible = items.slice(0, MAX_BADGES);
  const rest = items.length - MAX_BADGES;

  return (
    <div
      className={`
        flex gap-2 pr-2  w-[380px]
        ${BG[type]}
        backdrop-blur-md rounded-lg
        border ${BORDER[type]}
        shadow-lg
        cursor-pointer select-none
        
      `}
      onClick={() => {
        toast.dismiss(toastId);
        window.dispatchEvent(new Event("open-notifications"));
      }}
      role="alert"
    >
      {/* Content */}
      {/* Icon */}
      <span className="text-white rounded-l-lg flex justify-center items-center bg-black/20 px-2">
        <AlertIcon type={type} />
      </span>
      <div className="flex min-w-0 py-3">
        <div className="flex items-center flex-wrap items-center gap-x-1 gap-y-1">
          <span className="font-semibold text-sm text-white whitespace-nowrap">
            {title}:
          </span>
          {visible.map((item) => {
            const tooltip = getBadgeTooltip(type, item);
            if (tooltip) {
              return (
                <Tooltip
                  key={item.name}
                  zIndex={9999999999}
                  delay={0}
                  content={tooltip}
                  placement="top"
                >
                  <span className={BADGE_BASE}>{item.name}</span>
                </Tooltip>
              );
            }
            return (
              <span key={item.name} className={BADGE_BASE}>
                {item.name}
              </span>
            );
          })}
          {rest > 0 && (
            <span className={`${BADGE_BASE} text-white/70`}>+{rest}</span>
          )}
        </div>

      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toast.dismiss(toastId);
        }}
        className="absolute top-1 right-1 flex-shrink-0 text-white hover:text-neutral-300 transition-colors cursor-pointer"
        aria-label="Cerrar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── API pública ─────────────────────────────────────────────

function show(type: StockAlertType, title: string, items: IngredientBadge[]) {
  toast.custom(
    (t) => <StockToast type={type} title={title} items={items} toastId={t} />,
    {
      toasterId: "stock",
      position: "top-center",
      duration: 6000,
    },
  );
}

/** Stock bajo → ámbar */
export const showStockAlert = (title: string, items: IngredientBadge[]) => {
  show("lowStock", title, items);
};

/** Sin stock → rojo */
export const showStockoutAlert = (title: string, items: IngredientBadge[]) => {
  show("stockout", title, items);
};

/** Vencidos → rojo */
export const showExpiredAlert = (title: string, items: IngredientBadge[]) => {
  show("expired", title, items);
};

/** Por vencer → ámbar */
export const showNearExpiryAlert = (title: string, items: IngredientBadge[]) => {
  show("nearExpiry", title, items);
};
