import {
  CalendarPlus,
  CalendarSync,
  ChevronRight,
  DollarSign,
  Minus,
  PackageX,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "../../../lib/cn";
import { esLoteVencido } from "../loteHelpers";
import { formatearFecha, formatearPrecio } from "../quick-actions/formatters";
import type { Lote } from "../../../../electron/db/types";
import type { LoteQuickView } from "./types";

interface LoteQuickActionsMenuProps {
  lote: Lote;
  onNavigate: (vista: LoteQuickView) => void;
  onConfirmarPerdida?: () => void;
}

export function LoteQuickActionsMenu({
  lote,
  onNavigate,
  onConfirmarPerdida,
}: LoteQuickActionsMenuProps) {
  const loteIdentidad = lote.numeroLote ?? `Lote #${lote.id}`;
  const loteVencido = esLoteVencido(lote.fechaVence);

  return (
    <>
      <div className="mb-4">
        <h3 className="truncate font-display text-lg font-bold text-slate-900 dark:text-white">
          {loteIdentidad}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-2 dark:border-slate-800">
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Stock{" "}
            <span
              className={cn(
                "font-semibold",
                lote.cantidadActual <= 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {lote.cantidadActual} und
            </span>
          </span>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Costo{" "}
            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              {formatearPrecio(lote.costoUnitario)}
            </span>
          </span>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Vence{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {lote.fechaVence ? formatearFecha(lote.fechaVence) : "Sin vencimiento"}
            </span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => onNavigate("ajustar-stock")}
          className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
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
          className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-red-600 px-2 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-500 dark:bg-red-600 dark:hover:bg-red-500"
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

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => onNavigate("editar-vencimiento")}
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-emerald-500/50 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            {lote.fechaVence ? (
              <CalendarSync className="h-4 w-4" strokeWidth={2} aria-hidden />
            ) : (
              <CalendarPlus className="h-4 w-4" strokeWidth={2} aria-hidden />
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              {lote.fechaVence
                ? "Modificar fecha de vencimiento"
                : "Agregar fecha de vencimiento"}
            </span>
            <span className="block text-xs font-medium text-slate-400 dark:text-slate-500">
              {lote.fechaVence
                ? `Actual: ${formatearFecha(lote.fechaVence)}`
                : "Sin fecha asociada a este lote."}
            </span>
          </span>
          <ChevronRight
            className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600"
            aria-hidden
          />
        </button>

        <button
          type="button"
          onClick={() => onNavigate("editar-costo")}
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-emerald-500/50 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <DollarSign className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              Editar costo de entrada
            </span>
            <span className="block text-xs font-medium text-slate-400 dark:text-slate-500">
              Actual: {formatearPrecio(lote.costoUnitario)}
            </span>
          </span>
          <ChevronRight
            className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600"
            aria-hidden
          />
        </button>
      </div>
    </>
  );
}