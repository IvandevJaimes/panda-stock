import {
  Barcode,
  ChevronRight,
  DollarSign,
  Layers,
  Minus,
  Pencil,
  Plus,
  SlidersHorizontal,
  Tags,
} from "lucide-react";
import { cn } from "../../../lib/cn";
import type { Producto } from "../../../../electron/db/types";
import { formatearCodigo, formatearPrecio } from "./formatters";
import type { QuickActionView } from "./types";

interface QuickActionsMenuProps {
  producto: Producto;
  marcaNombre: string;
  categoriaNombre: string;
  loteIdentidad: string | null;
  lotesCargando: boolean;
  tieneLoteActivo: boolean;
  onNavigate: (vista: QuickActionView) => void;
  onFullEdit: () => void;
  onOpenLotes: () => void;
}

export function QuickActionsMenu({
  producto,
  marcaNombre,
  categoriaNombre,
  loteIdentidad,
  lotesCargando,
  tieneLoteActivo,
  onNavigate,
  onFullEdit,
  onOpenLotes,
}: QuickActionsMenuProps) {
  const precioMayoreo = producto.precioVenta > 0 ? producto.precioVenta * 0.9 : null;
  const loteIndisponible = lotesCargando || !tieneLoteActivo;

  return (
    <>
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {producto.nombre}
          {producto.variante && (
            <span className="ml-1.5 font-normal text-slate-400 dark:text-slate-500">
              · {producto.variante}
            </span>
          )}
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
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Precio{" "}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {formatearPrecio(producto.precioVenta)}
            </span>
            {precioMayoreo !== null && (
              <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">
                / {formatearPrecio(precioMayoreo)} mayoreo
              </span>
            )}
          </span>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Stock{" "}
            <span
              className={cn(
                "font-semibold",
                producto.stockActual <= 0
                  ? "text-red-600 dark:text-red-400"
                  : producto.stockActual <= producto.stockMinimo
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {producto.stockActual}
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
          onClick={() => onNavigate("registrar-perdida")}
          aria-disabled={loteIndisponible}
          className={cn(
            "flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-red-600 px-2 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors dark:bg-red-600",
            loteIndisponible
              ? "cursor-not-allowed opacity-40 dark:opacity-40"
              : "hover:bg-red-500",
          )}
        >
          <Minus className="h-3.5 w-3.5" aria-hidden />
          Registrar pérdida
        </button>
      </div>

      <hr className="my-4 border-slate-200 dark:border-slate-800" />

      <div className="flex flex-col gap-3">
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
      </div>

      <hr className="my-4 border-slate-200 dark:border-slate-800" />

      <button
        type="button"
        onClick={onFullEdit}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Pencil className="h-4 w-4" aria-hidden />
        Editar toda la información del producto
      </button>

      <button
        type="button"
        onClick={onOpenLotes}
        className="mt-3 flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition-all hover:bg-emerald-50 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-emerald-400 dark:hover:bg-slate-700/80 dark:hover:text-emerald-300"
      >
        <span className="flex items-center gap-2">
          <Layers className="h-4 w-4" aria-hidden />
          Gestionar / Editar Lotes
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors dark:text-slate-400">
          Ver vencimientos y partidas
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </button>
    </>
  );
}