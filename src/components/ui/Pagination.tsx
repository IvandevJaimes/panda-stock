import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** Mantiene el paginador visible aunque haya una sola página: queda bloqueado
   *  (todos los controles inertes) en lugar de desaparecer. La grilla principal
   *  lo deja en false: sin paginación real, sin paginador. */
  alwaysVisible?: boolean;
};

function generarPaginas(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const paginas: (number | "...")[] = [1];
  const inicial = Math.max(2, currentPage - 1);
  const final = Math.min(totalPages - 1, currentPage + 1);

  if (inicial > 2) paginas.push("...");
  for (let p = inicial; p <= final; p++) paginas.push(p);
  if (final < totalPages - 1) paginas.push("...");
  paginas.push(totalPages);

  return paginas;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  alwaysVisible = false,
}: PaginationProps) {
  // Sin paginación real el paginador desaparece, salvo que se pida siempre
  // visible: en ese caso se muestra con una única página y todo inerte.
  const bloqueado = totalPages <= 1;
  if (bloqueado && !alwaysVisible) return null;

  const paginaActual = bloqueado ? 1 : currentPage;
  const paginas = generarPaginas(paginaActual, bloqueado ? 1 : totalPages);

  return (
    <nav
      aria-label="Paginación"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      <button
        type="button"
        onClick={() => onPageChange(paginaActual - 1)}
        disabled={bloqueado || paginaActual === 1}
        aria-label="Página anterior"
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {paginas.map((pagina, idx) =>
        pagina === "..." ? (
          <span
            key={`ellipsis-${idx}`}
            className="select-none px-1 text-sm text-slate-400 dark:text-slate-500"
          >
            …
          </span>
        ) : (
          <button
            key={pagina}
            type="button"
            onClick={() => onPageChange(pagina)}
            disabled={bloqueado}
            aria-current={pagina === paginaActual ? "page" : undefined}
            className={cn(
              "h-8 min-w-8 rounded-lg px-2 text-sm font-semibold transition-colors duration-150",
              bloqueado
                ? "cursor-not-allowed text-slate-400 dark:text-slate-600"
                : pagina === paginaActual
                  ? "cursor-pointer bg-emerald-600 text-white dark:bg-emerald-500"
                  : "cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
            )}
          >
            {pagina}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(paginaActual + 1)}
        disabled={bloqueado || paginaActual === totalPages}
        aria-label="Página siguiente"
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}