import { useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, History } from 'lucide-react'
import { CustomSelect } from '../../components/ui/CustomSelect'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import { cn } from '../../lib/cn'
import { movimientosService } from '../../services/movimientos.service'
import { productosService } from '../../services/productos.service'
import { SOMBRA_CARD } from './estilos'
import { BarraFiltrosReporte, PaginacionReporte } from './TablaReporteUI'
import { formatearUnidades } from './reportsQuery'
import type { MovimientoStock, TipoMovimientoStock } from '../../../electron/db/types'

const POR_PAGINA = 10
const ETIQUETAS: Record<TipoMovimientoStock, string> = {
  entrada: 'Entrada', venta: 'Venta', ajuste_positivo: 'Ajuste positivo',
  ajuste_negativo: 'Ajuste negativo', merma: 'Merma', devolucion: 'Devolución',
}
const SUMAN_STOCK: Record<TipoMovimientoStock, boolean> = {
  entrada: true, venta: false, ajuste_positivo: true,
  ajuste_negativo: false, merma: false, devolucion: true,
}
const OPCIONES_TIPO = [
  { value: 'todos', label: 'Todos los tipos' },
  ...Object.entries(ETIQUETAS).map(([value, label]) => ({ value, label })),
]

function formatearMomento(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

type MovimientoConNombre = MovimientoStock & { nombreProducto: string }
type MovimientosRecientesProps = { desde: string | null; hasta: string | null }

export function MovimientosRecientes({ desde, hasta }: MovimientosRecientesProps) {
  const [movimientos, setMovimientos] = useState<MovimientoConNombre[] | null>(null)
  const [buscar, setBuscar] = useState('')
  const [tipo, setTipo] = useState<'todos' | TipoMovimientoStock>('todos')
  const [pagina, setPagina] = useState(1)

  useEffect(() => {
    let vigente = true
    Promise.all([
      movimientosService.getAll({ desde: desde ?? undefined, hasta: hasta ?? undefined }),
      productosService.getAll(),
    ]).then(([lista, productos]) => {
      if (!vigente) return
      const nombres = new Map(productos.map((producto) => [producto.id, producto.nombre]))
      setMovimientos(lista.map((movimiento) => ({
        ...movimiento,
        nombreProducto: movimiento.productoId === null
          ? 'Sin producto asociado'
          : (nombres.get(movimiento.productoId) ?? `Producto #${movimiento.productoId}`),
      })))
    }).catch(() => {
      if (vigente) setMovimientos([])
    })
    return () => { vigente = false }
  }, [desde, hasta])

  const filtrados = useMemo(() => {
    const consulta = buscar.trim().toLocaleLowerCase('es-AR')
    return (movimientos ?? []).filter((movimiento) => {
      if (tipo !== 'todos' && movimiento.tipo !== tipo) return false
      if (!consulta) return true
      return [movimiento.nombreProducto, movimiento.motivo ?? '', ETIQUETAS[movimiento.tipo], formatearMomento(movimiento.fechaHora)]
        .some((valor) => valor.toLocaleLowerCase('es-AR').includes(consulta))
    })
  }, [movimientos, buscar, tipo])
  const visibles = useMemo(() => filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA), [filtrados, pagina])

  const cambiarBusqueda = (valor: string) => { setBuscar(valor); setPagina(1) }
  const cambiarTipo = (valor: string | number) => { setTipo(String(valor) as 'todos' | TipoMovimientoStock); setPagina(1) }

  return (
    <section className={cn('w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827]', SOMBRA_CARD)}>
      <header className="flex items-start gap-2.5 px-4 py-3.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><History size={15} /></span>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">Movimientos del período</h3>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">Entradas y salidas de stock, desde la más reciente.</p>
        </div>
      </header>
      <BarraFiltrosReporte buscar={buscar} onBuscarChange={cambiarBusqueda} placeholder="Buscar producto, tipo o motivo" total={filtrados.length}>
        <div className="w-full sm:w-48">
          <CustomSelect value={tipo} options={OPCIONES_TIPO} onChange={cambiarTipo} buttonClassName="h-10 text-xs" />
        </div>
      </BarraFiltrosReporte>
      {movimientos === null ? (
        <p className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">Cargando movimientos del período…</p>
      ) : filtrados.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
          {movimientos.length === 0 ? 'No hay movimientos de stock en este período.' : 'No hay movimientos que coincidan con los filtros.'}
        </p>
      ) : (
        <>
          <div className="hidden lg:block">
            <Table>
              <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Producto y motivo</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Cambio</TableHead><TableHead className="text-right">Stock posterior</TableHead></TableRow></TableHeader>
              <TableBody>
                {visibles.map((movimiento) => {
                  const suma = SUMAN_STOCK[movimiento.tipo]
                  const Icono = suma ? ArrowUpRight : ArrowDownRight
                  return (
                    <TableRow key={movimiento.id}>
                      <TableCell className="whitespace-nowrap text-xs tabular-nums text-slate-500 dark:text-slate-400">{formatearMomento(movimiento.fechaHora)}</TableCell>
                      <TableCell><p className="max-w-80 truncate font-medium text-slate-900 dark:text-white">{movimiento.nombreProducto}</p>{movimiento.motivo && <p className="max-w-80 truncate text-[11px] text-slate-500 dark:text-slate-400">{movimiento.motivo}</p>}</TableCell>
                      <TableCell><span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', suma ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-700 dark:text-rose-400')}><Icono size={13} />{ETIQUETAS[movimiento.tipo]}</span></TableCell>
                      <TableCell className={cn('text-right font-display font-bold tabular-nums', suma ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>{suma ? '+' : '−'}{formatearUnidades(movimiento.cantidad)}</TableCell>
                      <TableCell className="text-right tabular-nums text-slate-600 dark:text-slate-300">{movimiento.stockPosterior === null ? '—' : formatearUnidades(movimiento.stockPosterior)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <ul className="divide-y divide-slate-100 px-4 dark:divide-slate-800/60 lg:hidden">
            {visibles.map((movimiento) => {
              const suma = SUMAN_STOCK[movimiento.tipo]
              const Icono = suma ? ArrowUpRight : ArrowDownRight
              return (
                <li key={movimiento.id} className="flex items-start gap-3 py-3">
                  <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl', suma ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400')}><Icono size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{movimiento.nombreProducto}</p><span className={cn('shrink-0 font-display text-sm font-bold tabular-nums', suma ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>{suma ? '+' : '−'}{formatearUnidades(movimiento.cantidad)}</span></div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{ETIQUETAS[movimiento.tipo]}{movimiento.motivo ? ` · ${movimiento.motivo}` : ''}</p>
                    <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">{formatearMomento(movimiento.fechaHora)}{movimiento.stockPosterior !== null ? ` · Stock: ${formatearUnidades(movimiento.stockPosterior)}` : ''}</p>
                  </div>
                </li>
              )
            })}
          </ul>
          <PaginacionReporte pagina={pagina} tamanoPagina={POR_PAGINA} total={filtrados.length} onCambiarPagina={setPagina} />
        </>
      )}
    </section>
  )
}
