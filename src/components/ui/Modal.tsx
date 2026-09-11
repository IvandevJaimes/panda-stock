import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  headerIcon?: ReactNode;
  children: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
} as const;

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  headerIcon,
  children,
  className,
  maxWidth = "md",
}: ModalProps) {
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

  // createPortal hacia document.body: el modal queda fuera del árbol de la vista,
  // así ningún contenedor con transform/filter/overflow puede desfasar su layout.
  return createPortal(
    <div className="fixed inset-0 z-50 flex overflow-y-auto p-4 sm:p-6">
      {/* Overlay: fixed inset-0, anclado al viewport visible sin importar el scroll */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-entry-fade"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Contenedor del Modal: m-auto centra y evita clipping si el contenido supera el viewport */}
      <div
        className={cn(
          "relative m-auto w-full flex max-h-[90vh] flex-col rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#111827] animate-entry-up",
          maxWidthClasses[maxWidth],
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Cabecera */}
        <div className="flex shrink-0 items-center border-b border-slate-100 px-6 py-4 dark:border-slate-800/60">
          {title && (
            <div className="flex min-w-0 items-center gap-2.5">
              {headerIcon && (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {headerIcon}
                </span>
              )}
              <div className="min-w-0">
                <h2 className="truncate font-display text-lg font-semibold text-slate-900 dark:text-white">
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-0.5 truncate text-xs font-medium text-slate-400 dark:text-slate-500">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            className="ml-auto -mr-2 cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="custom-scrollbar overflow-y-auto p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
