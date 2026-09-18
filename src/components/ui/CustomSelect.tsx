import * as React from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { cn } from "../../lib/cn";

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface CustomSelectProps {
  options: SelectOption[];
  value?: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  buttonClassName?: string;
  footerLabel?: string;
  onFooterClick?: () => void;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  disabled = false,
  error = false,
  className,
  buttonClassName,
  footerLabel,
  onFooterClick,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const selectedRef = React.useRef<HTMLButtonElement | null>(null);

  // Al abrir el dropdown, hace scroll hacia la opción seleccionada para que
  // quede visible dentro del listado. Es un side-effect de DOM (no setState).
  React.useEffect(() => {
    if (isOpen) {
      selectedRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [isOpen]);

  // Cerrar al hacer clic fuera del componente. El setState vive dentro del callback
  // del listener (asíncrono), por lo que no viola react-hooks/set-state-in-effect.
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "flex h-10 w-full cursor-pointer items-center justify-between rounded-xl border bg-white px-3 text-left text-sm transition-all outline-none dark:bg-[#0B1120]",
          error
            ? "border-red-500 focus:ring-4 focus:ring-red-500/10"
            : "border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700/80 dark:hover:border-slate-600",
          isOpen && !error && "border-emerald-500 ring-4 ring-emerald-500/10",
          disabled && "cursor-not-allowed opacity-60",
          !selectedOption && "text-slate-400 dark:text-slate-600",
          buttonClassName,
        )}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "ml-2 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-[100] w-full animate-entry-up overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#0B1120]"
        >
          <div className="max-h-56 w-full overflow-y-auto py-1.5">
            {options.length === 0 ? (
              <div className="px-3 py-3 text-center text-sm text-slate-500 dark:text-slate-400">
                No hay opciones disponibles
              </div>
            ) : (
              options.map((option) => {
                const estaSeleccionado = String(option.value) === String(value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={estaSeleccionado}
                    ref={estaSeleccionado ? selectedRef : undefined}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm transition-colors",
                      estaSeleccionado
                        ? "bg-emerald-50 font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60",
                    )}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                  >
                    <span className="truncate">{option.label}</span>
                    {estaSeleccionado && (
                      <Check className="ml-2 h-4 w-4 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
          {footerLabel && onFooterClick && (
            <button
              type="button"
              onClick={() => {
                onFooterClick();
                setIsOpen(false);
              }}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 border-t border-slate-100 px-3 py-2.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 dark:border-slate-700/60 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {footerLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}