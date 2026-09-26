import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";
import { IconButton } from "../../components/ui/IconButton";
import { QuantityStepper } from "../../components/ui/QuantityStepper";
import { TruncatedText } from "../../components/ui/TruncatedText";
import { buildAssetUrl } from "../../lib/assets";
import { getProductPlaceholder } from "../../lib/productPlaceholder";
import { formatearMoneda, type LineaTicket } from "./posQuery";
import { Tooltip } from "../../components/ui/Tooltip";

/**
 * Debe matchear los 180ms de `.animate-exit-up` en globals.css. Si el CSS
 * dura más, el nodo se desmonta a mitad de efecto y se ve un corte; si dura
 * menos, la fila queda invisible 100ms antes de desaparecer.
 */
const EXIT_MS = 180;

type CartItemProps = {
  linea: LineaTicket;
  onCambiarCantidad: (productoId: number, cantidad: number) => void;
  onQuitar: (productoId: number) => void;
};

export function CartItem({
  linea,
  onCambiarCantidad,
  onQuitar,
}: CartItemProps) {
  const [saliendo, setSaliendo] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imgUrl = linea.imgPath ? buildAssetUrl(linea.imgPath) : null;

  // Si el componente se desmonta con la salida en vuelo (vaciar el ticket,
  // recargar el catálogo) se cancela el onQuitar pendiente: ya no hay fila que
  // quitar y el callback solo ensuciaría el estado.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  /**
   * La fila se auto-desmonta: anima la salida y recién entonces avisa que se
   * fue. Mismo criterio que ScanBadge, y por eso un `setTimeout` y no
   * `onAnimationEnd`: con `prefers-reduced-motion` el CSS pone
   * `animation: none !important`, `animationend` no se dispara nunca y la fila
   * quedaría clavada en la lista para siempre.
   */
  function quitar() {
    if (saliendo) return;
    setSaliendo(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onQuitar(linea.productoId);
    }, EXIT_MS);
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-dashed border-slate-200 py-3 last:border-b-0 dark:border-slate-800",
        // El cambio de animation-name es lo que dispara la salida: la entrada
        // queda en el historial del elemento y no vuelve a correr.
        saliendo ? "animate-exit-up pointer-events-none" : "animate-entry-up",
      )}
    >
      <div className="h-13 w-13 shrink-0 overflow-hidden rounded-lg bg-slate-200/60 dark:bg-slate-800/60">
        <img
          src={imgUrl ?? getProductPlaceholder(linea.productoId)}
          alt={imgUrl ? linea.nombre : `${linea.nombre} sin foto`}
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-display text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">
          <TruncatedText text={linea.nombre} />
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-500">
          {formatearMoneda(linea.precioUnitario)} c/u
        </p>
      </div>

      <QuantityStepper
        value={linea.cantidad}
        onChange={(cantidad) => onCambiarCantidad(linea.productoId, cantidad)}
        // quantity 0 hace que la línea se elimine sola (ver cambiarCantidadTicket):
        // en el ticket, restar desde 1 equivale a quitar el producto.
        onRemove={() => onCambiarCantidad(linea.productoId, 0)}
        itemLabel={linea.nombre}
      />

      <span className="min-w-[68px] text-right font-display text-sm font-bold tabular-nums whitespace-nowrap text-slate-900 dark:text-slate-100">
        {formatearMoneda(linea.importe)}
      </span>
      <Tooltip content="Quitar del ticket">
        <IconButton
          icon={<X size={16} />}
          variant="danger"
          shape="square"
          disabled={saliendo}
          aria-label={`Quitar ${linea.nombre} del ticket`}
          onClick={quitar}
        />
      </Tooltip>
    </div>
  );
}
