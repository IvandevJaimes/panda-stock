import { TriangleAlert } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Tooltip } from '../../components/ui/Tooltip'
import {
  cantidadAvisos,
  descripcionAviso,
  estaPorVencer,
  type ProductoPOS,
} from './posQuery'

type StockStatusBadgeProps = {
  producto: ProductoPOS
}

/**
 * Badge de aviso por card: triángulo de alerta con el motivo en el tooltip. El
 * mismo ícono sirve para los dos casos (vencimiento o stock bajo) porque el
 * badge señala "revisá esto", no "esto es esto": el detalle va en el tooltip y
 * en el contorno ámbar de la card. Cuando se cumplen los DOS avisos a la vez,
 * el círculo crece a píldora y muestra "2" al lado del ícono para que el cajero
 * sepa que falta más de lo que se ve.
 */
export function StockStatusBadge({ producto }: StockStatusBadgeProps) {
  const cantidad = cantidadAvisos(producto)
  if (cantidad === 0) return null

  return (
    <Tooltip content={descripcionAviso(producto)} placement="left">
      <span
        className={cn(
          'absolute top-1.5 right-1.5 z-10 inline-flex h-7 items-center justify-center rounded-full',
          'border-2 border-amber-400 bg-amber-500 text-white shadow-md',
          'dark:border-amber-300 dark:bg-amber-400 dark:text-amber-950',
          cantidad > 1 ? 'min-w-7 gap-0.5 px-1.5' : 'w-7',
        )}
        data-estado={estaPorVencer(producto) ? 'por-vencer' : 'stock-bajo'}
        data-cantidad={cantidad}
      >
        <TriangleAlert size={15} className="shrink-0" aria-hidden="true" />
        {cantidad > 1 && (
          <span
            data-contador
            className="text-[11px] leading-none font-bold tabular-nums"
          >
            {cantidad}
          </span>
        )}
      </span>
    </Tooltip>
  )
}
