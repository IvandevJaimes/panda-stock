import { useState, useRef, useEffect, useCallback } from "react";
import {
  Calendar,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  format,
  addDays,
  addMonths,
  setMonth,
  setYear,
  isSameDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import { CustomSelect } from "../CustomSelect";
import { Tooltip } from "../Tooltip";
import { cn } from "../../../lib/cn";

export type PeriodNavPeriod = "day" | "month" | "year";

interface Props {
  period: PeriodNavPeriod;
  onPeriodChange: (p: PeriodNavPeriod) => void;
  cursor: Date;
  onCursorChange: (d: Date) => void;
  onToday: () => void;
  /** Oculta la opción "Día" (para historiales que no necesitan granularidad diaria). */
  hideDay?: boolean;
}

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function todayLabel(period: PeriodNavPeriod): { icon: string; text: string } {
  switch (period) {
    case "day":
      return { icon: "calendar-check", text: "Hoy" };
    case "month":
      return { icon: "calendar-month", text: "Este mes" };
    case "year":
      return { icon: "calendar", text: "Este año" };
  }
}

function getPeriodLabel(date: Date, period: PeriodNavPeriod): string {
  switch (period) {
    case "day":
      return format(date, "EEEE d 'de' MMMM", { locale: es });
    case "month":
      return format(date, "MMMM yyyy", { locale: es });
    case "year":
      return format(date, "yyyy");
  }
}

function getPreviousDate(date: Date, period: PeriodNavPeriod): Date {
  switch (period) {
    case "day":
      return addDays(date, -1);
    case "month":
      return addMonths(date, -1);
    case "year":
      return new Date(date.getFullYear() - 1, date.getMonth(), date.getDate());
  }
}

function getNextDate(date: Date, period: PeriodNavPeriod): Date {
  switch (period) {
    case "day":
      return addDays(date, 1);
    case "month":
      return addMonths(date, 1);
    case "year":
      return new Date(date.getFullYear() + 1, date.getMonth(), date.getDate());
  }
}

export const PeriodNav = ({
  period,
  onPeriodChange,
  cursor,
  onCursorChange,
  onToday,
  hideDay = false,
}: Props) => {
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inicioDecada = Math.floor(cursor.getFullYear() / 10) * 10;

  const today = new Date();
  const isCurrent = (() => {
    switch (period) {
      case "day":
        return isSameDay(cursor, today);
      case "month":
        return (
          cursor.getMonth() === today.getMonth() &&
          cursor.getFullYear() === today.getFullYear()
        );
      case "year":
        return cursor.getFullYear() === today.getFullYear();
    }
  })();

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (
        popRef.current &&
        !popRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const handleSelect = useCallback(
    (day: Date | undefined) => {
      if (!day) return;
      onCursorChange(day);
      setOpen(false);
    },
    [onCursorChange],
  );

  const handleYearSelect = useCallback(
    (year: number) => {
      onCursorChange(new Date(year, 0, 1));
      setOpen(false);
    },
    [onCursorChange],
  );

  const labelHoy = todayLabel(period);
  const TodayIcon =
    period === "day"
      ? CalendarCheck
      : period === "month"
        ? CalendarDays
        : Calendar;

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* ── Period tabs (md+) ── */}
      <div className="hidden gap-1.5 rounded-full border border-slate-200 bg-white p-1 shadow-sm dark:border-transparent dark:bg-slate-800/70 dark:shadow-none md:inline-flex">
        {(["day", "month", "year"] as const)
          .filter((p) => !hideDay || p !== "day")
          .map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border-none px-3 py-1.5 text-sm font-semibold transition-all duration-150 active:scale-95",
                period === p
                  ? "bg-emerald-600 text-white shadow-sm dark:bg-slate-700 dark:text-emerald-400"
                  : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100",
              )}
            >
              {p === "day" ? "Día" : p === "month" ? "Mes" : "Año"}
            </button>
          ))}
      </div>

      {/* ── Compact period selector below md ── */}
      <div className="md:hidden">
        <Tooltip content="Cambiar período">
          <div className="w-[87px]">
            <CustomSelect
              className="w-[87px]"
              buttonClassName="h-10 rounded-xl px-3 text-sm"
              value={period}
              options={[
                { value: "day", label: "Día" },
                { value: "month", label: "Mes" },
                { value: "year", label: "Año" },
              ].filter((opt) => !hideDay || opt.value !== "day")}
              onChange={(valor) => onPeriodChange(valor as PeriodNavPeriod)}
            />
          </div>
        </Tooltip>
      </div>

      {/* ── Navigation + date selector ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Tooltip content="Periodo anterior">
            <button
              onClick={() => onCursorChange(getPreviousDate(cursor, period))}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-[18px] w-[18px]" />
            </button>
          </Tooltip>

          <div className="relative z-[100] flex-1 overflow-visible">
            <Tooltip content="Seleccionar periodo">
              <button
                ref={triggerRef}
                onClick={() => setOpen(!open)}
                className="flex h-10 w-48 cursor-pointer items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 font-medium text-slate-700 transition-all hover:border-emerald-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-500 dark:hover:bg-slate-800 md:w-56"
              >
                <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold">
                  {getPeriodLabel(cursor, period)}
                </span>

                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-emerald-600 transition-transform dark:text-emerald-400",
                    open && "rotate-180",
                  )}
                />
              </button>
            </Tooltip>
            {open && (
              <div
                ref={popRef}
                className="absolute right-0 top-[calc(100%+8px)] z-[9999] min-w-[300px] animate-entry-up rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-[#0B1120]"
              >
                {period === "month" ? (
                  <div className="p-1">
                    <div className="mb-3 flex items-center justify-between">
                      <button
                        onClick={() =>
                          onCursorChange(
                            setYear(cursor, cursor.getFullYear() - 1),
                          )
                        }
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="font-display text-sm font-bold text-slate-700 dark:text-slate-200">
                        {cursor.getFullYear()}
                      </span>
                      <button
                        onClick={() =>
                          onCursorChange(
                            setYear(cursor, cursor.getFullYear() + 1),
                          )
                        }
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {MONTHS.map((name, idx) => (
                        <button
                          key={idx}
                          onClick={() =>
                            onCursorChange(
                              setMonth(
                                setYear(new Date(), cursor.getFullYear()),
                                idx,
                              ),
                            )
                          }
                          className={cn(
                            "cursor-pointer rounded-xl border-none px-3 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-95",
                            idx === cursor.getMonth()
                              ? "bg-emerald-600 text-white shadow-sm dark:bg-emerald-500"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                          )}
                        >
                          {name.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : period === "year" ? (
                  <div className="p-1">
                    <div className="mb-3 flex items-center justify-between">
                      <button
                        type="button"
                        aria-label="Década anterior"
                        onClick={() => onCursorChange(new Date(inicioDecada - 10, 0, 1))}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="font-display text-sm font-bold text-slate-700 dark:text-slate-200">
                        {inicioDecada}–{inicioDecada + 9}
                      </span>
                      <button
                        type="button"
                        aria-label="Década siguiente"
                        onClick={() => onCursorChange(new Date(inicioDecada + 10, 0, 1))}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {Array.from({ length: 12 }, (_, indice) => inicioDecada - 1 + indice).map((year) => (
                        <button
                          key={year}
                          type="button"
                          aria-pressed={year === cursor.getFullYear()}
                          onClick={() => handleYearSelect(year)}
                          className={cn(
                            "cursor-pointer rounded-xl border-none px-3 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-95",
                            year === cursor.getFullYear()
                              ? "bg-emerald-600 text-white shadow-sm dark:bg-emerald-500"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                          )}
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <DayPicker
                    mode="single"
                    selected={cursor}
                    onSelect={handleSelect}
                    defaultMonth={cursor}
                    locale={es}
                    weekStartsOn={1}
                    showOutsideDays={false}
                    classNames={{
                      root: "select-none p-1",
                      months: "relative flex flex-col",
                      month: "space-y-2",
                      month_caption: "mb-1 flex h-10 items-center justify-center",
                      caption_label:
                        "text-sm font-semibold capitalize text-slate-800 dark:text-slate-100",
                      dropdowns: "flex items-center justify-center gap-2",
                      nav: "pointer-events-none absolute inset-x-0 z-10 flex h-10 items-center justify-between",
                      button_previous:
                        "pointer-events-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-transparent p-0 text-slate-600 opacity-70 transition-colors hover:bg-slate-100 hover:opacity-100 dark:text-slate-300 dark:hover:bg-slate-800",
                      button_next:
                        "pointer-events-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-transparent p-0 text-slate-600 opacity-70 transition-colors hover:bg-slate-100 hover:opacity-100 dark:text-slate-300 dark:hover:bg-slate-800",
                      month_grid: "w-full border-collapse",
                      weekdays: "mb-1 flex justify-between",
                      weekday:
                        "w-8 text-center text-xs font-medium uppercase text-slate-400 dark:text-slate-500",
                      weeks: "flex flex-col gap-1",
                      week: "flex w-full justify-between",
                      day: "group relative p-0 text-center text-sm",
                      day_button:
                        "group-data-[selected=true]:!bg-emerald-600 group-data-[selected=true]:!text-white group-data-[selected=true]:hover:!bg-emerald-500 group-data-[today=true]:border group-data-[today=true]:border-emerald-500/40 group-data-[today=true]:font-bold group-data-[outside=true]:opacity-30 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-25 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg p-0 text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
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
                )}
              </div>
            )}
          </div>

          <Tooltip content="Periodo siguiente">
            <button
              onClick={() => onCursorChange(getNextDate(cursor, period))}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-[18px] w-[18px]" />
            </button>
          </Tooltip>
        </div>

        <Tooltip
          delay={0}
          placement="bottom"
          content={
            !isCurrent ? `Sincronizar a: ${labelHoy.text}` : "Sincronizar"
          }
        >
          <button
            onClick={onToday}
            disabled={isCurrent}
            aria-label={!isCurrent ? `Sincronizar a: ${labelHoy.text}` : "Sincronizar"}
            className={cn(
              "flex h-10 w-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-md font-semibold text-emerald-700 transition-all hover:bg-emerald-100 active:scale-95 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50",
              isCurrent && "pointer-events-none cursor-not-allowed opacity-40",
            )}
          >
            <TodayIcon className="h-[18px] w-[18px]" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
