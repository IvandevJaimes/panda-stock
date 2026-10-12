import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { History, Loader2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { CustomSelect } from '../../components/ui/CustomSelect'
import { EmptySearch } from '../../components/ui/EmptySearch'
import { Modal } from '../../components/ui/Modal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import { cn } from '../../lib/cn'
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner'
import { ScanBadge } from '../inventory/ScanBadge'
import { movimientosService } from '../../services/movimientos.service'
import { productosService } from '../../services/productos.service'
import { MOVIMIENTO_CONFIG } from '../inventory/movementVisuals'
import { SOMBRA_CARD } from './estilos'
import { BarraFiltrosReporte, PaginacionReporte } from './TablaReporteUI'
import { formatearUnidades } from './reportsQuery'
import { ProductoDetalleBasico } from './ProductoDetalleBasico'
import type { MovimientoPorTipo, MovimientoStock, ProductoConLoteActivo, TipoMovimientoStock } from '../../../electron/db/types'

const POR_PAGINA = 30
const OPCIONES_TIPO = [
  { value: 'todos', label: 'Todos los tipos' },
  ...Object.entries(MOVIMIENTO_CONFIG).map(([value, config]) => ({ value, label: config.label })),
]

function formatearMomento(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

type MovimientoConNombre = MovimientoStock & {
  nombreProducto: string
  producto: ProductoConLoteActivo | null
}
type FiltroTipo = 'todos' | TipoMovimientoStock
type MovimientosRecientesProps = {
  desde: string | null
  hasta: string | null
  filasPorTipo: MovimientoPorTipo[]
  buscarInicial?: string
}

function DatoMovimiento({ etiqueta, valor }: { etiqueta: string; valor: string }) {
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

function DetalleMovimiento({ movimiento }: { movimiento: MovimientoConNombre }) {
  const config = MOVIMIENTO_CONFIG[movimiento.tipo]
  const Icono = config.icon

  return (
    <div className="flex flex-col gap-4">
      <ProductoDetalleBasico
        producto={movimiento.producto}
        nombreProducto={movimiento.nombreProducto}
      />

      <section className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-secondary/25">
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', config.iconClases)}>
          <Icono className="h-4 w-4" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold', config.badgeClases)}>
            {config.label}
          </span>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
            {movimiento.nombreProducto}
          </p>
        </div>
        <p className={cn('shrink-0 font-display text-lg font-bold tabular-nums', config.cantidadClases)}>
          {config.signo === 1 ? '+' : '−'}{formatearUnidades(movimiento.cantidad)}
          <span className="ml-1 text-xs font-medium">und</span>
        </p>
      </section>

      <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        <DatoMovimiento etiqueta="Stock anterior" valor={movimiento.stockAnterior === null ? '—' : formatearUnidades(movimiento.stockAnterior)} />
        <DatoMovimiento etiqueta="Stock posterior" valor={movimiento.stockPosterior === null ? '—' : formatearUnidades(movimiento.stockPosterior)} />
        {movimiento.loteId !== null && (
          <DatoMovimiento etiqueta="Lote" valor={`#${movimiento.loteId}`} />
        )}
        {movimiento.ventaId !== null && (
          <DatoMovimiento etiqueta="Venta asociada" valor={`#${movimiento.ventaId}`} />
        )}
        <div className="flex min-w-0 flex-col gap-0.5 border-b border-slate-100 py-2 dark:border-slate-800 sm:col-span-2">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Motivo
          </dt>
          <dd className="whitespace-pre-wrap break-words text-sm font-semibold text-slate-800 dark:text-slate-200">
            {movimiento.motivo?.trim() || 'Sin motivo registrado'}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export function MovimientosRecientes({ desde, hasta, filasPorTipo, buscarInicial = '' }: MovimientosRecientesProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const seccionRef = useRef<HTMLElement>(null)
  const scrollAtendido = useRef(false)
  const [movimientos, setMovimientos] = useState<MovimientoConNombre[] | null>(null)
  const [buscar, setBuscar] = useState(buscarInicial)
  const [tipo, setTipo] = useState<FiltroTipo>('todos')
  const [pagina, setPagina] = useState(1)
  const [barcodeEscaneado, setBarcodeEscaneado] = useState<string | null>(null)
  const [productoEscaneadoId, setProductoEscaneadoId] = useState<number | null>(null)
  const [movimientoSeleccionado, setMovimientoSeleccionado] = useState<MovimientoConNombre | null>(null)

  useEffect(() => {
    let vigente = true
    Promise.all([
      movimientosService.getAll({ desde: desde ?? undefined, hasta: hasta ?? undefined }),
      productosService.getAll(),
    ]).then(([lista, productos]) => {
      if (!vigente) return
      const productosPorId = new Map(productos.map((producto) => [producto.id, producto]))
      setMovimientos(lista.map((movimiento) => ({
        ...movimiento,
        producto: movimiento.productoId === null
          ? null
          : productosPorId.get(movimiento.productoId) ?? null,
        nombreProducto: movimiento.productoId === null
          ? 'Sin producto asociado'
          : (productosPorId.get(movimiento.productoId)?.nombre ?? `Producto #${movimiento.productoId}`),
      })))
    }).catch(() => {
      if (vigente) setMovimientos([])
    })
    return () => { vigente = false }
  }, [desde, hasta])

  useEffect(() => {
    if (movimientos === null || searchParams.get('scroll') !== 'movimientos' || scrollAtendido.current) return
    const seccion = seccionRef.current
    if (!seccion) return

    seccion.scrollIntoView({ behavior: 'smooth', block: 'start' })
    scrollAtendido.current = true
    const parametros = new URLSearchParams(searchParams)
    parametros.delete('scroll')
    setSearchParams(parametros, { replace: true })
  }, [movimientos, searchParams, setSearchParams])

  const resumenPorTipo = useMemo(() => {
    const porTipo = new Map(filasPorTipo.map((fila) => [fila.tipo, fila]))
    return (Object.keys(MOVIMIENTO_CONFIG) as TipoMovimientoStock[]).map((tipoMovimiento) =>
      porTipo.get(tipoMovimiento) ?? { tipo: tipoMovimiento, cantidad: 0, unidades: 0 },
    )
  }, [filasPorTipo])

  const buscarPorEscaneo = async (barcode: string) => {
    const producto = await productosService.scan(barcode)
    if (!producto) {
      toast.error(`No existe ningún producto con el código "${barcode}"`)
      setBarcodeEscaneado(null)
      setProductoEscaneadoId(null)
      return
    }

    if (!producto.activo) {
      toast.error(`El producto "${producto.nombre}" está desactivado: no aparece en la búsqueda`)
      setBarcodeEscaneado(null)
      setProductoEscaneadoId(null)
      return
    }

    setBuscar('')
    setTipo('todos')
    setBarcodeEscaneado(barcode)
    setProductoEscaneadoId(producto.id)
    setPagina(1)
    seccionRef.current?.querySelector<HTMLInputElement>('input')?.focus()
  }

  useBarcodeScanner(
    'reportes-movimientos',
    (barcode) => { void buscarPorEscaneo(barcode) },
    movimientoSeleccionado === null,
  )

  const filtrados = useMemo(() => {
    const consulta = buscar.trim().toLocaleLowerCase('es-AR')
    return (movimientos ?? []).filter((movimiento) => {
      if (productoEscaneadoId !== null && movimiento.productoId !== productoEscaneadoId) return false
      if (tipo !== 'todos' && movimiento.tipo !== tipo) return false
      if (!consulta) return true
      const tipoMovimiento = MOVIMIENTO_CONFIG[movimiento.tipo].label
      return [
        movimiento.nombreProducto,
        movimiento.motivo ?? '',
        tipoMovimiento,
        formatearMomento(movimiento.fechaHora),
        String(movimiento.id),
        movimiento.ventaId === null ? '' : String(movimiento.ventaId),
      ].some((valor) => valor.toLocaleLowerCase('es-AR').includes(consulta))
    })
  }, [movimientos, buscar, tipo, productoEscaneadoId])
  const visibles = useMemo(
    () => filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    [filtrados, pagina],
  )

  const limpiarEscaneo = () => {
    setBarcodeEscaneado(null)
    setProductoEscaneadoId(null)
  }
  const cambiarBusqueda = (valor: string) => {
    setBuscar(valor)
    limpiarEscaneo()
    setPagina(1)
  }
  const cambiarTipo = (valor: string | number) => {
    setTipo(String(valor) as FiltroTipo)
    limpiarEscaneo()
    setPagina(1)
  }
  const seleccionarTipo = (tipoSeleccionado: TipoMovimientoStock) => {
    setTipo((tipoActual) => tipoActual === tipoSeleccionado ? 'todos' : tipoSeleccionado)
    setBuscar('')
    limpiarEscaneo()
    setPagina(1)
  }
  const limpiarFiltros = () => {
    setBuscar('')
    setTipo('todos')
    limpiarEscaneo()
    setPagina(1)
  }

  return (
    <>
      <section className={cn('mb-4 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-[#111827]', SOMBRA_CARD)}>
        <header className="mb-3">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Movimientos por tipo
          </h3>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
            Seleccioná un tipo para filtrar el historial del período.
          </p>
        </header>
        <ul className="grid grid-cols-3 gap-2 sm:gap-3">
          {resumenPorTipo.map((fila) => {
            const config = MOVIMIENTO_CONFIG[fila.tipo]
            const Icono = config.icon
            const seleccionado = tipo === fila.tipo
            return (
              <li key={fila.tipo}>
                <button
                  type="button"
                  aria-pressed={seleccionado}
                  onClick={() => seleccionarTipo(fila.tipo)}
                  className={cn(
                    'flex w-full min-w-0 cursor-pointer flex-row items-start gap-2.5 rounded-xl border p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-emerald-500',
                    seleccionado
                      ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-400/40 dark:border-emerald-700 dark:bg-emerald-950/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-[#111827] dark:hover:bg-slate-900',
                  )}
                >
                  <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', config.iconClases)}>
                    <Icono size={15} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-xs font-bold leading-tight text-slate-800 dark:text-slate-100">
                      {config.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                      {fila.cantidad} {fila.cantidad === 1 ? 'movimiento' : 'movimientos'}
                    </span>
                    <span className={cn('mt-0.5 block text-[13px] font-bold leading-snug tabular-nums', config.cantidadClases)}>
                      {config.signo === 1 ? '+' : '−'}{formatearUnidades(fila.unidades)} unidades
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section id="reporte-tabla-movimientos" ref={seccionRef} className={cn('scroll-mt-4 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827]', SOMBRA_CARD)}>
        <header className="flex items-start gap-2.5 px-4 py-3.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <History size={15} />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Historial de movimientos
            </h3>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              Seleccioná un movimiento para ver el cambio de stock, el motivo y sus referencias.
            </p>
          </div>
        </header>

        <BarraFiltrosReporte
          buscar={buscar}
          onBuscarChange={cambiarBusqueda}
          onClearFilters={limpiarFiltros}
          hayFiltrosActivos={buscar.trim() !== '' || tipo !== 'todos' || barcodeEscaneado !== null}
          placeholder="Buscar producto, tipo o motivo"
          total={filtrados.length}
        >
          <div className="w-full sm:w-48">
            <CustomSelect value={tipo} options={OPCIONES_TIPO} onChange={cambiarTipo} buttonClassName="h-10 text-xs" />
          </div>
        </BarraFiltrosReporte>

        {movimientos === null ? (
          <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-400 dark:text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Cargando movimientos del período…
          </div>
        ) : filtrados.length === 0 ? movimientos.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No hay movimientos de stock en este período.
          </p>
        ) : (
          <EmptySearch onClear={limpiarFiltros} />
        ) : (
          <>
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Momento</TableHead>
                    <TableHead>Producto y motivo</TableHead>
                    <TableHead>Lote afectado</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Cambio</TableHead>
                    <TableHead className="text-right">Stock posterior</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibles.map((movimiento) => {
                    const config = MOVIMIENTO_CONFIG[movimiento.tipo]
                    const Icono = config.icon
                    return (
                      <TableRow
                        key={movimiento.id}
                        tabIndex={0}
                        aria-label={`Ver detalle del movimiento ${movimiento.id}: ${config.label}, ${movimiento.nombreProducto}`}
                        onClick={() => setMovimientoSeleccionado(movimiento)}
                        onKeyDown={(evento) => {
                          if (evento.key === 'Enter' || evento.key === ' ') {
                            evento.preventDefault()
                            setMovimientoSeleccionado(movimiento)
                          }
                        }}
                        className={cn(
                          'cursor-pointer odd:bg-white even:bg-slate-50/70 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-500 dark:odd:bg-[#111827] dark:even:bg-slate-900/35 dark:hover:bg-slate-800/70',
                        )}
                      >
                        <TableCell className="whitespace-nowrap text-xs tabular-nums text-slate-500 dark:text-slate-400">
                          {formatearMomento(movimiento.fechaHora)}
                        </TableCell>
                        <TableCell>
                          <p className="max-w-80 truncate font-medium text-slate-900 dark:text-white">
                            {movimiento.nombreProducto}
                          </p>
                          {movimiento.motivo && (
                            <p className="max-w-80 truncate text-[11px] text-slate-500 dark:text-slate-400">
                              {movimiento.motivo}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs font-medium tabular-nums text-slate-600 dark:text-slate-300">
                          {movimiento.loteId === null ? 'Sin lote' : `Lote #${movimiento.loteId}`}
                        </TableCell>
                        <TableCell>
                          <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold', config.badgeClases)}>
                            <Icono size={13} aria-hidden />
                            {config.label}
                          </span>
                        </TableCell>
                        <TableCell className={cn('text-right font-display font-bold tabular-nums', config.cantidadClases)}>
                          {config.signo === 1 ? '+' : '−'}{formatearUnidades(movimiento.cantidad)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-slate-600 dark:text-slate-300">
                          {movimiento.stockPosterior === null ? '—' : formatearUnidades(movimiento.stockPosterior)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <ul className="lg:hidden">
              {visibles.map((movimiento, indice) => {
                const config = MOVIMIENTO_CONFIG[movimiento.tipo]
                const Icono = config.icon
                return (
                  <li
                    key={movimiento.id}
                    className={cn(
                      'border-b border-slate-100 dark:border-slate-800/60',
                      indice % 2 === 0 ? 'bg-slate-50/60 dark:bg-slate-900/20' : 'bg-white dark:bg-transparent',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setMovimientoSeleccionado(movimiento)}
                      className="w-full cursor-pointer px-3 py-3 text-left transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-500 dark:hover:bg-slate-800/70"
                    >
                      <div className="flex items-start gap-3">
                        <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg', config.iconClases)}>
                          <Icono size={15} aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {movimiento.nombreProducto}
                            </p>
                            <span className={cn('shrink-0 font-display text-sm font-bold tabular-nums', config.cantidadClases)}>
                              {config.signo === 1 ? '+' : '−'}{formatearUnidades(movimiento.cantidad)}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', config.badgeClases)}>
                              {config.label}
                            </span>
                            {movimiento.motivo && (
                              <span className="min-w-0 truncate text-[11px] text-slate-500 dark:text-slate-400">
                                {movimiento.motivo}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                            {formatearMomento(movimiento.fechaHora)}
                            {movimiento.stockPosterior !== null && ` · Stock: ${formatearUnidades(movimiento.stockPosterior)}`}
                            {` · ${movimiento.loteId === null ? 'Sin lote' : `Lote #${movimiento.loteId}`}`}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>

            <PaginacionReporte pagina={pagina} tamanoPagina={POR_PAGINA} total={filtrados.length} onCambiarPagina={setPagina} />
          </>
        )}
      </section>

      {barcodeEscaneado !== null && createPortal(
        <ScanBadge
          key={barcodeEscaneado}
          barcode={barcodeEscaneado}
          onClose={limpiarEscaneo}
        />,
        document.body,
      )}

      <Modal
        isOpen={movimientoSeleccionado !== null}
        onClose={() => setMovimientoSeleccionado(null)}
        title={`Detalle del movimiento${movimientoSeleccionado ? ` #${movimientoSeleccionado.id}` : ''}`}
        subtitle={movimientoSeleccionado ? formatearMomento(movimientoSeleccionado.fechaHora) : undefined}
        headerIcon={<History size={18} aria-hidden="true" />}
        maxWidth="xl"
        footer={(
          <Button variant="outline" onClick={() => setMovimientoSeleccionado(null)}>
            Cerrar
          </Button>
        )}
      >
        {movimientoSeleccionado && <DetalleMovimiento movimiento={movimientoSeleccionado} />}
      </Modal>
    </>
  )
}
