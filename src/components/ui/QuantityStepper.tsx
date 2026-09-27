import { Minus, Plus } from 'lucide-react'
import { cn } from '../../lib/cn'
import { IconButton } from './IconButton'

type QuantityStepperProps = {
  value: number
  onChange: (value: number) => void
  /**
   * Qué hacer al llegar al mínimo. Si se pasa, se usa al restar desde el
   * mínimo; si no, el botón queda deshabilitado ahí. En el ticket del POS se
   * pasa `onRemove`: una línea con cantidad 1 no tiene sentido sin ella.
   */
  onRemove?: () => void
  /** Nombre del item: solo va al nombre accesible, no a los tooltips. */
  itemLabel?: string
  /**
   * Motivo por el que el `+` no puede usarse, o `undefined` si puede.
   *
   * El bloqueo va con `aria-disabled` y NO con `disabled` a propósito:
   * `IconButton` pone `disabled:pointer-events-none`, y si el botón no recibe
   * eventos de puntero el tooltip —que referencia justamente al botón— no
   * aparecería nunca. Con `aria-disabled` el control sigue siendo alcanzable con
   * el mouse y el foco, el tooltip explica la causa, y un lector de pantalla
   * lo anuncia como deshabilitado igual.
   */
  motivoSinIncremento?: string
  min?: number
  max?: number
  size?: 'xs' | 'sm'
  className?: string
}

/**
 * Stepper de cantidad: `− n +`. Vive en `ui` porque el patrón (contar hacia
 * arriba y abajo sobre un valor acotado) se repite en venta, compras y
 * cualquier formulario de stock. Lo que sí es de cada pantalla es el
 * `onRemove`: qué significa "no puedo restar más" depende del contexto.
 */
export function QuantityStepper({
  value,
  onChange,
  onRemove,
  itemLabel,
  motivoSinIncremento,
  min = 1,
  max = 9999,
  size = 'xs',
  className,
}: QuantityStepperProps) {
  const enMinimo = value <= min
  const enMaximo = value >= max
  const nombre = itemLabel ?? 'productos'
  const sinIcono = size === 'xs' ? 15 : 17

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 p-[3px] dark:border-slate-800 dark:bg-secondary/40',
        className,
      )}
      role="group"
      aria-label={`Cantidad de ${nombre}`}
    >
      <IconButton
        icon={<Minus size={sinIcono} strokeWidth={2.5} />}
        size={size}
        aria-label={`Quitar una unidad de ${nombre}`}
        tooltip="Quitar 1"
        // Sin onRemove no hay a dónde ir cuando se llega al mínimo: mejor
        // deshabilitado que un click que no hace nada.
        disabled={enMinimo && !onRemove}
        onClick={() => (enMinimo ? onRemove?.() : onChange(value - 1))}
      />

      {/* aria-live para que el cambio de cantidad se anuncie: el valor es texto
          plano, sin esto un lector de pantalla no se entera de nada. */}
      <span
        aria-live="polite"
        className="min-w-6 text-center font-display text-[13.5px] font-bold tabular-nums text-slate-900 dark:text-slate-100"
      >
        {value}
      </span>

      <IconButton
        icon={<Plus size={sinIcono} strokeWidth={2.5} />}
        size={size}
        aria-label={`Agregar una unidad de ${nombre}`}
        tooltip={motivoSinIncremento ?? 'Agregar 1'}
        aria-disabled={motivoSinIncremento ? true : undefined}
        data-bloqueado={motivoSinIncremento ? true : undefined}
        variant={motivoSinIncremento ? 'bloqueado' : 'ghost'}
        disabled={enMaximo}
        onClick={() => {
          if (motivoSinIncremento) return
          onChange(value + 1)
        }}
      />
    </div>
  )
}
