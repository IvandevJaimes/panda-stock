import { useEffect, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, History } from 'lucide-react'
import { cn } from '../../lib/cn'
import { movimientosService } from '../../services/movimientos.service'
import { productosService } from '../../services/productos.service'
import { SOMBRA_CARD } from './estilos'
import { formatearUnidades } from './reportsQuery'
import type { MovimientoStock, TipoMovimientoStock } from '../../../electron/db/types'

/**
 * Cuántos movimientos se traen.
 *
 * `FiltrosMovimientos` no acepta rango de fechas: solo `productoId` y `limit`.
 * Por eso esto es "lo último que pasó", no "lo que pasó en el período" del
 * selector. El subtítulo lo aclara para que no se lea como filtrado.
 */
const LIMITE = 12

const ETIQUETAS: Record<TipoMovimientoStock, string> = {
  entrada: 'Entrada',
  venta: 'Venta',
  ajuste_positivo: 'Ajuste',
  ajuste_negativo: 'Ajuste',
  merma: 'Merma',
  devolucion: 'Devolución',
}

/** Salen (+) o entran (−) del stock. El signo va en el número, no solo en el color. */
const SUMAN_STOCK: Record<TipoMovimientoStock, boolean> = {
  entrada: true,
  venta: false,
  ajuste_positivo: true,
  ajuste_negativo: false,
  merma: false,
  devolucion: true,
}

function formatearMomento(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

type MovimientoConNombre = MovimientoStock & { nombreProducto: string }

/**
 * Últimos movimientos de inventario.
 *
 * Son movimientos de stock, no de dinero: entran acá para ubicar qué se movió,
 * nunca para armar un resultado. El CMV del reporte sale de las líneas de venta,
 * no de estas filas.
 */
export function MovimientosRecientes() {
  const [movimientos, setMovimientos] = useState<MovimientoConNombre[] | null>(null)

  useEffect(() => {
    let vigente = true

    /*
      `movimientos_stock` no trae el nombre del producto, solo el `productoId`.
      Se trae el catálogo para resolver los nombres en memoria: sin esto la tabla
      mostraría "Producto 47" y no serviría para nada.
    */
    Promise.all([movimientosService.getAll({ limit: LIMITE }), productosService.getAll()])
      .then(([lista, productos]) => {
        if (!vigente) return

        const nombres = new Map(productos.map((producto) => [producto.id, producto.nombre]))
        setMovimientos(
          lista.map((movimiento) => ({
            ...movimiento,
            nombreProducto:
              movimiento.productoId === null
                ? 'Sin producto asociado'
                : (nombres.get(movimiento.productoId) ?? `Producto #${movimiento.productoId}`),
          })),
        )
      })
      .catch(() => {
        if (vigente) setMovimientos([])
      })

    return () => {
      vigente = false
    }
  }, [])

  return (
    <section className={`w-full rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] ${SOMBRA_CARD}`}>
      <header className="flex items-start gap-2.5 px-4 py-3.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <History size={15} />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Movimientos recientes de inventario
          </h3>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
            Últimos {LIMITE} movimientos, sin importar el filtro de fechas. Mueven stock, no plata.
          </p>
        </div>
      </header>

      {movimientos === null ? (
        <p className="px-4 pb-4 text-xs text-slate-400 dark:text-slate-500">Cargando...</p>
      ) : movimientos.length === 0 ? (
        <p className="px-4 pb-4 text-xs text-slate-500 dark:text-slate-400">
          Todavía no hay movimientos de stock registrados.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800/60 dark:border-slate-800/60">
          {movimientos.map((movimiento) => {
            const suma = SUMAN_STOCK[movimiento.tipo]
            return (
              <li key={movimiento.id} className="flex items-center gap-3 px-4 py-2.5">
                <span
                  className={cn(
                    'grid h-7 w-7 shrink-0 place-items-center rounded-lg',
                    suma
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                  )}
                >
                  {suma ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-200">
                    {movimiento.nombreProducto}
                  </p>
                  <p className="text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                    {ETIQUETAS[movimiento.tipo]}
                    {movimiento.motivo ? ` · ${movimiento.motivo}` : ''}
                    {movimiento.stockPosterior !== null ? ` · Quedó en ${formatearUnidades(movimiento.stockPosterior)}` : ''}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      'font-display text-sm font-semibold tabular-nums',
                      suma ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                    )}
                  >
                    {suma ? '+' : '-'}
                    {formatearUnidades(movimiento.cantidad)}
                  </p>
                  <p className="text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                    {formatearMomento(movimiento.fechaHora)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}