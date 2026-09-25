import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";
import {
  dropdownItemBase,
  dropdownItemVariants,
  dropdownPanelBase,
  type DropdownMenuItemVariant,
} from "./menuTokens";

// ---------------------------------------------------------------------------
// ContextMenu — menú contextual anclado al PUNTO DEL CURSOR (click derecho).
//
// A diferencia de DropdownMenu, que se ancla al rect de su trigger, este
// recibe las coordenadas del evento `contextmenu` (clientX/clientY del viewport)
// y mide su panel para: (1) auto-flip cuando no cabe abajo o a la derecha y
// (2) clamp contra los bordes de la ventana. Se portaliza a document.body para
// sobrevivir al overflow-hidden de la card.
//
// El panel se mantiene montado entre aperturas (patrón montado/visible/prevOpen
// igual que DropdownMenu) para conservar la transición de salida.
// ---------------------------------------------------------------------------

/** Separación del panel respecto al punto del cursor. */
const CURSOR_OFFSET = 4;
/** Margen mínimo contra los bordes de la ventana para no desbordar. */
const VIEWPORT_MARGIN = 8;
const EXIT_DURATION_MS = 150;

type CierreContext = (() => void) | null;
const ContextMenuCierreContext = createContext<CierreContext>(null);

export interface ContextMenuProps {
  open: boolean;
  /** clientX del evento contextmenu (coordenadas de viewport). */
  x: number;
  /** clientY del evento contextmenu (coordenadas de viewport). */
  y: number;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function ContextMenu({
  open,
  x,
  y,
  onClose,
  children,
  className,
}: ContextMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);
  const [prevOpen, setPrevOpen] = useState(open);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(
    null,
  );

  // Ajuste de estado durante el render: sin efectos en cascada.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMounted(true);
      setVisible(false);
      setCoords(null);
    } else {
      setVisible(false);
    }
  }

  const posicionar = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const { width, height } = panel.getBoundingClientRect();

    let left = x + CURSOR_OFFSET;
    let top = y + CURSOR_OFFSET;
    if (left + width + VIEWPORT_MARGIN > window.innerWidth) {
      left = x - width - CURSOR_OFFSET;
    }
    if (top + height + VIEWPORT_MARGIN > window.innerHeight) {
      top = y - height - CURSOR_OFFSET;
    }

    setCoords({
      left: Math.max(VIEWPORT_MARGIN, left),
      top: Math.max(VIEWPORT_MARGIN, top),
    });
  }, [x, y]);

  // Medición inicial con el panel aún oculto, para posicionar sin parpadeo.
  useLayoutEffect(() => {
    if (!mounted || coords) return;
    posicionar();
  }, [mounted, coords, posicionar]);

  // Entrada: recién posicionado, dispara la animación en el siguiente frame.
  useEffect(() => {
    if (!mounted || !coords || visible) return;
    const raf = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(raf);
  }, [mounted, coords, visible]);

  // Foco en el primer item al abrir: el menú queda operable sin ratón.
  useEffect(() => {
    if (!open || !visible) return;
    panelRef.current
      ?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')
      ?.focus();
  }, [open, visible]);

  // Cierre: click fuera, Escape, scroll y pérdida de foco de la ventana (al
  // alt-tabear a otra app el menú no debe quedar flotando).
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    const handleBlur = () => onClose();

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [open, onClose]);

  // Salida: el fade lo dispara el ajuste de estado del render; el desmontaje
  // real ocurre en onTransitionEnd, con un timer de seguridad por si la
  // transición nunca dispara el evento.
  useEffect(() => {
    if (open || !mounted) return;
    const timeout = window.setTimeout(
      () => setMounted(false),
      EXIT_DURATION_MS + 80,
    );
    return () => window.clearTimeout(timeout);
  }, [open, mounted]);

  const handleTransitionEnd = (event: React.TransitionEvent<HTMLDivElement>) => {
    if (open || !mounted) return;
    if (event.target !== event.currentTarget) return;
    setMounted(false);
  };

  const items = () =>
    Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([disabled])',
      ) ?? [],
    );

  // Navegación con teclado: ↑/↓ ciclan, Inicio/Fin saltan a los extremos.
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const lista = items();
    if (lista.length === 0) return;
    const actual = lista.indexOf(document.activeElement as HTMLElement);
    let siguiente: number;
    switch (event.key) {
      case "ArrowDown":
        siguiente = (actual + 1 + lista.length) % lista.length;
        break;
      case "ArrowUp":
        siguiente = (actual - 1 + lista.length) % lista.length;
        break;
      case "Home":
        siguiente = 0;
        break;
      case "End":
        siguiente = lista.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    lista[siguiente]?.focus();
  };

  if (!mounted) return null;

  return createPortal(
    <ContextMenuCierreContext.Provider value={onClose}>
      <div
        ref={panelRef}
        role="menu"
        onKeyDown={handleKeyDown}
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
        onTransitionEnd={handleTransitionEnd}
        style={{
          left: coords?.left ?? 0,
          top: coords?.top ?? 0,
          visibility: coords ? undefined : "hidden",
          willChange: "transform, opacity",
        }}
        className={cn(
          dropdownPanelBase,
          "pointer-events-none origin-top-left",
          "transition-[opacity,transform] ease",
          visible
            ? "scale-100 opacity-100 pointer-events-auto duration-[170ms]"
            : "scale-95 opacity-0 duration-[150ms]",
          className,
        )}
      >
        {children}
      </div>
    </ContextMenuCierreContext.Provider>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// ContextMenuItem
// ---------------------------------------------------------------------------

export interface ContextMenuItemProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  variant?: DropdownMenuItemVariant;
  disabled?: boolean;
  /** Ejecuta la acción y cierra el menú automáticamente. */
  onClick?: () => void;
}

export function ContextMenuItem({
  icon,
  variant = "default",
  className,
  children,
  onClick,
  disabled,
  ...props
}: ContextMenuItemProps) {
  const cerrar = useContext(ContextMenuCierreContext);

  const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (disabled) return;
    onClick?.();
    cerrar?.();
  };

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      onMouseEnter={(event) => event.currentTarget.focus()}
      className={cn(
        dropdownItemBase,
        dropdownItemVariants[variant] ?? dropdownItemVariants.default,
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
