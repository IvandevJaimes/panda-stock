import {
  Children,
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactElement,
  type ReactNode,
  type Ref,
  type SetStateAction,
} from "react";
import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type DropdownMenuPlacement =
  | "bottom-end"
  | "bottom-start"
  | "top-end"
  | "top-start";

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  placement: DropdownMenuPlacement;
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(
  null,
);

function useDropdownMenu(): DropdownMenuContextValue {
  const context = useContext(DropdownMenuContext);
  if (!context) {
    throw new Error(
      "DropdownMenu subcomponentes deben usarse dentro de <DropdownMenu>",
    );
  }
  return context;
}

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------

type MutableRefObject<T> = { current: T | null };

/** Combina varias refs en una sola callback-ref manteniendo las refs del hijo. */
function mergeRefs<T extends HTMLElement>(
  ...refs: Array<Ref<T> | null | undefined>
) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") {
        ref(node);
      } else {
        (ref as MutableRefObject<T>).current = node;
      }
    }
  };
}

const placementClasses: Record<DropdownMenuPlacement, string> = {
  "bottom-end": "right-0 top-full mt-2",
  "bottom-start": "left-0 top-full mt-2",
  "top-end": "bottom-full right-0 mb-2",
  "top-start": "bottom-full left-0 mb-2",
};

const panelBase =
  "absolute z-50 min-w-[180px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 outline-none dark:border-slate-800 dark:bg-[#0B1120] dark:shadow-black/40";

const itemBase =
  "group inline-flex w-full cursor-pointer select-none items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium outline-none transition-colors";

const itemVariants = {
  default:
    "text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:bg-slate-100 focus-visible:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-white dark:focus-visible:bg-slate-800/80 dark:focus-visible:text-white",
  danger:
    "text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:bg-red-50 focus-visible:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300 dark:focus-visible:bg-red-500/10 dark:focus-visible:text-red-300",
} as const;

export type DropdownMenuItemVariant = keyof typeof itemVariants;

// ---------------------------------------------------------------------------
// DropdownMenu: contenedor principal proveedor de contexto
// ---------------------------------------------------------------------------

export interface DropdownMenuProps {
  placement?: DropdownMenuPlacement;
  children: ReactNode;
}

export function DropdownMenu({
  placement = "bottom-end",
  children,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cierre al hacer clic fuera y cierre con tecla ESC.
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, placement }}>
      <div className="relative inline-block" ref={wrapperRef}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// DropdownMenuTrigger
// ---------------------------------------------------------------------------

export interface DropdownMenuTriggerProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Inyecta onClick/aria en el hijo sin nodos extra (un único hijo obligatorio). */
  asChild?: boolean;
  children: ReactNode;
}

export function DropdownMenuTrigger({
  asChild = false,
  className,
  children,
  onClick,
  ...props
}: DropdownMenuTriggerProps) {
  const { open, setOpen } = useDropdownMenu();

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    onClick?.(event as React.MouseEvent<HTMLButtonElement>);
    setOpen((prev) => !prev);
  };

  if (asChild) {
    const child = Children.only(children) as ReactElement<
      Record<string, unknown>
    >;
    const childRef = (child as ReactElement & { ref?: Ref<HTMLElement> }).ref;
    return cloneElement(child, {
      ref: mergeRefs<HTMLElement>(childRef),
      onClick: handleClick,
      "aria-haspopup": "menu",
      "aria-expanded": open,
    });
  }

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      aria-haspopup="menu"
      aria-expanded={open}
      {...props}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// DropdownMenuContent
// ---------------------------------------------------------------------------

export interface DropdownMenuContentProps
  extends HTMLAttributes<HTMLDivElement> {
  /** Hereda placement de <DropdownMenu> salvo que se indique explícitamente. */
  placement?: DropdownMenuPlacement;
  children: ReactNode;
}

const EXIT_DURATION_MS = 150;

export function DropdownMenuContent({
  placement,
  className,
  children,
  ...props
}: DropdownMenuContentProps) {
  const { open, placement: contextPlacement } = useDropdownMenu();
  const resolvedPlacement = placement ?? contextPlacement;

  // Tres estados derivados: montado (renderizar panel), visible (animación) y
  // el último valor de `open` para detectar transiciones durante el render.
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);
  const [prevOpen, setPrevOpen] = useState(open);

  // Ajuste de estado durante el render: sin efectos ni renders en cascada.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMounted(true);
      setVisible(false);
    } else {
      setVisible(false);
    }
  }

  // Salida: mantiene el panel montado mientras transiciona, luego lo desmonta.
  useEffect(() => {
    if (open || !mounted) return;
    const timeout = window.setTimeout(
      () => setMounted(false),
      EXIT_DURATION_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [open, mounted]);

  // Entrada: arranca en opacity-0 scale-95 y pasa a opacity-100 scale-100.
  useEffect(() => {
    if (!mounted || visible) return;
    const raf = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(raf);
  }, [mounted, visible]);

  if (!mounted) return null;

  return (
    <div
      role="menu"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        panelBase,
        placementClasses[resolvedPlacement],
        "transition-all duration-150 ease-out",
        visible ? "scale-100 opacity-100" : "scale-95 opacity-0",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DropdownMenuItem
// ---------------------------------------------------------------------------

export interface DropdownMenuItemProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  variant?: DropdownMenuItemVariant;
  disabled?: boolean;
  /** Ejecuta la acción y cierra el menú automáticamente. */
  onClick?: () => void;
}

export function DropdownMenuItem({
  icon,
  variant = "default",
  className,
  children,
  onClick,
  disabled,
  ...props
}: DropdownMenuItemProps) {
  const { setOpen } = useDropdownMenu();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onClick?.();
    if (!disabled) setOpen(false);
  };

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        itemBase,
        itemVariants[variant] ?? itemVariants.default,
        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
        className,
      )}
      {...props}
    >
      {icon && (
        <span className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-current dark:text-slate-500">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// DropdownMenuSeparator
// ---------------------------------------------------------------------------

type DropdownMenuSeparatorProps = HTMLAttributes<HTMLHRElement>;

export function DropdownMenuSeparator({
  className,
  ...props
}: DropdownMenuSeparatorProps) {
  return (
    <hr
      aria-hidden="true"
      className={cn(
        "my-1 border-slate-200 dark:border-slate-800",
        className,
      )}
      {...props}
    />
  );
}