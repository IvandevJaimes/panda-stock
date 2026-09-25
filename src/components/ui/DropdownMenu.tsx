import {
  Children,
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import {
  dropdownItemBase,
  dropdownItemVariants,
  dropdownPanelBase,
  type DropdownMenuItemVariant,
} from "./menuTokens";

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
  /** ref al nodo contenedor del trigger, para medir su rect con getBoundingClientRect. */
  wrapperRef: RefObject<HTMLDivElement | null>;
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
    <DropdownMenuContext.Provider
      value={{ open, setOpen, placement, wrapperRef }}
    >
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
  /** ref reenviada al nodo real (modo React 19, ref como prop). Permite que
   *  herramientas como Tippy (Tooltip) se anclen al trigger. */
  ref?: Ref<HTMLButtonElement>;
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
    return cloneElement(child, {
      ...props,
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
/** Margen mínimo respecto de los bordes de la ventana para no desbordar. */
const VIEWPORT_MARGIN = 8;
/** Separación vertical entre el disparador y el panel. */
const OFFSET_Y = 8;

export function DropdownMenuContent({
  placement,
  className,
  children,
  ...props
}: DropdownMenuContentProps) {
  const { open, setOpen, placement: contextPlacement, wrapperRef } =
    useDropdownMenu();
  const resolvedPlacement = placement ?? contextPlacement;
  const contentRef = useRef<HTMLDivElement>(null);

  // Estados de ciclo de vida: montado (existe en el DOM), visible (animación), el
  // último valor de `open` (para detectar transiciones durante el render) y
  // `coords` (posición fija calculada a partir del rect del trigger).
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);
  const [prevOpen, setPrevOpen] = useState(open);
  const [coords, setCoords] = useState<{
    left: number;
    top: number;
    /** true si el panel terminó abriéndose hacia arriba (tras el auto-flip). */
    caeArriba: boolean;
  } | null>(null);

  // Ajuste de estado durante el render: sin efectos ni renders en cascada.
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

  // Igual `transform-origin` que la animación "scale" de Tippy (Tooltip):
  // el panel crece desde el borde por el que se ancla al trigger. Cuando aún no
  // se midió, se asume la dirección configurada en el placement.
  const originClase =
    coords && coords.caeArriba
      ? "origin-bottom"
      : resolvedPlacement.startsWith("bottom")
        ? "origin-top"
        : "origin-bottom";

  // Posiciona el panel (portal a body) midiendo el rect del wrapper del trigger,
  // de modo que sobreviva al overflow-hidden del card y no dependa de contenedores.
  const medirPosicion = useCallback(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;
    const rect = wrapper.getBoundingClientRect();
    const width = content.offsetWidth;
    const height = content.offsetHeight;

    const alineadoDerecha =
      resolvedPlacement === "bottom-end" || resolvedPlacement === "top-end";
    const configAbajo =
      resolvedPlacement === "bottom-start" ||
      resolvedPlacement === "bottom-end";

    // Espacio disponible bajo y sobre el trigger. Si el panel no cabe en la
    // dirección configurada pero sí en la contraria, se invierte (auto-flip):
    // cubre el caso de la última card (cerca del borde inferior) y el inverso.
    const espacioAbajo = window.innerHeight - rect.bottom;
    const espacioArriba = rect.top;
    const cabeAbajo = espacioAbajo >= height + OFFSET_Y + VIEWPORT_MARGIN;
    const cabeArriba = espacioArriba >= height + OFFSET_Y + VIEWPORT_MARGIN;

    const caeAbajo =
      configAbajo
        ? cabeAbajo || !cabeArriba
        : cabeAbajo;

    const left = alineadoDerecha ? rect.right - width : rect.left;
    const top = caeAbajo
      ? rect.bottom + OFFSET_Y
      : rect.top - height - OFFSET_Y;

    // Clamp contra los bordes de la ventana para no desbordar la pantalla.
    setCoords({
      left: Math.max(VIEWPORT_MARGIN, left),
      top: Math.max(VIEWPORT_MARGIN, top),
      caeArriba: !caeAbajo,
    });
  }, [resolvedPlacement, wrapperRef]);

  // Medición inicial apenas se monta el panel (aún oculto, para medir sin parpadeo).
  useLayoutEffect(() => {
    if (!mounted || coords) return;
    medirPosicion();
  }, [mounted, coords, medirPosicion]);

  // Scroll: cierra el menú para que no quede abierto flotando fuera de contexto.
  // Resize: re-posiciona el panel para mantenerlo alineado al trigger.
  useEffect(() => {
    if (!open) return;
    const cerrarAlScroll = () => setOpen(false);
    const reposicionar = () => {
      if (!contentRef.current) return;
      medirPosicion();
    };
    window.addEventListener("scroll", cerrarAlScroll, true);
    window.addEventListener("resize", reposicionar);
    return () => {
      window.removeEventListener("scroll", cerrarAlScroll, true);
      window.removeEventListener("resize", reposicionar);
    };
  }, [open, medirPosicion, setOpen]);

  // Entrada: apenas está posicionada, dispara la animación en el siguiente frame.
  useEffect(() => {
    if (!mounted || !coords || visible) return;
    const raf = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(raf);
  }, [mounted, coords, visible]);

  // Salida: el fade ya se disparó en el ajuste durante el render. El desmontaje
  // lo hace onTransitionEnd (cuando el fade terminó de verdad); este timer de
  // seguridad cubre los casos en que la transición nunca dispare el evento.
  useEffect(() => {
    if (open || !mounted) return;
    const timeout = window.setTimeout(
      () => setMounted(false),
      EXIT_DURATION_MS + 80,
    );
    return () => window.clearTimeout(timeout);
  }, [open, mounted]);

  // Desmonta recién cuando el fade de salida termina. Ignora los transitionend
  // de los items (hover: transition-colors) verificando que el origen sea el panel.
  const handleTransitionEnd = (event: React.TransitionEvent<HTMLDivElement>) => {
    if (open || !mounted) return;
    if (event.target !== event.currentTarget) return;
    setMounted(false);
  };

  if (!mounted) return null;

  return createPortal(
    <div
      ref={contentRef}
      role="menu"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onTransitionEnd={handleTransitionEnd}
      style={{
        left: coords?.left ?? 0,
        top: coords?.top ?? 0,
        visibility: coords ? undefined : "hidden",
        willChange: "transform, opacity",
      }}
      className={cn(
        dropdownPanelBase,
        "pointer-events-none",
        originClase,
        "transition-[opacity,transform] ease",
        visible
          ? "scale-100 opacity-100 pointer-events-auto duration-[170ms]"
          : "scale-[0.6] opacity-0 duration-[150ms]",
        className,
      )}
      {...props}
    >
      {children}
    </div>,
    document.body,
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