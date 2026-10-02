import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { CircleSlash, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { IconButton } from "../../components/ui/IconButton";
import { QuantityStepper } from "../../components/ui/QuantityStepper";
import { TruncatedText } from "../../components/ui/TruncatedText";
import { buildAssetUrl } from "../../lib/assets";
import { getProductPlaceholder } from "../../lib/productPlaceholder";
import { useSrcConFallback } from "../../hooks/useSrcConFallback";
import {
  formatearMoneda,
  motivoStockInsuficienteCorto,
  MOTIVO_SIN_INCREMENTO,
  type LineaTicket,
} from "./posQuery";
import { Tooltip } from "../../components/ui/Tooltip";

/**
 * Debe matchear los 180ms de `.animate-exit-up` en globals.css. Si el CSS
 * dura más, el nodo se desmonta a mitad de efecto y se ve un corte; si dura
 * menos, la fila queda invisible 100ms antes de desaparecer.
 */
const EXIT_MS = 180;

type CartItemProps = {
  linea: LineaTicket;
  indice: number;
  seleccionada: boolean;
  onSeleccionar: (indice: number) => void;
  onCambiarCantidad: (productoId: number, cantidad: number) => void;
  onQuitar: (productoId: number) => void;
  /** El producto se desactivó después de armar la línea: no se puede sumar más. */
  desactivado?: boolean;
  /** Stock disponible en la base, o `null` si el producto ya no está en el catálogo. */
  stockDisponible?: number | null;
};

export function CartItem({
  linea,
  indice,
  seleccionada,
  onSeleccionar,
  onCambiarCantidad,
  onQuitar,
  desactivado = false,
  stockDisponible = null,
}: CartItemProps) {
  const [saliendo, setSaliendo] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imgUrl = linea.imgPath ? buildAssetUrl(linea.imgPath) : null;
  const placeholderLinea = getProductPlaceholder(linea.productoId);
  const imagenLinea = useSrcConFallback(
    imgUrl ?? placeholderLinea,
    placeholderLinea,
  );

  const sinStock = stockDisponible !== null && linea.cantidad >= stockDisponible;
  const {
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<{ cantidad: number }>({
    defaultValues: { cantidad: linea.cantidad },
  });

  // La cantidad vive en el store del ticket, no en el form: el form solo
  // arbitra el mensaje de error.
  useEffect(() => {
    if (sinStock && stockDisponible !== null) {
      setError("cantidad", {
        type: "validate",
        // Sin el nombre: el mensaje va al tooltip del `+` de esta fila, y el
        // producto ya está escrito a la izquierda. Repetirlo ahí suma ruido; el
        // nombre sí importa en el toast de `PosPage`, que sí viene desligado de
        // la línea.
        message: motivoStockInsuficienteCorto(stockDisponible),
      });
    } else {
      clearErrors("cantidad");
    }
  }, [sinStock, stockDisponible, linea.nombre, setError, clearErrors]);

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
      // El click enfoque la fila para que el control que queda con el foco sea
      // el que el cajero está mirando. Se anula con preventDefault porque el
      // default haría focus native y saltaría la fila entera.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSeleccionar(indice)}
      data-linea-ticket=""
      data-seleccionada={seleccionada || undefined}
      aria-current={seleccionada ? 'true' : undefined}
      className={cn(
        "-mx-2.5 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-200 px-2.5 py-3 transition-colors last:border-b-0 dark:border-slate-800",
        seleccionada &&
          "border-emerald-500 bg-emerald-500/8",
        saliendo ? "animate-exit-up pointer-events-none" : "animate-entry-up",
      )}
    >
      <div className="h-13 w-13 shrink-0 overflow-hidden rounded-lg bg-slate-200/60 dark:bg-slate-800/60">
        <img
          src={imagenLinea.src}
          onError={imagenLinea.onError}
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
        {desactivado && (
          // El motivo se ve en la fila, no solo en el tooltip del `+`: el atajo
          // de teclado también queda bloqueado y no tiene tooltip que mostrar.
          <p
            className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400"
            data-linea-desactivada=""
          >
            <CircleSlash size={11} className="shrink-0" aria-hidden="true" />
            Desactivado
          </p>
        )}
      </div>

      <QuantityStepper
        value={linea.cantidad}
        onChange={(cantidad) => onCambiarCantidad(linea.productoId, cantidad)}
        motivoSinIncremento={
          desactivado ? MOTIVO_SIN_INCREMENTO : (errors.cantidad?.message ?? undefined)
        }
        motivoEsError={Boolean(errors.cantidad)}
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
