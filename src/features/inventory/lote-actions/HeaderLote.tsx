import { ArrowLeft } from "lucide-react";
import { Tooltip } from "../../../components/ui/Tooltip";
import { formatearPrecio } from "../quick-actions/formatters";
import type { Lote } from "../../../../electron/db/types";

interface HeaderLoteProps {
  lote: Lote;
  titulo: string;
  onBack: () => void;
  esLoteActivo?: boolean;
}

export function HeaderLote({
  lote,
  titulo,
  onBack,
  esLoteActivo = false,
}: HeaderLoteProps) {
  const identidad = lote.numeroLote ?? `Lote #${lote.id}`;

  return (
    <>
      <div className="mb-3 flex items-center gap-3">
        <Tooltip content="Volver al menú de acciones" placement="right">
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver"
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Tooltip>
        <h3 className="min-w-0 truncate font-display text-lg font-bold text-slate-900 dark:text-white">
          {titulo}
        </h3>
      </div>
      <div className="mb-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="truncate font-mono text-sm font-bold text-slate-900 dark:text-white">
              {identidad}
            </h4>
            <div className="truncate text-xs text-slate-500">
              Stock en lote:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {lote.cantidadActual} und
              </span>{" "}
              | Costo:{" "}
              <span className="font-mono">
                {formatearPrecio(lote.costoUnitario)}
              </span>
            </div>
          </div>
          {esLoteActivo && (
            <span className="shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Lote activo
            </span>
          )}
        </div>
      </div>
    </>
  );
}