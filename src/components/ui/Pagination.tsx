import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
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
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const paginas = generarPaginas(currentPage, totalPages);

  return (
    <nav
      aria-label="Paginación"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
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
            aria-current={pagina === currentPage ? "page" : undefined}
            className={cn(
              "h-8 min-w-8 cursor-pointer rounded-lg px-2 text-sm font-semibold transition-colors duration-150",
              pagina === currentPage
                ? "bg-emerald-600 text-white dark:bg-emerald-500"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
            )}
          >
            {pagina}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Página siguiente"
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}