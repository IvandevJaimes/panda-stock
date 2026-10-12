import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { AlertTriangle, Loader2, PackageX } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { EmptySearch } from '../../components/ui/EmptySearch'
import { Modal } from '../../components/ui/Modal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import { cn } from '../../lib/cn'
import { movimientosService } from '../../services/movimientos.service'
import { productosService } from '../../services/productos.service'
import { MOVIMIENTO_CONFIG } from '../inventory/movementVisuals'
import { SOMBRA_CARD } from './estilos'
import { ProductoDetalleBasico } from './ProductoDetalleBasico'
import { BarraFiltrosReporte, PaginacionReporte } from './TablaReporteUI'
import { formatearMoneda, formatearUnidades } from './reportsQuery'
import type { MovimientoStock, ProductoConLoteActivo } from '../../../electron/db/types'

const POR_PAGINA = 30

type PerdidaIndividual = MovimientoStock & {
  nombreProducto: string
  producto: ProductoConLoteActivo | null
  perdidaEstimada: number
}

function formatearMomento(fechaHora: string): string {
  const fecha = new Date(fechaHora)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

function DatoPerdida({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 border-b border-slate-100 py-2 dark:border-slate-800">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {etiqueta}
      </dt>
      <dd className="break-words text-sm font-semibold text-slate-800 dark:text-slate-200">
        {valor}
      </dd>
    </div>
  )
}

function DetallePerdida({ perdida }: { perdida: PerdidaIndividual }) {
  const config = MOVIMIENTO_CONFIG[perdida.tipo]
  const Icono = config.icon

  return (
    <div className="flex flex-col gap-4">
      <ProductoDetalleBasico
        producto={perdida.producto}
        nombreProducto={perdida.nombreProducto}
      />

      <section className="flex min-w-0 items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-900/50 dark:bg-rose-950/20">
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', config.iconClases)}>
          <Icono className="h-4 w-4" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold', config.badgeClases)}>
            {config.label}
          </span>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
            {formatearMomento(perdida.fechaHora)}
          </p>
        </div>
        <p className="shrink-0 font-display text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400">
          −{formatearUnidades(Math.abs(perdida.cantidad))}
          <span className="ml-1 text-xs font-medium">und</span>
        </p>
      </section>

      <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        <DatoPerdida etiqueta="Lote afectado" valor={perdida.loteId === null ? 'Sin lote asociado' : `Lote #${perdida.loteId}`} />
        <DatoPerdida etiqueta="Pérdida estimada" valor={formatearMoneda(perdida.perdidaEstimada)} />
        <DatoPerdida etiqueta="Stock anterior" valor={perdida.stockAnterior === null ? '—' : formatearUnidades(perdida.stockAnterior)} />
        <DatoPerdida etiqueta="Stock posterior" valor={perdida.stockPosterior === null ? '—' : formatearUnidades(perdida.stockPosterior)} />
        <div className="flex min-w-0 flex-col gap-0.5 border-b border-slate-100 py-2 dark:border-slate-800 sm:col-span-2">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Motivo
          </dt>
          <dd className="whitespace-pre-wrap break-words text-sm font-semibold text-slate-800 dark:text-slate-200">
            {perdida.motivo?.trim() || 'Sin motivo registrado'}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export function PerdidasPanel({
  desde,
  hasta,
}: {
  desde: string | null
  hasta: string | null
}) {
  const [movimientos, setMovimientos] = useState<PerdidaIndividual[] | null>(null)
  const [error, setError] = useState(false)
  const [recarga, setRecarga] = useState(0)
  const [buscar, setBuscar] = useState('')
  const [pagina, setPagina] = useState(1)
  const [seleccionada, setSeleccionada] = useState<PerdidaIndividual | null>(null)

  useEffect(() => {
    let vigente = true
    Promise.all([
      movimientosService.getAll({ desde: desde ?? undefined, hasta: hasta ?? undefined }),
      productosService.getAll(),
    ]).then(([lista, productos]) => {
      if (!vigente) return
      const productosPorId = new Map(productos.map((producto) => [producto.id, producto]))
      const filas = lista
        .filter((movimiento) => movimiento.tipo === 'merma')
        .map((movimiento): PerdidaIndividual => {
          const producto = movimiento.productoId === null
            ? null
            : productosPorId.get(movimiento.productoId) ?? null
          return {
            ...movimiento,
            producto,
            nombreProducto: movimiento.productoId === null
              ? 'Sin producto asociado'
              : producto?.nombre ?? `Producto #${movimiento.productoId}`,
            perdidaEstimada: producto
              ? Math.abs(movimiento.cantidad) * producto.costo
              : 0,
          }
        })
      setMovimientos(filas)
    }).catch(() => {
      if (!vigente) return
      setError(true)
      setMovimientos([])
    })

    return () => { vigente = false }
  }, [desde, hasta, recarga])

  const filtradas = useMemo(() => {
    const consulta = buscar.trim().toLocaleLowerCase('es-AR')
    return (movimientos ?? []).filter((movimiento) => {
      if (!consulta) return true
      return [
        movimiento.nombreProducto,
        movimiento.motivo ?? '',
        formatearMomento(movimiento.fechaHora),
        String(movimiento.id),
        movimiento.loteId === null ? '' : String(movimiento.loteId),
      ].some((valor) => valor.toLocaleLowerCase('es-AR').includes(consulta))
    })
  }, [movimientos, buscar])
  const visibles = useMemo(
    () => filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    [filtradas, pagina],
  )

  const limpiarFiltros = () => {
    setBuscar('')
    setPagina(1)
  }
  const abrirConTeclado = (evento: KeyboardEvent<HTMLTableRowElement>, perdida: PerdidaIndividual) => {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault()
      setSeleccionada(perdida)
    }
  }
  const reintentar = () => {
    setError(false)
    setMovimientos(null)
    setRecarga((actual) => actual + 1)
  }

  return (
    <>
      <section className={cn('w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827]', SOMBRA_CARD)}>
        <header className="flex items-start gap-2.5 px-4 py-3.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <PackageX size={15} aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Historial de mermas
            </h3>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              Cada registro de pérdida del período, ordenado del más reciente al más antiguo.
            </p>
          </div>
        </header>

        <BarraFiltrosReporte
          buscar={buscar}
          onBuscarChange={(valor) => { setBuscar(valor); setPagina(1) }}
          onClearFilters={limpiarFiltros}
          hayFiltrosActivos={buscar.trim() !== ''}
          placeholder="Buscar producto, motivo, fecha o lote"
          total={filtradas.length}
        />

        {movimientos === null ? (
          <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-400 dark:text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Cargando mermas del período…
          </div>
        ) : error ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-2 px-4 text-center">
            <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No se pudieron cargar las mermas del período.
            </p>
            <Button variant="outline" size="sm" onClick={reintentar}>Reintentar</Button>
          </div>
        ) : filtradas.length === 0 ? movimientos.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No se registraron mermas en el período.
          </p>
        ) : (
          <EmptySearch onClear={limpiarFiltros} />
        ) : (
          <>
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha y hora</TableHead>
                    <TableHead>Producto y motivo</TableHead>
                    <TableHead>Lote afectado</TableHead>
                    <TableHead className="text-right">Unidades</TableHead>
                    <TableHead className="text-right">Pérdida estimada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibles.map((perdida) => (
                    <TableRow
                      key={perdida.id}
                      tabIndex={0}
                      aria-label={`Ver detalle de merma ${perdida.id}: ${perdida.nombreProducto}`}
                      onClick={() => setSeleccionada(perdida)}
                      onKeyDown={(evento) => abrirConTeclado(evento, perdida)}
                      className="cursor-pointer odd:bg-white even:bg-slate-50/70 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-500 dark:odd:bg-[#111827] dark:even:bg-slate-900/35 dark:hover:bg-slate-800/70"
                    >
                      <TableCell className="whitespace-nowrap text-xs tabular-nums text-slate-500 dark:text-slate-400">
                        {formatearMomento(perdida.fechaHora)}
                      </TableCell>
                      <TableCell>
                        <p className="max-w-80 truncate font-medium text-slate-900 dark:text-white">
                          {perdida.nombreProducto}
                        </p>
                        {perdida.motivo && (
                          <p className="max-w-80 truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {perdida.motivo}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs font-medium tabular-nums text-slate-600 dark:text-slate-300">
                        {perdida.loteId === null ? 'Sin lote' : `Lote #${perdida.loteId}`}
                      </TableCell>
                      <TableCell className="text-right font-display font-bold tabular-nums text-rose-600 dark:text-rose-400">
                        −{formatearUnidades(Math.abs(perdida.cantidad))}
                      </TableCell>
                      <TableCell className="text-right font-display font-bold tabular-nums text-rose-600 dark:text-rose-400">
                        {formatearMoneda(perdida.perdidaEstimada)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="lg:hidden">
              {visibles.map((perdida, indice) => (
                <li
                  key={perdida.id}
                  className={cn(
                    'border-b border-slate-100 dark:border-slate-800/60',
                    indice % 2 === 0
                      ? 'bg-slate-50/60 dark:bg-slate-900/20'
                      : 'bg-white dark:bg-transparent',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSeleccionada(perdida)}
                    className="w-full cursor-pointer px-3 py-3 text-left transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-500 dark:hover:bg-slate-800/70"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {perdida.nombreProducto}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {formatearMomento(perdida.fechaHora)} · {perdida.loteId === null ? 'Sin lote' : `Lote #${perdida.loteId}`}
                        </p>
                      </div>
                      <span className="shrink-0 font-display text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">
                        {formatearMoneda(perdida.perdidaEstimada)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {perdida.motivo?.trim() || 'Sin motivo registrado'}
                      </p>
                      <span className="shrink-0 text-[11px] font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                        −{formatearUnidades(Math.abs(perdida.cantidad))} unidades
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            <PaginacionReporte
              pagina={pagina}
              tamanoPagina={POR_PAGINA}
              total={filtradas.length}
              onCambiarPagina={setPagina}
            />
          </>
        )}
      </section>

      <Modal
        isOpen={seleccionada !== null}
        onClose={() => setSeleccionada(null)}
        title={`Detalle de merma${seleccionada ? ` #${seleccionada.id}` : ''}`}
        subtitle={seleccionada ? formatearMomento(seleccionada.fechaHora) : undefined}
        headerIcon={<PackageX size={18} aria-hidden="true" />}
        maxWidth="xl"
        footer={(
          <Button variant="outline" onClick={() => setSeleccionada(null)}>
            Cerrar
          </Button>
        )}
      >
        {seleccionada && <DetallePerdida perdida={seleccionada} />}
      </Modal>
    </>
  )
}
