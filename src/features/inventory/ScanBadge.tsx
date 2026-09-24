import { useEffect, useRef, useState } from "react";
import { ScanLine, X } from "lucide-react";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// ScanBadge — Badge flotante de "Escaneado".
//
// Aparece en la esquina inferior derecha (fixed, z-alto) con una animación de
// entrada (desliza desde la esquina) y, al cerrarse, de salida (se desliza de
// vuelta). El cierre lo gestiona el propio badge: anima la salida y recién
// entonces invoca onClose para que Page limpie el estado.
//
// Page lo renderiza con key={barcode}: cada código nuevo monta una instancia
// fresca (entrada animada siempre, sin estado obsoleto entre escaneos).
// ---------------------------------------------------------------------------

const EXIT_MS = 240;

type ScanBadgeProps = {
  /** Código escaneado activo (null = sin badge). */
  barcode: string | null;
  /** Se invoca AL FINALIZAR la animación de salida. */
  onClose: () => void;
};

export function ScanBadge({ barcode, onClose }: ScanBadgeProps) {
  const [saliendo, setSaliendo] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Al desmontar (otro escaneo reemplazó este código) se cancela el onClose
  // pendiente: no debe limpiar el badge del código nuevo.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const cerrar = () => {
    if (saliendo || barcode === null) return;
    setSaliendo(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onClose();
    }, EXIT_MS);
  };

  if (barcode === null) return null;

  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl border border-emerald-400/40 bg-emerald-600 py-3 pr-3 pl-4 text-white shadow-2xl shadow-emerald-900/40 select-none",
        "dark:bg-emerald-500 dark:border-emerald-300/40 dark:shadow-black/50",
        saliendo ? "animate-scan-out" : "animate-scan-in",
      )}
      role="status"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15">
        <ScanLine className="h-6 w-6" strokeWidth={2.5} />
      </span>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="text-[10px] font-bold tracking-widest text-emerald-100 uppercase">
          Producto escaneado
        </span>
        <span className="truncate font-display text-lg font-bold tracking-wide">
          {barcode}
        </span>
      </div>
      <button
        type="button"
        onClick={cerrar}
        aria-label="Salir del filtro escaneado"
        className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-xl transition-colors hover:bg-white/20 active:scale-95"
      >
        <X className="h-5 w-5" strokeWidth={2.5} />
      </button>
    </div>
  );
}