import { forwardRef, type ChangeEvent, type InputHTMLAttributes } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

export type CapitalizedInputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Muestra un botón de limpieza circular SOLO cuando el input tiene contenido */
  onClear?: () => void;
};

export const CapitalizedInput = forwardRef<
  HTMLInputElement,
  CapitalizedInputProps
>(({ className, onChange, onClear, ...props }, ref) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // Capitaliza solo la primera letra, respeta el resto
    if (val.length > 0) {
      e.target.value = val.charAt(0).toUpperCase() + val.slice(1);
    }

    onChange?.(e);
  };

  const tieneContenido =
    typeof props.value === "string"
      ? props.value.length > 0
      : props.value !== undefined && props.value !== null;
  const mostrarClear = Boolean(onClear && tieneContenido);

  return (
    <div className="relative w-full">
      <input
        ref={ref}
        onChange={handleChange}
        className={cn(
          "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 dark:bg-[#0B1120] dark:text-slate-100 dark:placeholder:text-slate-600",
          mostrarClear && "pr-9",
          className,
        )}
        {...props}
      />
      {mostrarClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Limpiar campo"
          className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
});

CapitalizedInput.displayName = "CapitalizedInput";