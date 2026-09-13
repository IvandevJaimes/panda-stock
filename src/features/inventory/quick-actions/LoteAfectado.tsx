import { Layers } from "lucide-react";
import { cn } from "../../../lib/cn";
import type { Lote } from "../../../../electron/db/types";
import { tintPanelLote } from "../loteHelpers";

interface LoteAfectadoProps {
  lote: Lote | null;
}

export function PanelLoteAfectado({ lote }: LoteAfectadoProps) {
  const identidad = lote
    ? (lote.numeroLote ?? `Lote #${lote.id}`)
    : "Sin lote activo";
  const tint = tintPanelLote(lote?.fechaVence ?? null);

  return (
    <div className={cn("rounded-xl border p-3", tint)}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Lote que se verá afectado
      </p>
      <p className="mt-1 font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
        {identidad}
      </p>
    </div>
  );
}

interface BotonGestionarLotesProps {
  onOpenLotes: () => void;
}

export function BotonGestionarLotes({ onOpenLotes }: BotonGestionarLotesProps) {
  return (
    <button
      type="button"
      onClick={onOpenLotes}
      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
    >
      <Layers className="h-4 w-4" aria-hidden />
      Gestionar lotes
    </button>
  );
}