import { Ban, BookUser, Receipt } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Tooltip } from '../../components/ui/Tooltip'
import { buildAssetUrl } from '../../lib/assets'
import { cn } from '../../lib/cn'
import { getProductPlaceholder } from '../../lib/productPlaceholder'
import { useSrcConFallback } from '../../hooks/useSrcConFallback'
import { formatearMoneda } from './posQuery'
import { ETIQUETAS_METODO } from './ventaHistorialUtils'
import type { MetodoPago, VentaHistorial } from '../../../electron/db/types'

function cantidadEnTexto(cantidad: number): string {
  return String(Number(cantidad.toFixed(3)))
}

function formatearMomento(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

function etiquetaMetodos(metodos: MetodoPago[]): string {
  if (metodos.length === 0) return '—'
  return metodos.map((metodo) => ETIQUETAS_METODO[metodo]).join(' + ')
}

function ItemHistorialImagen({ item }: { item: VentaHistorial['items'][number] }) {
  const preview = getProductPlaceholder(item.productoId ?? item.id)
  const imagen = useSrcConFallback(buildAssetUrl(item.imgPath) ?? preview, preview)

  return (
    <img
      src={imagen.src}
      onError={imagen.onError}
      alt={item.descripcionItem}
      loading="lazy"
      draggable={false}
      className="h-9 w-9 shrink-0 rounded-md object-cover"
    />
  )
}

type VentaHistorialCardProps = {
  venta: VentaHistorial
  onAnular: (venta: VentaHistorial) => void
}

type VentaHistorialItemsProps = {
  items: VentaHistorial['items']
  className?: string
}

export function VentaHistorialItems({ items, className }: VentaHistorialItemsProps) {
  return (
    <div className={cn('custom-scrollbar mt-2 max-h-40 overflow-y-auto overscroll-contain px-1', className)}>
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2.5 py-1.5 first:pt-0 last:pb-0">
          <ItemHistorialImagen item={item} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-300">
              {item.descripcionItem}
            </span>
            <span className="text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
              {cantidadEnTexto(item.cantidad)} × {formatearMoneda(item.precioUnitario)}
            </span>
          </span>
          <span className="shrink-0 text-[13px] tabular-nums text-slate-600 dark:text-slate-400">
            {formatearMoneda(item.subtotal)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function VentaHistorialCard({ venta, onAnular }: VentaHistorialCardProps) {
  const esCuentaCorriente = venta.metodos.includes('cuenta_corriente')

  return (
    <article
      className={[
        'rounded-xl border px-4 py-3',
        venta.estado === 'anulada'
          ? 'border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/15'
          : esCuentaCorriente
            ? 'border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/15'
            : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-secondary/25',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-display text-sm font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
            N.º {venta.id}
          </span>
          {esCuentaCorriente && (
            <span className="inline-flex min-w-0 shrink items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
              <BookUser size={12} className="shrink-0" aria-hidden="true" />
              <span className="truncate">
                Cuenta corriente{venta.clienteNombre ? ` · ${venta.clienteNombre}` : ''}
              </span>
            </span>
          )}
          {venta.estado === 'pendiente' && (
            <span className="shrink-0 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
              Pendiente
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {venta.estado === 'anulada' ? (
            <Tooltip content={venta.motivoAnulacion || 'Venta anulada'} placement="top">
              <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                <Ban size={12} aria-hidden="true" />
                Anulada
              </span>
            </Tooltip>
          ) : (
            <Button
              size="sm"
              variant="outline"
              icon={<Ban size={13} aria-hidden="true" />}
              onClick={() => onAnular(venta)}
              className="text-rose-600 hover:border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:hover:border-rose-800 dark:hover:bg-rose-950/30"
            >
              Anular
            </Button>
          )}
          <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {formatearMomento(venta.fechaHora)}
          </span>
        </div>
      </div>

      <div aria-hidden="true" className="mt-2.5 border-t border-dashed border-slate-300 dark:border-slate-700" />

      <VentaHistorialItems items={venta.items} />

      <div aria-hidden="true" className="mt-2.5 border-t border-dashed border-slate-300 dark:border-slate-700" />

      <div className="mt-2.5 flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Receipt size={15} className="shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          <span className="min-w-0 truncate text-sm font-medium text-slate-700 dark:text-slate-300">
            {etiquetaMetodos(venta.metodos)}
          </span>
          <span className="shrink-0 text-xs tabular-nums text-slate-400 dark:text-slate-500">
            · {cantidadEnTexto(venta.unidades)} u.
          </span>
        </div>
        <span
          className={[
            'shrink-0 font-display text-base font-extrabold tabular-nums',
            venta.estado === 'anulada'
              ? 'text-slate-400 line-through decoration-rose-400/70 dark:text-slate-500'
              : 'text-emerald-700 dark:text-emerald-400',
          ].join(' ')}
        >
          {formatearMoneda(venta.total)}
        </span>
      </div>
    </article>
  )
}
