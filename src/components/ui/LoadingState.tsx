import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

export interface LoadingStateProps {
  /** Texto de carga, ej. "Cargando punto de venta...". */
  title: string;
  description?: string;
  className?: string;
  /**
   * Ocupa toda la superficie disponible en vez de solo su contenido. Se usa
   * cuando la carga reemplaza la página entera y no una región: sin esto el
   * spinner queda flotando en una franja de 200px sobre el resto de la UI ya
   * visible, que se lee como "colgado" y no como "cargando".
   */
  fullPage?: boolean;
}

/**
 * Estado de carga para grids y páginas: spinner grande animado + título. El
 * título va en `role="status"` para que un lector de pantalla lo anuncie al
 * aparecer, en lugar de dejar solo un ícono decorativo girando.
 */
export function LoadingState({
  title,
  description,
  className,
  fullPage = false,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-4 p-8 text-center md:p-12",
        // `min-h` gana sobre un `h-full` demasiado chico, así que el par cubre
        // tanto contenedores con altura definida (POS) como los que no (Inventario).
        fullPage && "h-full min-h-[70vh]",
        className,
      )}
    >
      <Loader2
        className="h-14 w-14 animate-spin text-emerald-500"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-1.5">
        <p
          role="status"
          className="font-display text-lg font-semibold text-slate-700 dark:text-slate-300"
        >
          {title}
        </p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
