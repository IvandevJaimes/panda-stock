import { Pencil, Trash2 } from "lucide-react";
import { cn } from "../../lib/cn";
import { Tooltip } from "./Tooltip";

export type PillProps = {
  label: string;
  active?: boolean;
  showActions?: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
  /** Cantidad de productos asociados. Si se define, se muestra un badge numérico. */
  count?: number;
};

export function Pill({
  label,
  active = false,
  showActions = true,
  onSelect,
  onEdit,
  onDelete,
  className,
  count,
}: PillProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onMouseEnter={(e) => {
        e.currentTarget.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-pressed={active}
      className={cn(
        "group relative flex h-8 w-fit shrink-0 cursor-pointer select-none items-center rounded-full border px-3 text-xs font-semibold transition-all duration-200 whitespace-nowrap",
        active
          ? "bg-emerald-500 text-white border-emerald-500 shadow-xs dark:bg-emerald-600 dark:border-emerald-600"
          : "bg-slate-100 text-slate-600 border-slate-200/80 hover:bg-slate-200/70 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/60 dark:hover:bg-slate-700/80",
        className,
      )}
    >
      <span className="whitespace-nowrap">{label}</span>

      {count !== undefined && (
        <span
          className={cn(
            "ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold transition-colors leading-none",
            active
              ? "bg-emerald-400/50 text-emerald-50"
              : "bg-slate-200/80 text-slate-500 group-hover:bg-slate-300/80 dark:bg-slate-700/80 dark:text-slate-400 dark:group-hover:bg-slate-600/80",
          )}
        >
          {count}
        </span>
      )}

      {showActions && (
        <div className="flex items-center gap-2 max-w-0 overflow-hidden   opacity-0 transition-all duration-200 ease-out group-hover:ml-1.5 group-hover:max-w-16 group-hover:opacity-100">
          <Tooltip content="Editar" placement="top">
            <button
              type="button"
              aria-label={`Editar ${label}`}
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className={cn(
                "p-1 rounded-full transition-colors cursor-pointer",
                active
                  ? "text-slate-300 hover:text-white"
                  : " text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
              )}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Eliminar" placement="top">
            <button
              type="button"
              aria-label={`Eliminar ${label}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className={cn(
                "p-1 rounded-full transition-colors cursor-pointer hover:text-red-600 dark:hover:text-red-400",
                active ? "text-slate-200" : "text-slate-400",
              )}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
