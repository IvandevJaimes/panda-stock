import {
  Barcode,
  DollarSign,
  Minus,
  PackageX,
  Pencil,
  Plus,
  SlidersHorizontal,
  Tags,
  AlertCircle,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "../../../lib/cn";
import { evaluateExpiry } from "../../../lib/dateUtils";
import type { Producto } from "../../../../electron/db/types";
import { formatearCodigo, formatearPrecio } from "./formatters";
import { Tooltip } from "../../../components/ui/Tooltip";
import { BotonGestionarLotes } from "./BotonGestionarLotes";
import type { QuickActionView } from "./types";

type EstadoProducto =
  | "expired"
  | "out_of_stock"
  | "low_stock"
  | "expiring_soon"
  | "normal";

const estadoInfo: Record<
  Exclude<EstadoProducto, "normal">,
  { label: string; badge: string }
> = {
  expired: {
    label: "Vencido",
    badge:
      "bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300 border border-red-200/90 dark:border-red-900/50",
  },
  out_of_stock: {
    label: "Agotado",
    badge:
      "bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300 border border-red-200/90 dark:border-red-900/50",
  },
  low_stock: {
    label: "Stock bajo",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50",
  },
  expiring_soon: {
    label: "Por vencer",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50",
  },
};

function derivarEstado(
  producto: Producto,
  loteVencido: boolean,
  lotePorVencer: boolean,
): EstadoProducto {
  if (loteVencido) return "expired";
  if (lotePorVencer) return "expiring_soon";
  if (producto.stockActual <= 0) return "out_of_stock";
  if (producto.stockActual < producto.stockMinimo) return "low_stock";
  return "normal";
}

interface QuickActionsMenuProps {
  producto: Producto;
  marcaNombre: string;
  categoriaNombre: string;
  loteIdentidad: string | null;
  lotesCargando: boolean;
  tieneLoteActivo: boolean;
  loteVencido: boolean;
  loteActivoPorVencer: boolean;
  loteFechaVence: string | null;
  onNavigate: (vista: QuickActionView) => void;
  onConfirmarPerdida?: () => void;
  onOpenLotes: () => void;
}

export function QuickActionsMenu({
  producto,
  marcaNombre,
  categoriaNombre,
  loteIdentidad,
  lotesCargando,
  tieneLoteActivo,
  loteVencido,
  loteActivoPorVencer,
  loteFechaVence,
  onNavigate,
  onConfirmarPerdida,
  onOpenLotes,
}: QuickActionsMenuProps) {
  const loteIndisponible = lotesCargando || !tieneLoteActivo;

  const margenDelta = producto.precioVenta - producto.costo;
  const esGanancia = margenDelta > 0;
  const margenPorcentaje =
    producto.costo > 0 ? (margenDelta / producto.costo) * 100 : null;
  const margenTooltip = `Margen: ${
    margenPorcentaje !== null
      ? `${margenPorcentaje.toFixed(1).replace(/\.0$/, "")}%`
      : "—"
  } · ${margenDelta > 0 ? "+" : ""}$${margenDelta.toFixed(2)}`;

  const estado = derivarEstado(producto, loteVencido, loteActivoPorVencer);
  const infoEstado = estado !== "normal" ? estadoInfo[estado] : null;
  const expiry = loteFechaVence ? evaluateExpiry(loteFechaVence) : null;
  const esVencimientoBadge =
    estado === "expired" || estado === "expiring_soon";

  const badgeElement = infoEstado ? (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide",
        infoEstado.badge,
      )}
    >
      {infoEstado.label}
    </span>
  ) : null;

  return (
    <>
      <div className="mb-4">
        <h3 className="flex flex-wrap items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
          <span>{producto.nombre}</span>
          {producto.variante && (
            <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">
              · {producto.variante}
            </span>
          )}
          {badgeElement &&
            (esVencimientoBadge && expiry ? (
              <Tooltip
                content={`${expiry.formattedDate} • ${expiry.relativeText}`}
                placement="top"
              >
                {badgeElement}
              </Tooltip>
            ) : (
              badgeElement
            ))}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {marcaNombre && (
            <>
              <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                {marcaNombre}
              </span>
              <span className="text-slate-300 dark:text-slate-600" aria-hidden>
                ·
              </span>
            </>
          )}
          {categoriaNombre && (
            <>
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {categoriaNombre}
              </span>
              <span className="text-slate-300 dark:text-slate-600" aria-hidden>
                ·
              </span>
            </>
          )}
          <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
            {formatearCodigo(producto.codigoInterno || producto.codigosBarras)}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-2 dark:border-slate-800">
          <span className="inline-flex items-center gap-1 text-xs font-medium leading-none text-slate-400 dark:text-slate-500">
            Precio
            <Tooltip content={margenTooltip} placement="top">
              <span className="inline-flex shrink-0 items-center gap-1 align-middle">
                {esGanancia ? (
                  <TrendingUp
                    className="h-3 w-3 shrink-0 align-middle text-emerald-600 dark:text-emerald-400"
                    aria-hidden
                  />
                ) : (
                  <TrendingDown
                    className="h-3 w-3 shrink-0 align-middle text-red-600 dark:text-red-400"
                    aria-hidden
                  />
                )}
                <span
                  className={cn(
                    "font-semibold leading-none",
                    esGanancia
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400",
                  )}
                >
                  {formatearPrecio(producto.precioVenta)}
                </span>
              </span>
            </Tooltip>
          </span>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Stock{" "}
            <span
              className={cn(
                "font-semibold",
                producto.stockActual <= 0
                  ? "text-red-600 dark:text-red-400"
                  : producto.stockActual < producto.stockMinimo
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {producto.stockActual} und
            </span>
          </span>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Lote{" "}
            {lotesCargando ? (
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                cargando…
              </span>
            ) : (
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                {loteIdentidad ?? "Sin lote"}
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => onNavigate("agregar-inventario")}
          className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Agregar Inventario
        </button>
        <button
          type="button"
          onClick={() => onNavigate("ajustar-stock")}
          aria-disabled={loteIndisponible}
          disabled={loteIndisponible}
          className={cn(
            "flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-xs font-medium text-slate-700 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
            loteIndisponible
              ? "cursor-not-allowed opacity-40 dark:opacity-40"
              : "hover:bg-slate-50 dark:hover:bg-slate-700",
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          Ajustar stock
        </button>
        <button
          type="button"
          onClick={() =>
            loteVencido
              ? onConfirmarPerdida?.()
              : onNavigate("registrar-perdida")
          }
          aria-disabled={loteIndisponible}
          disabled={loteIndisponible}
          className={cn(
            "flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-red-600 px-2 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors dark:bg-red-600",
            loteIndisponible
              ? "cursor-not-allowed opacity-40 dark:opacity-40"
              : "hover:bg-red-500",
          )}
        >
          {loteVencido ? (
            <PackageX className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Minus className="h-3.5 w-3.5" aria-hidden />
          )}
          {loteVencido ? "Confirmar pérdida" : "Registrar merma"}
        </button>
      </div>

      <hr className="my-4 border-slate-200 dark:border-slate-800" />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onNavigate("precio-venta")}
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-emerald-500/50 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <DollarSign className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              Modificar Precio de Venta
            </span>
            <span className="block text-xs font-medium text-slate-400 dark:text-slate-500">
              Editar solo el precio unitario de venta.
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("editar-codigo")}
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-emerald-500/50 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <Barcode className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              Editar Código
            </span>
            <span className="block text-xs font-medium text-slate-400 dark:text-slate-500">
              Cambiar código interno o códigos de barras.
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("variante-detalle")}
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-emerald-500/50 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Tags className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              Editar Variante / Detalle
            </span>
            <span className="block text-xs font-medium text-slate-400 dark:text-slate-500">
              Modificar la variante o detalle del producto.
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("stock-minimo")}
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-amber-500/50 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              {producto.stockMinimo === 0 ? "Agregar stock minimo" : "Editar stock minimo"}
              
            </span>
            <span className="block text-xs font-medium text-slate-400 dark:text-slate-500">
              Ingresar o editar stock minimo para las alertas
            </span>
          </span>
        </button>
      </div>

      <hr className="my-4 border-slate-200 dark:border-slate-800" />

      <button
        type="button"
        onClick={() => onNavigate("editar-producto")}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Pencil className="h-4 w-4" aria-hidden />
        Editar toda la información del producto
      </button>

      <div className="mt-3">
        <BotonGestionarLotes onOpenLotes={onOpenLotes} />
      </div>
    </>
  );
}
