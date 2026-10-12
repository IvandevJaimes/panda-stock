import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Loader2, Package, TrendingUp } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table'
import { EmptyState } from '../../components/ui/EmptyState'
import { cn } from '../../lib/cn'
import { productosService } from '../../services/productos.service'
import { SOMBRA_CARD } from './estilos'
import { ProductoDetalleBasico } from './ProductoDetalleBasico'
import { formatearMoneda, formatearUnidades, type FilaRanking } from './reportsQuery'
import type { Producto } from '../../../electron/db/types'

type RankingProductosProps = {
  filas: FilaRanking[]
  criterio: 'unidades' | 'ingresos'
}

const TOPE_RANKING = 10

/** Muestra los diez productos destacados según unidades o venta neta. */
export function RankingProductos({ filas, criterio }: RankingProductosProps) {
  const porIngresos = criterio === 'ingresos'
  const Icono = porIngresos ? TrendingUp : Package
  const [seleccionada, setSeleccionada] = useState<FilaRanking | null>(null)
  const [detalleProducto, setDetalleProducto] = useState<{
    productoId: number | null
    producto: Producto | null
    cargando: boolean
  } | null>(null)
  const solicitudProducto = useRef(0)
  const visibles = useMemo(
    () => [...filas]
      .sort((a, b) => porIngresos
        ? b.monto - a.monto || a.nombre.localeCompare(b.nombre)
        : b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre))
      .slice(0, TOPE_RANKING),
    [filas, porIngresos],
  )

  const abrirDetalle = (fila: FilaRanking) => {
    setSeleccionada(fila)
    const solicitud = ++solicitudProducto.current
    if (fila.productoId === null) {
      setDetalleProducto({ productoId: null, producto: null, cargando: false })
      return
    }

    setDetalleProducto({ productoId: fila.productoId, producto: null, cargando: true })
    productosService.getById(fila.productoId).then((resultado) => {
      if (solicitud === solicitudProducto.current) {
        setDetalleProducto({ productoId: fila.productoId, producto: resultado, cargando: false })
      }
    }).catch(() => {
      if (solicitud === solicitudProducto.current) {
        setDetalleProducto({ productoId: fila.productoId, producto: null, cargando: false })
      }
    })
  }

  const abrirConTeclado = (evento: KeyboardEvent<HTMLTableRowElement>, fila: FilaRanking) => {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault()
      abrirDetalle(fila)
    }
  }

  const cerrarDetalle = () => {
    solicitudProducto.current += 1
    setSeleccionada(null)
    setDetalleProducto(null)
  }

  return (
    <section className={`w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] ${SOMBRA_CARD}`}>
      <header className="flex items-start gap-2.5 px-4 py-3.5">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${porIngresos ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
          <Icono size={15} />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            {porIngresos ? 'Top 10 · Más ingresos' : 'Top 10 · Más vendidos'}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {porIngresos ? 'Ordenados por venta neta.' : 'Ordenados por unidades vendidas.'}
          </p>
        </div>
      </header>

      {visibles.length === 0 ? (
        <EmptyState
          title="Sin productos vendidos"
          description="No hay ventas en el período seleccionado."
          icon={<Package size={22} />}
        />
      ) : (
        <>
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">{porIngresos ? 'Venta neta' : 'Unidades'}</TableHead>
                  <TableHead className="text-right">{porIngresos ? 'Unidades' : 'Venta neta'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((fila, indice) => (
                  <TableRow
                    key={fila.productoId ?? fila.nombre}
                    tabIndex={0}
                    aria-label={`Ver detalle de ${fila.nombre}`}
                    onClick={() => abrirDetalle(fila)}
                    onKeyDown={(evento) => abrirConTeclado(evento, fila)}
                    className="cursor-pointer odd:bg-white even:bg-slate-50/70 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-500 dark:odd:bg-[#111827] dark:even:bg-slate-900/35 dark:hover:bg-slate-800/70"
                  >
                    <TableCell className="tabular-nums text-slate-400">{indice + 1}</TableCell>
                    <TableCell className="font-medium text-slate-900 dark:text-white">
                      <span className="block max-w-[18rem] truncate">{fila.nombre}</span>
                    </TableCell>
                    <TableCell className="text-right font-display font-semibold tabular-nums text-slate-900 dark:text-white">
                      {porIngresos ? formatearMoneda(fila.monto) : formatearUnidades(fila.cantidad)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-500 dark:text-slate-400">
                      {porIngresos ? formatearUnidades(fila.cantidad) : formatearMoneda(fila.monto)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="divide-y divide-slate-100 dark:divide-slate-800/60 lg:hidden">
            {visibles.map((fila, indice) => (
              <li
                key={fila.productoId ?? fila.nombre}
                className={cn(
                  'border-b border-slate-100 last:border-b-0 dark:border-slate-800/60',
                  indice % 2 === 0
                    ? 'bg-slate-50/70 dark:bg-slate-900/35'
                    : 'bg-white dark:bg-transparent',
                )}
              >
                <button
                  type="button"
                  onClick={() => abrirDetalle(fila)}
                  aria-label={`Ver detalle de ${fila.nombre}`}
                  className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-500 dark:hover:bg-slate-800/70"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold tabular-nums text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    {indice + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{fila.nombre}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {porIngresos ? `${formatearUnidades(fila.cantidad)} unidades` : formatearMoneda(fila.monto)}
                    </p>
                  </div>
                  <span className="shrink-0 font-display text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                    {porIngresos ? formatearMoneda(fila.monto) : `${formatearUnidades(fila.cantidad)} u.`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Modal
        isOpen={seleccionada !== null}
        onClose={cerrarDetalle}
        title="Detalle del producto"
        subtitle={seleccionada?.nombre}
        headerIcon={<Icono size={18} aria-hidden="true" />}
        maxWidth="xl"
        footer={(
          <Button variant="outline" onClick={cerrarDetalle}>
            Cerrar
          </Button>
        )}
      >
        {seleccionada && (
          <div className="flex flex-col gap-5">
            {detalleProducto?.productoId === seleccionada.productoId && detalleProducto.cargando ? (
              <div className="flex min-h-20 items-center justify-center gap-2 text-sm text-slate-400 dark:text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Cargando producto…
              </div>
            ) : (
              <ProductoDetalleBasico
                producto={detalleProducto?.productoId === seleccionada.productoId ? detalleProducto.producto : null}
                nombreProducto={seleccionada.nombre}
              />
            )}
            <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-secondary/25">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Rendimiento en el período
              </h3>
              <dl className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">Unidades vendidas</dt>
                  <dd className="mt-0.5 font-display text-base font-bold tabular-nums text-slate-900 dark:text-white">
                    {formatearUnidades(seleccionada.cantidad)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">Venta neta</dt>
                  <dd className="mt-0.5 font-display text-base font-bold tabular-nums text-slate-900 dark:text-white">
                    {formatearMoneda(seleccionada.monto)}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        )}
      </Modal>
    </section>
  )
}
