import { forwardRef, type ChangeEvent, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export interface CapitalizedInputProps
  extends InputHTMLAttributes<HTMLInputElement> {}

export const CapitalizedInput = forwardRef<
  HTMLInputElement,
  CapitalizedInputProps
>(({ className, onChange, ...props }, ref) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // Capitaliza solo la primera letra, respeta el resto
    if (val.length > 0) {
      e.target.value = val.charAt(0).toUpperCase() + val.slice(1);
    }

    onChange?.(e);
  };

  return (
    <input
      ref={ref}
      onChange={handleChange}
      className={cn(
        "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 dark:bg-[#0B1120] dark:text-slate-100 dark:placeholder:text-slate-600",
        className,
      )}
      {...props}
    />
  );
});

CapitalizedInput.displayName = "CapitalizedInput";