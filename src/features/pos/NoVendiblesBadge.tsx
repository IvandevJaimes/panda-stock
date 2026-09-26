import { AlertCircle } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Tooltip } from '../../components/ui/Tooltip'
import type { ConteoBloqueados } from './posQuery'

type NoVendiblesBadgeProps = {
  conteo: ConteoBloqueados
}

function pluralizar(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`
}

function detalle(conteo: ConteoBloqueados): string {
  const { agotados, vencidos } = conteo
  const partes: string[] = []

  if (agotados > 0) partes.push(pluralizar(agotados, 'agotado', 'agotados'))
  if (vencidos > 0) partes.push(pluralizar(vencidos, 'vencido', 'vencidos'))

  const lista =
    partes.length === 2
      ? `${partes[0]} y ${partes[1]}`
      : partes.join('')

  const cierre = (agotados + vencidos) === 1
    ? 'No se puede vender desde el mostrador.'
    : 'No se pueden vender desde el mostrador.'

  return `${lista}. ${cierre}`
}

/**
 * Indicador flotante de productos no vendibles: "! en círculo rojo" con el total
 * al lado, y el desglose (cuántos agotados y cuántos vencidos) en el tooltip.
 * El número da la magnitud de un vistazo; el hover explica el detalle.
 */
export function NoVendiblesBadge({ conteo }: NoVendiblesBadgeProps) {
  const bloqueados = conteo.agotados + conteo.vencidos
  if (bloqueados === 0) return null

  return (
    <Tooltip content={detalle(conteo)} placement="left" maxWidth={260}>
      <button
        type="button"
        aria-label={`Ver productos no vendibles: ${detalle(conteo)}`}
        className={cn(
          // `bottom-20` hasta 1024: el pill del ticket mide ~56px y se apila
          // justo debajo, en la misma esquina. El número tiene que ser el mismo
          // que `ANCHO_MOBILE` en `PosPage`, o el badge queda flotando solo.
          'animate-stock-fab-in absolute right-4 bottom-4 z-20 inline-flex cursor-pointer items-center gap-1.5 max-[1024px]:bottom-20',
          'rounded-full border border-red-200 bg-white py-2 pr-3 pl-2.5 shadow-lg shadow-slate-900/10',
          'transition-[border-color,box-shadow] duration-150 hover:border-red-300 hover:shadow-xl',
          'dark:border-red-500/30 dark:bg-secondary dark:shadow-black/40 dark:hover:border-red-500/50',
        )}
      >
        <AlertCircle
          size={18}
          className="shrink-0 text-red-500 dark:text-red-400"
          aria-hidden="true"
        />
        <span
          data-total
          className="font-display text-sm font-bold tabular-nums text-red-600 dark:text-red-400"
        >
          {bloqueados}
        </span>
      </button>
    </Tooltip>
  )
}
