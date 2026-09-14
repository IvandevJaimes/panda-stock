import * as React from "react";
import { createPortal } from "react-dom";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { es } from "date-fns/locale";
import { cn } from "../../lib/cn";

export interface DateInputProps {
  value?: string | null;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  id?: string;
  name?: string;
  placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end";
}

interface PopoverCoords {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

/**
 * Calcula la posición del popover respecto al VIEWPORT (el popover se renderiza
 * vía portal en document.body con position fixed). Así escapa del clipping de
 * cualquier contenedor con overflow (modales, scroll containers) y no queda
 * tapado por elementos que vienen después en el DOM (header/footer del modal).
 */
function computePopoverCoords(
  inputRect: DOMRect,
  placement: NonNullable<DateInputProps["placement"]>,
): PopoverCoords {
  const gap = 6;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  const right = viewportW - inputRect.right;
  const left = inputRect.left;
  const top = inputRect.bottom + gap;
  const bottom = viewportH - inputRect.top + gap;

  switch (placement) {
    case "bottom-end":
      return { top, right };
    case "bottom-start":
      return { top, left };
    case "top-end":
      return { bottom, right };
    case "top-start":
      return { bottom, left };
  }
}

function isoToDisplay(iso: string): string {
  if (!iso) return "";
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(iso)) {
    return iso;
  }
  return "";
}

function displayToIso(display: string): string {
  // Acepta DD/MM/YYYY (8 dígitos) y DD/MM/YY (6 dígitos, año expandido a 20XX)
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);
  if (match) {
    const [, d, m, yRaw] = match;
    const day = parseInt(d, 10);
    const month = parseInt(m, 10);
    const year = yRaw.length === 2 ? 2000 + parseInt(yRaw, 10) : parseInt(yRaw, 10);

    if (
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31 &&
      year >= 1900 &&
      year <= 2100
    ) {
      const date = new Date(year, month - 1, day);
      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        return `${year}-${m}-${d}`;
      }
    }
  }
  return "";
}

function formatDigits(digits: string, isDeleting: boolean): string {
  if (digits.length === 0) return "";
  if (digits.length < 2) return digits;
  if (digits.length === 2) return isDeleting ? digits : `${digits}/`;
  if (digits.length < 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  if (digits.length === 4) {
    return isDeleting
      ? `${digits.slice(0, 2)}/${digits.slice(2)}`
      : `${digits.slice(0, 2)}/${digits.slice(2)}/`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseToDate(val: string): Date | undefined {
  if (!val) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? undefined : date;
  }
  const match = val.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);
  if (match) {
    const [, d, m, yRaw] = match;
    const y = yRaw.length === 2 ? 2000 + parseInt(yRaw, 10) : parseInt(yRaw, 10);
    const date = new Date(y, parseInt(m, 10) - 1, parseInt(d, 10));
    return isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      value,
      onChange,
      placeholder = "DD/MM/YYYY",
      disabled = false,
      error = false,
      className,
      id,
      name,
      placement = "bottom-start",
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [coords, setCoords] = React.useState<PopoverCoords | null>(null);
    const popoverRef = React.useRef<HTMLDivElement | null>(null);
    const [displayValue, setDisplayValue] = React.useState(() =>
      isoToDisplay(value || ""),
    );

    const containerRef = React.useRef<HTMLDivElement>(null);
    const internalInputRef = React.useRef<HTMLInputElement | null>(null);
    const isDeletingRef = React.useRef(false);
    const lastSyncedValueRef = React.useRef(value);

    // Sincronizar con cambios externos de la prop `value`
    React.useEffect(() => {
      if (value !== lastSyncedValueRef.current) {
        lastSyncedValueRef.current = value;
        setDisplayValue(isoToDisplay(value || ""));
      }
    }, [value]);

    // Combinar refs externo e interno
    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        internalInputRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    // Cierre por clic fuera o tecla Escape
    React.useEffect(() => {
      if (!isOpen) return;

      function handleClickOutside(event: MouseEvent) {
        const target = event.target as Node;
        const dentroInput = containerRef.current?.contains(target) ?? false;
        const dentroPopover = popoverRef.current?.contains(target) ?? false;
        if (!dentroInput && !dentroPopover) {
          setIsOpen(false);
        }
      }

      function handleEscapeKey(event: KeyboardEvent) {
        if (event.key === "Escape") {
          setIsOpen(false);
        }
      }

      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscapeKey);
      };
    }, [isOpen]);

    // Reposiciona el popover (portal al body) si el input se mueve por scroll/resize.
    React.useEffect(() => {
      if (!isOpen) return;

      const recompute = () => {
        const rect = internalInputRef.current?.getBoundingClientRect();
        if (rect) setCoords(computePopoverCoords(rect, placement));
      };

      recompute();
      window.addEventListener("resize", recompute);
      window.addEventListener("scroll", recompute, true); // capture: scroll de cualquier ancestro
      return () => {
        window.removeEventListener("resize", recompute);
        window.removeEventListener("scroll", recompute, true);
      };
    }, [isOpen, placement]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }

      if (e.key === "Backspace") {
        isDeletingRef.current = true;
        const input = e.currentTarget;
        const { selectionStart, selectionEnd } = input;

        // Si el cursor está justo después de una barra ('DD/' o 'DD/MM/')
        if (selectionStart === selectionEnd && selectionStart !== null) {
          if (selectionStart === 3 || selectionStart === 6) {
            e.preventDefault();
            const cleanDigits = displayValue.replace(/\D/g, "");
            const targetLen = selectionStart === 3 ? 1 : 3;
            const newDigits = cleanDigits.slice(0, targetLen);
            const formatted =
              newDigits.length <= 2
                ? newDigits
                : `${newDigits.slice(0, 2)}/${newDigits.slice(2)}`;

            setDisplayValue(formatted);
            const iso = displayToIso(formatted);
            lastSyncedValueRef.current = iso;
            onChange?.(iso);
            return;
          }
        }
        return;
      }

      isDeletingRef.current = false;

      // Permitir únicamente caracteres numéricos y teclas de control del sistema
      if (
        e.key.length === 1 &&
        !/\d/.test(e.key) &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const digits = raw.replace(/\D/g, "").slice(0, 8);
      const formatted = formatDigits(digits, isDeletingRef.current);

      setDisplayValue(formatted);

      // Emitir SIEMPRE el valor efectivo (ISO válido o "") cuando cambia.
      // Si solo se emitiera con 8 dígitos completos, el form podía quedar
      // desincronizado respecto de lo visible y la fecha se perdía al enviar
      // (vencimiento llegaba vacío a la BD aunque el campo mostraba la fecha).
      const iso = displayToIso(formatted);
      if (iso !== lastSyncedValueRef.current) {
        lastSyncedValueRef.current = iso;
        onChange?.(iso);
      }
    };

    const handleDaySelect = (selectedDay: Date | undefined) => {
      if (!selectedDay) {
        // Clic sobre el día ya seleccionado: react-day-picker lo deselecciona
        // (onSelect(undefined)). NO borramos la fecha puesta, solo cerramos
        // el popover; para vaciarla se usa Backspace en el campo.
        setIsOpen(false);
        return;
      }

      const y = selectedDay.getFullYear();
      const m = String(selectedDay.getMonth() + 1).padStart(2, "0");
      const d = String(selectedDay.getDate()).padStart(2, "0");
      const display = `${d}/${m}/${y}`;
      const iso = `${y}-${m}-${d}`;

      setDisplayValue(display);
      lastSyncedValueRef.current = iso;
      onChange?.(iso);
      setIsOpen(false);
    };

    const selectedDate = parseToDate(displayValue);

    return (
      <div ref={containerRef} className={cn("relative w-full", className)}>
        {/* Input con máscara DD/MM/YYYY */}
        <input
          ref={setRefs}
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          onKeyDown={handleKeyDown}
          onChange={handleInputChange}
          className={cn(
            "h-10 w-full rounded-xl border bg-white pl-3 pr-10 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 dark:bg-[#0B1120] dark:text-slate-100 dark:placeholder:text-slate-600",
            error
              ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
              : "border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700/80 dark:hover:border-slate-600",
            isOpen && !error && "border-emerald-500 ring-4 ring-emerald-500/10",
            disabled && "cursor-not-allowed opacity-60",
          )}
        />

        {/* Botón de apertura de calendario */}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            const rect = internalInputRef.current?.getBoundingClientRect();
            if (rect) setCoords(computePopoverCoords(rect, placement));
            setIsOpen((prev) => !prev);
          }}
          aria-label="Abrir selector de fecha"
          className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
        </button>

        {/* Popover de Calendario: portal al body para escapar del clipping/overflow de los modales */}
        {isOpen &&
          coords &&
          createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              aria-modal="true"
              aria-label="Calendario de selección de fecha"
              style={coords as React.CSSProperties}
              className="fixed z-[9999] min-w-[280px] animate-entry-up rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-[#0B1120]"
            >
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={handleDaySelect}
                locale={es}
                classNames={{
                  root: "p-1 select-none",
                  months: "relative flex flex-col",
                  month: "space-y-2",
                  month_caption: "flex justify-center items-center h-8 mb-1",
                  caption_label:
                    "text-sm font-semibold capitalize text-slate-800 dark:text-slate-100",
                  nav: "absolute inset-x-0 z-10 flex h-8 items-center justify-between",
                  button_previous:
                    "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer transition-colors",
                  button_next:
                    "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer transition-colors",
                  month_grid: "w-full border-collapse",
                  weekdays: "flex justify-between mb-1",
                  weekday:
                    "text-slate-400 dark:text-slate-500 w-8 text-center text-xs font-medium uppercase",
                  weeks: "flex flex-col gap-1",
                  week: "flex w-full justify-between",
                  day: "p-0 text-center text-sm relative group",
                  day_button:
                    "h-8 w-8 p-0 font-normal rounded-lg transition-colors flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer group-data-[selected=true]:!bg-emerald-600 group-data-[selected=true]:!text-white group-data-[selected=true]:hover:!bg-emerald-500 font-medium group-data-[today=true]:border group-data-[today=true]:border-emerald-500/40 group-data-[today=true]:font-bold group-data-[outside=true]:opacity-30 group-data-[disabled=true]:opacity-25 group-data-[disabled=true]:pointer-events-none",
                }}
                components={{
                  Chevron: ({ orientation }) =>
                    orientation === "left" ? (
                      <ChevronLeft className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    ),
                }}
              />
            </div>,
            document.body,
          )}
      </div>
    );
  },
);

DateInput.displayName = "DateInput";
