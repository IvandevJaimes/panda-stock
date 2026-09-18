import { Layers } from "lucide-react";

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