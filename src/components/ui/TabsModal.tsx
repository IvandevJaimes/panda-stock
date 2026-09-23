import { isValidElement, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

export interface TabsModalTab {
  id: string;
  label: string;
  icon?: LucideIcon | ReactNode;
  content: ReactNode;
}

export interface TabsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subheader?: ReactNode;
  subheaderClassName?: string;
  tabs: TabsModalTab[];
  footer?: ReactNode;
  defaultTabId?: string;
  maxWidth?: string;
  className?: string;
  /** Contenido extra a la derecha del título (antes del botón de cerrar). */
  headerExtra?: ReactNode;
}

function IconoTab({ icon }: { icon: LucideIcon | ReactNode }) {
  if (isValidElement(icon)) return icon;
  const Icono = icon as LucideIcon;
  return <Icono className="h-4 w-4" strokeWidth={2.25} aria-hidden />;
}

export function TabsModal({
  isOpen,
  onClose,
  title,
  subheader,
  subheaderClassName,
  tabs,
  footer,
  defaultTabId,
  maxWidth = "max-w-2xl",
  className,
  headerExtra,
}: TabsModalProps) {
  const [tabActiva, setTabActiva] = useState(
    () =>
      tabs.find((tab) => tab.id === defaultTabId)?.id ??
      tabs[0]?.id ??
      "",
  );

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    // 1. Fallback estándar para el body
    document.body.classList.add("overflow-hidden");

    // 2. Congelar el contenedor interno real del layout
    const scrollContainer = document.getElementById("main-layout-scroll");
    if (scrollContainer) {
      scrollContainer.classList.add("!overflow-hidden");
    }

    document.addEventListener("keydown", onKey);

    return () => {
      document.body.classList.remove("overflow-hidden");
      if (scrollContainer) {
        scrollContainer.classList.remove("!overflow-hidden");
      }
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex overflow-y-auto p-4 sm:p-6">
      {/* Overlay: fixed inset-0, anclado al viewport visible sin importar el scroll */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-entry-fade"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={cn(
          "relative m-auto w-full flex flex-col",
          maxWidth,
          className,
        )}
      >
        {/* Archivador de pestañas: sobresalen del contenedor principal */}
        <div className="flex items-end gap-1.5 px-4">
          {tabs.map((tab) => {
            const activa = tab.id === tabActiva;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTabActiva(tab.id)}
                className={cn(
                  "relative z-10 -mb-px flex -translate-y-0 cursor-pointer items-center gap-1.5 rounded-t-xl border border-b-0 px-4 py-2 text-sm font-medium transition-colors duration-150 select-none",
                  activa
                    ? "border-slate-200 bg-white  text-emerald-600 dark:border-slate-800 dark:bg-[#0B1120] dark:text-emerald-400"
                    : "border-slate-200 bg-slate-100 text-slate-500 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                {tab.icon && <IconoTab icon={tab.icon} />}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Card principal */}
        <div className="flex h-[80vh] min-h-[580px] max-h-[680px] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0B1120] animate-entry-up">
          {/* Header */}
          <div className="flex shrink-0 items-center border-b border-slate-100 px-5 py-3.5 dark:border-slate-800/80">
            {title && (
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                {title}
              </h2>
            )}
            <div className="ml-auto flex items-center gap-3">
              {headerExtra}
              <button
                onClick={onClose}
                className="-mr-2 cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                aria-label="Cerrar modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Subheader contextual: anclado entre la cabecera y el cuerpo, sin scroll */}
          {subheader && (
            <div
              className={cn(
                "shrink-0 border-b border-slate-200 bg-slate-50 px-5 py-2.5 dark:border-slate-800 dark:bg-[#0f172a]",
                subheaderClassName,
              )}
            >
              {subheader}
            </div>
          )}

          {/* Cuerpo scrolleable */}
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
            {tabs.find((tab) => tab.id === tabActiva)?.content}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800/80">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}