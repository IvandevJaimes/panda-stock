import { Check } from "lucide-react";
import { cn } from "../../lib/cn";

export interface OptionGroupOption<T extends string | number> {
  value: T;
  label: string;
}

export interface OptionGroupProps<T extends string | number> {
  options: OptionGroupOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  error?: boolean;
  disabled?: boolean;
  className?: string;
}

export function OptionGroup<T extends string | number>({
  options,
  value,
  onChange,
  label,
  error = false,
  disabled = false,
  className,
}: OptionGroupProps<T>) {
  return (
    <div
      role="group"
      className={cn(
        "flex flex-row flex-wrap items-center gap-x-6 gap-y-3 rounded-xl",
        error && "border border-red-500/60 p-2",
        className,
      )}
    >
      {label && (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
          {error && <span className="ml-0.5 text-red-500">*</span>}
        </span>
      )}

      {options.map((opcion) => {
        const activo = String(opcion.value) === String(value);
        return (
          <button
            key={String(opcion.value)}
            type="button"
            disabled={disabled}
            aria-pressed={activo}
            onClick={() => onChange(opcion.value)}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-xl py-0.5 select-none transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              activo
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 transition-colors",
                activo
                  ? "border-emerald-500 bg-emerald-500"
                  : "border-slate-300 bg-white dark:border-slate-600 dark:bg-[#0B1120]",
              )}
            >
              {activo && (
                <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />
              )}
            </span>
            <span className="text-sm font-medium">{opcion.label}</span>
          </button>
        );
      })}
    </div>
  );
}