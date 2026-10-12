import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, Ban, BookUser, History, Receipt } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CustomSelect } from '../../components/ui/CustomSelect'
import { Button } from '../../components/ui/Button'
import { EmptySearch } from '../../components/ui/EmptySearch'
import { LoadingState } from '../../components/ui/LoadingState'
import { Modal } from '../../components/ui/Modal'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table'
import { SOMBRA_CARD } from './estilos'
import { BarraFiltrosReporte, PaginacionReporte } from './TablaReporteUI'
import { ventasService } from '../../services/ventas.service'
import { cn } from '../../lib/cn'
import { formatearMoneda, formatearUnidades } from './reportsQuery'
import { AnularVentaModal } from '../pos/AnularVentaModal'
import { VentaHistorialItems } from '../pos/VentaHistorialCard'
import { ETIQUETAS_METODO } from '../pos/ventaHistorialUtils'
import { ModalContrasena } from '../seguridad/ModalContrasena'
import { useSettingsStore } from '../../stores/settings.store'
import type {
  EstadoVenta,
  ResultadoAnulacion,
  Venta,
  VentaDetalle,
  VentaHistorial,
} from '../../../electron/db/types'

/**
 * Tope de ventas que se traen del backend.
 *
 * `FiltrosVentas` no tiene `offset`, solo `limit`. No hay paginación real: se
 * pide una ventana acotada y se pagina en memoria. El rótulo lo aclara, porque
 * un total de "3 de 8" sin ese aviso se lee como que hay 3 ventas en el período.
 */
const TOPE = 200
const POR_PAGINA = 30

const ESTADOS: Record<EstadoVenta, { etiqueta: string; clase: string }> = {
  pendiente: {
    etiqueta: 'Pendiente de pago',
    clase: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  completada: {
    etiqueta: 'Completada',
    clase: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  anulada: { etiqueta: 'Anulada', clase: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
}

function DatoVenta({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 border-b border-slate-100 py-1.5 dark:border-slate-800">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {etiqueta}
      </span>
      <span className="min-w-0 text-sm font-semibold text-slate-800 dark:text-slate-200">
        {valor}
      </span>
    </div>
  )
}

function DetalleVentaContenido({ detalle }: { detalle: VentaDetalle }) {
  const { venta, pagos } = detalle
  const estado = ESTADOS[venta.estado]
  const unidades = detalle.items.reduce((total, item) => total + item.cantidad, 0)
  const pagosDirectos = pagos.filter((pago) => pago.metodo !== 'cuenta_corriente')
  const cuentaCorrienteActiva = detalle.totalCuentaCorriente > 0
  const ventaAnulada = venta.estado === 'anulada'
  const resumenSaldoCuenta = ventaAnulada
    ? 'Deuda cancelada por anulación'
    : detalle.saldoCuentaCorriente > 0
      ? 'Saldo pendiente de cobro'
      : 'Deuda saldada'

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-secondary/25">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="font-display text-sm font-bold tracking-tight text-slate-800 dark:text-slate-200">
            Productos del ticket
          </h3>
          <span className="font-display text-xs font-bold tabular-nums text-slate-500 dark:text-slate-400">
            N.º {venta.id}
          </span>
        </div>
        <div aria-hidden="true" className="border-t border-dashed border-slate-300 dark:border-slate-700" />
        {detalle.items.length === 0 ? (
          <p className="py-3 text-sm text-slate-500 dark:text-slate-400">Este ticket no tiene productos registrados.</p>
        ) : (
          <VentaHistorialItems items={detalle.items} className="max-h-40" />
        )}
        <div aria-hidden="true" className="mt-2.5 border-t border-dashed border-slate-300 dark:border-slate-700" />
        <p className="mt-2.5 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {formatearUnidades(unidades)} unidades
        </p>
      </section>

      <section className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Estado
          </span>
          <span className={cn('rounded-md px-2.5 py-1 text-xs font-semibold', estado.clase)}>
            {estado.etiqueta}
          </span>
        </div>
        {detalle.clienteNombre && (
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Cliente
            </span>
            <span className="min-w-0 break-words text-base font-semibold text-slate-800 dark:text-slate-100">
              {detalle.clienteNombre}
            </span>
          </div>
        )}
      </section>

      {detalle.clienteNotas?.trim() && (
        <section className="border-l-2 border-slate-300 pl-3 dark:border-slate-700">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Notas del cliente
          </h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
            {detalle.clienteNotas.trim()}
          </p>
        </section>
      )}

      {venta.estado === 'anulada' && (
        <section className="border-l-2 border-rose-400 pl-3 dark:border-rose-700">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
            Motivo de anulación
          </p>
          <p className="mt-0.5 text-sm text-rose-700 dark:text-rose-300">
            {venta.motivoAnulacion || 'Sin motivo registrado'}
            {venta.anuladoEn ? ` · ${formatearMomento(venta.anuladoEn)}` : ''}
          </p>
        </section>
      )}

      <section className="border-t border-slate-200 pt-3 dark:border-slate-800">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Resumen de la venta
        </h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
          <span className="text-right tabular-nums text-slate-700 dark:text-slate-300">{formatearMoneda(venta.subtotal)}</span>
          {venta.descuento > 0 && (
            <>
              <span className="text-slate-500 dark:text-slate-400">Descuento</span>
              <span className="text-right tabular-nums text-slate-700 dark:text-slate-300">−{formatearMoneda(venta.descuento)}</span>
            </>
          )}
          {venta.impuesto > 0 && (
            <>
              <span className="text-slate-500 dark:text-slate-400">Impuestos</span>
              <span className="text-right tabular-nums text-slate-700 dark:text-slate-300">{formatearMoneda(venta.impuesto)}</span>
            </>
          )}
          <span className="border-t border-slate-100 pt-2 font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-200">Total</span>
          <span className="border-t border-slate-100 pt-2 text-right font-display font-bold tabular-nums text-emerald-700 dark:border-slate-800 dark:text-emerald-400">
            {formatearMoneda(venta.total)}
          </span>
        </div>
      </section>

      {pagosDirectos.length > 0 && (
        <section className="border-t border-slate-200 pt-3 dark:border-slate-800">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Cobros al momento
          </h3>
          <ul className="flex flex-col">
            {pagosDirectos.map((pago) => (
              <li key={pago.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-1.5 text-sm last:border-0 dark:border-slate-800">
                <span className="min-w-0">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {ETIQUETAS_METODO[pago.metodo]}
                  </span>
                  {pago.referencia && (
                    <span className="ml-2 truncate text-xs text-slate-400">{pago.referencia}</span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-slate-700 dark:text-slate-300">
                  {formatearMoneda(pago.monto)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {cuentaCorrienteActiva && (
        <section className="border-l-2 border-amber-400 pl-3 dark:border-amber-700">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Cuenta corriente
            </h3>
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              {resumenSaldoCuenta}
            </span>
          </div>
          <div className="mt-1 grid grid-cols-1 gap-x-6 sm:grid-cols-3">
            <DatoVenta etiqueta="Crédito" valor={formatearMoneda(detalle.totalCuentaCorriente)} />
            {!ventaAnulada && (
              <DatoVenta etiqueta="Abonado" valor={formatearMoneda(detalle.abonosCuentaCorriente)} />
            )}
            <DatoVenta etiqueta="Pendiente" valor={formatearMoneda(detalle.saldoCuentaCorriente)} />
          </div>
        </section>
      )}
    </div>
  )
}

function formatearMomento(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

function convertirAHistorial(detalle: VentaDetalle): VentaHistorial {
  return {
    ...detalle.venta,
    unidades: detalle.items.reduce((total, item) => total + item.cantidad, 0),
    metodos: [...new Set(detalle.pagos.map((pago) => pago.metodo))],
    clienteNombre: detalle.clienteNombre,
    items: detalle.items,
  }
}

type HistorialVentasProps = {
  desde: string | null
  hasta: string | null
  onVentaAnulada: () => void
}

export function HistorialVentas({ desde, hasta, onVentaAnulada }: HistorialVentasProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const scrollAtendido = useRef(false)
  const [ventas, setVentas] = useState<Venta[] | null>(null)
  const [errorCarga, setErrorCarga] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [buscar, setBuscar] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState<'todas' | EstadoVenta>('todas')
  const [detalles, setDetalles] = useState<Map<number, VentaDetalle>>(new Map())
  const [detallesConError, setDetallesConError] = useState<Set<number>>(new Set())
  const [recarga, setRecarga] = useState(0)
  const [ventaSeleccionadaId, setVentaSeleccionadaId] = useState<number | null>(null)
  const [ventaAAnular, setVentaAAnular] = useState<VentaHistorial | null>(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')
  const [pedirPin, setPedirPin] = useState(false)
  const requiereContrasenaAnular = useSettingsStore((state) => state.proteccionesSeguridad.anularVentas)
  const resultadoAnulacion = useRef<ResultadoAnulacion | null>(null)

  /*
    `detalles` es a la vez caché y dato renderizado. La página actual pide 20
    filas y volver atrás con la paginación releería las mismas 10 en cada cambio
    de página: guardarlas acá evita esas idas al backend. La clave es el id de
    venta, así que el cacheo es seguro mientras el turno siga igual; si el filtro
    de fechas cambia, se limpia.
  */

  /*
    Reset durante el render, no en el effect (mismo patrón que
    `HistorialVentasModal`): el effect queda solo con la responsabilidad de pedir.
    Con `setPagina`/`setDetalles` adentro, el effect dispara renders en cascada.
  */
  const claveFiltro = `${desde}|${hasta}`
  const [filtroAplicado, setFiltroAplicado] = useState(claveFiltro)

  if (filtroAplicado !== claveFiltro) {
    setFiltroAplicado(claveFiltro)
    setVentas(null)
    setErrorCarga(false)
    setDetalles(new Map())
    setDetallesConError(new Set())
    setPagina(1)
    setBuscar('')
    setEstadoFiltro('todas')
    setVentaSeleccionadaId(null)
    setVentaAAnular(null)
    setPedirPin(false)
  }

  useEffect(() => {
    let vigente = true

    ventasService
      .getAll({ desde: desde ?? undefined, hasta: hasta ?? undefined, limit: TOPE })
      .then((lista) => {
        if (!vigente) return
        setErrorCarga(false)
        setVentas(lista)
      })
      .catch(() => {
        if (vigente) setErrorCarga(true)
      })

    return () => {
      vigente = false
    }
  }, [desde, hasta, recarga])

  useEffect(() => {
    if (ventas === null || searchParams.get('scroll') !== 'ventas' || scrollAtendido.current) return
    const tabla = document.getElementById('reporte-tabla-ventas')
    if (!tabla) return

    tabla.scrollIntoView({ behavior: 'smooth', block: 'start' })
    scrollAtendido.current = true
    const parametros = new URLSearchParams(searchParams)
    parametros.delete('scroll')
    setSearchParams(parametros, { replace: true })
  }, [ventas, searchParams, setSearchParams])

  const filtradas = useMemo(() => {
    if (!ventas) return []
    const consulta = buscar.trim().toLocaleLowerCase('es-AR')
    return ventas.filter((venta) => {
      if (estadoFiltro !== 'todas' && venta.estado !== estadoFiltro) return false
      if (!consulta) return true
      const estado = ESTADOS[venta.estado].etiqueta.toLocaleLowerCase('es-AR')
      return [String(venta.id), venta.fechaHora, formatearMoneda(venta.total), estado]
        .some((valor) => valor.toLocaleLowerCase('es-AR').includes(consulta))
    })
  }, [ventas, buscar, estadoFiltro])

  const visibles = useMemo(() => {
    if (ventas === null) return []
    const inicio = (pagina - 1) * POR_PAGINA
    return filtradas.slice(inicio, inicio + POR_PAGINA)
  }, [ventas, filtradas, pagina])

  /*
    Solo se pide el detalle de las filas visibles. Traer el detalle de las 200
    ventas del tope serían 200 idas al backend por cada cambio de filtro.
  */
  useEffect(() => {
    const faltantes = visibles
      .map((venta) => venta.id)
      .filter((id) => !detalles.has(id) && !detallesConError.has(id))

    if (faltantes.length === 0) return

    let vigente = true

    Promise.all(
      faltantes.map((id) =>
        ventasService.getDetail(id).then((detalle) => ({ id, detalle })),
      ),
    ).then((resultados) => {
      if (!vigente) return

      setDetalles((previas) => {
        const siguiente = new Map(previas)
        for (const { id, detalle } of resultados) {
          if (detalle) siguiente.set(id, detalle)
        }
        return siguiente
      })
      setDetallesConError((previos) => {
        const siguientes = new Set(previos)
        for (const { id, detalle } of resultados) {
          if (detalle) siguientes.delete(id)
          else siguientes.add(id)
        }
        return siguientes
      })
    })
      .catch(() => {
        if (!vigente) return
        setDetallesConError((previos) => new Set([...previos, ...faltantes]))
      })

    return () => {
      vigente = false
    }
  }, [visibles, detalles, detallesConError])

  const enviarAnulacion = async (
    pin: string,
    ventaId = ventaAAnular?.id,
    motivo = motivoAnulacion,
  ): Promise<boolean> => {
    if (!ventaId || (requiereContrasenaAnular && !pin.trim())) return false

    const resultado = await ventasService.anular({ ventaId, motivo, pin })
    resultadoAnulacion.current = resultado
    return resultado !== null
  }

  const cerrarAnulacion = () => {
    setPedirPin(false)
    setMotivoAnulacion('')
    setVentaAAnular(null)
  }

  const completarAnulacion = () => {
    const resultado = resultadoAnulacion.current
    resultadoAnulacion.current = null
    cerrarAnulacion()
    setVentaSeleccionadaId(null)
    setDetalles(new Map())
    setDetallesConError(new Set())
    setRecarga((valor) => valor + 1)

    if (resultado) {
      onVentaAnulada()
      const reintegros = resultado.reintegros
        .map(({ metodo, monto }) => `${ETIQUETAS_METODO[metodo]} ${formatearMoneda(monto)}`)
        .join(' · ')
      toast.success(`Venta #${resultado.ventaId} anulada`, {
        description: `Reintegros registrados: ${reintegros || 'ninguno'} · Deuda cancelada: ${formatearMoneda(resultado.deudaCancelada)} · ${resultado.unidadesRestituidas} ${resultado.unidadesRestituidas === 1 ? 'unidad' : 'unidades'} reintegradas`,
      })
    }
  }

  const detalleSeleccionado = ventaSeleccionadaId === null
    ? null
    : detalles.get(ventaSeleccionadaId) ?? null
  const fechaSeleccionada = ventaSeleccionadaId === null
    ? null
    : ventas?.find((venta) => venta.id === ventaSeleccionadaId) ?? null
  const reintentarVentas = () => {
    setErrorCarga(false)
    setVentas(null)
    setRecarga((actual) => actual + 1)
  }
  const reintentarDetalle = (ventaId: number) => {
    setDetallesConError((previos) => {
      const siguientes = new Set(previos)
      siguientes.delete(ventaId)
      return siguientes
    })
  }
  const limpiarFiltros = () => {
    setBuscar('')
    setEstadoFiltro('todas')
    setPagina(1)
  }

  if (errorCarga) {
    return (
      <section className={`flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-white px-4 text-center dark:border-amber-900/50 dark:bg-[#111827] ${SOMBRA_CARD}`}>
        <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No se pudieron cargar las ventas. No se muestran como un período vacío.
        </p>
        <Button variant="outline" size="sm" onClick={reintentarVentas}>Reintentar</Button>
      </section>
    )
  }

  if (ventas === null) {
    return (
      <section className={`w-full rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] ${SOMBRA_CARD}`}>
        <p className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
          Cargando ventas...
        </p>
      </section>
    )
  }

  return (
    <>
    <section id="reporte-tabla-ventas" className={`scroll-mt-4 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] ${SOMBRA_CARD}`}>
      <header className="flex items-start justify-between gap-3 px-4 py-3.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <History size={15} />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Historial de ventas
            </h3>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              {ventas.length >= TOPE
                ? `Últimas ${TOPE} ventas del período, de un total que puede ser mayor.`
                : 'Ventas del período seleccionado, de la más reciente a la más antigua.'}
            </p>
          </div>
        </div>
      </header>

      <BarraFiltrosReporte
        buscar={buscar}
        onBuscarChange={(valor) => {
          setBuscar(valor)
          setPagina(1)
        }}
        onClearFilters={limpiarFiltros}
        hayFiltrosActivos={buscar.trim() !== '' || estadoFiltro !== 'todas'}
        placeholder="Buscar por ticket, fecha o importe"
        total={filtradas.length}
      >
        <div className="w-full sm:w-44">
          <CustomSelect
            value={estadoFiltro}
            options={[
              { value: 'todas', label: 'Todos los estados' },
              { value: 'pendiente', label: 'Pendientes de pago' },
              { value: 'completada', label: 'Completadas' },
              { value: 'anulada', label: 'Anuladas' },
            ]}
            onChange={(valor) => {
              setEstadoFiltro(valor as 'todas' | EstadoVenta)
              setPagina(1)
            }}
            buttonClassName="h-10 text-xs"
          />
        </div>
      </BarraFiltrosReporte>

      {filtradas.length === 0 ? ventas.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
          No hay ventas registradas en el período seleccionado.
        </p>
      ) : (
        <EmptySearch onClear={limpiarFiltros} />
      ) : (
        <>
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">N.º</TableHead>
                  <TableHead>Momento</TableHead>
                  <TableHead>Medios de pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((venta) => {
                  const detalle = detalles.get(venta.id)
                  const metodos = detalle ? [...new Set(detalle.pagos.map((pago) => pago.metodo))] : null
                  const esCuentaCorriente = metodos?.includes('cuenta_corriente') ?? false
                  const estado = ESTADOS[venta.estado]
                  const clasesFondo = esCuentaCorriente
                    ? 'odd:bg-amber-50/60 even:bg-amber-100/40 dark:odd:bg-amber-950/20 dark:even:bg-amber-950/30'
                    : 'odd:bg-white even:bg-slate-50/70 dark:odd:bg-[#111827] dark:even:bg-slate-900/35'

                  return (
                    <TableRow
                      key={venta.id}
                      tabIndex={0}
                      aria-label={`Ver detalle de la venta ${venta.id}`}
                      onClick={() => setVentaSeleccionadaId(venta.id)}
                      onKeyDown={(evento) => {
                        if (evento.key === 'Enter' || evento.key === ' ') {
                          evento.preventDefault()
                          setVentaSeleccionadaId(venta.id)
                        }
                      }}
                      className={cn(
                        'cursor-pointer hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-500 dark:hover:bg-slate-800/70',
                        clasesFondo,
                      )}
                    >
                      <TableCell className="font-display font-bold tabular-nums text-slate-900 dark:text-white">
                        <span className="flex items-center gap-2">
                          {venta.id}
                          {esCuentaCorriente && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                              <BookUser size={12} aria-hidden="true" />
                              CC
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums text-slate-500 dark:text-slate-400">
                        {formatearMomento(venta.fechaHora)}
                      </TableCell>
                      <TableCell className="min-w-44">
                        {metodos === null ? (
                          <span className="text-slate-300 dark:text-slate-600">...</span>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <Receipt size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
                              {metodos.length === 0
                                ? '—'
                                : metodos.map((metodo) => ETIQUETAS_METODO[metodo]).join(' + ')}
                            </span>
                            {esCuentaCorriente && detalle?.clienteNombre && (
                              <span className="truncate pl-[1.1875rem] text-[11px] text-amber-700 dark:text-amber-300">
                                Cliente: {detalle.clienteNombre}
                              </span>
                            )}
                            {esCuentaCorriente && detalle && venta.estado !== 'anulada' && (
                              <span className="pl-[1.1875rem] text-[11px] tabular-nums text-amber-700 dark:text-amber-300">
                                Abonado en CC: {formatearMoneda(detalle.abonosCuentaCorriente)}
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-block rounded-full px-2 py-0.5 text-[11px] font-medium',
                            estado.clase,
                          )}
                        >
                          {estado.etiqueta}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-display font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                        {formatearMoneda(venta.total)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <ul className="lg:hidden">
            {visibles.map((venta, indice) => {
              const estado = ESTADOS[venta.estado]
              const detalle = detalles.get(venta.id)
              const metodos = detalle ? [...new Set(detalle.pagos.map((pago) => pago.metodo))] : null
              const esCuentaCorriente = metodos?.includes('cuenta_corriente') ?? false
              return (
                <li
                  key={venta.id}
                  className={cn(
                    'border-b border-slate-100 dark:border-slate-800/60',
                    esCuentaCorriente
                      ? 'bg-amber-50/60 dark:bg-amber-950/20'
                      : indice % 2 === 0
                        ? 'bg-slate-50/60 dark:bg-slate-900/20'
                        : 'bg-white dark:bg-transparent',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setVentaSeleccionadaId(venta.id)}
                    className="w-full cursor-pointer px-3 py-3 text-left transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-500 dark:hover:bg-slate-800/70"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-sm font-bold text-slate-900 dark:text-white">
                          Ticket #{venta.id}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {formatearMomento(venta.fechaHora)}
                        </p>
                      </div>
                      <span className="shrink-0 font-display text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                        {formatearMoneda(venta.total)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-semibold', estado.clase)}>
                        {estado.etiqueta}
                      </span>
                      {esCuentaCorriente && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                          <BookUser size={12} aria-hidden="true" />
                          Cuenta corriente
                        </span>
                      )}
                    </div>
                    {esCuentaCorriente && detalle?.clienteNombre && (
                      <p className="mt-1.5 truncate text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        Cliente: {detalle.clienteNombre}
                      </p>
                    )}
                    {esCuentaCorriente && detalle && venta.estado !== 'anulada' && (
                      <p className="mt-1.5 pl-0.5 text-[11px] tabular-nums text-amber-700 dark:text-amber-300">
                        Abonado: {formatearMoneda(detalle.abonosCuentaCorriente)}
                      </p>
                    )}
                  </button>
                </li>
              )
            })}
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
      isOpen={ventaSeleccionadaId !== null}
      onClose={() => setVentaSeleccionadaId(null)}
      title={`Detalle de venta #${ventaSeleccionadaId ?? ''}`}
      subtitle={fechaSeleccionada ? formatearMomento(fechaSeleccionada.fechaHora) : undefined}
      headerIcon={<Receipt size={18} aria-hidden="true" />}
      maxWidth="2xl"
      height="h-[82vh]"
      footer={(
        <div className="flex w-full gap-3">
          <Button variant="outline" onClick={() => setVentaSeleccionadaId(null)}>
            Cerrar
          </Button>
          {detalleSeleccionado && detalleSeleccionado.venta.estado !== 'anulada' && (
            <Button
              variant="danger"
              size="lg"
              icon={<Ban size={17} aria-hidden="true" />}
              className="flex-1"
              onClick={() => setVentaAAnular(convertirAHistorial(detalleSeleccionado))}
            >
              Anular venta
            </Button>
          )}
        </div>
      )}
    >
      {detalleSeleccionado ? (
        <DetalleVentaContenido detalle={detalleSeleccionado} />
      ) : ventaSeleccionadaId !== null && detallesConError.has(ventaSeleccionadaId) ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
          <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            No se pudo cargar el detalle de esta venta.
          </p>
          <Button variant="outline" size="sm" onClick={() => reintentarDetalle(ventaSeleccionadaId)}>
            Reintentar
          </Button>
        </div>
      ) : (
        <LoadingState title="Cargando detalle de venta..." />
      )}
    </Modal>

    <AnularVentaModal
      venta={ventaAAnular}
      isOpen={ventaAAnular !== null && !pedirPin}
      requiereContrasena={requiereContrasenaAnular}
      onClose={cerrarAnulacion}
      onConfirmar={(motivo) => {
        setMotivoAnulacion(motivo)
        const venta = ventaAAnular
        if (!venta) return
        if (requiereContrasenaAnular) {
          setPedirPin(true)
          return
        }
        setVentaAAnular(null)
        void enviarAnulacion('', venta.id, motivo)
          .then((valida) => {
            if (valida) completarAnulacion()
            else toast.error('No se pudo anular la venta')
          })
          .catch((error: unknown) => {
            toast.error(error instanceof Error ? error.message : 'No se pudo anular la venta')
          })
      }}
    />

    {pedirPin && ventaAAnular && (
      <ModalContrasena
        titulo="Autorizar anulación"
        etiquetaCancelar="Cancelar"
        etiquetaConfirmar="Confirmar anulación"
        confirmarVariant="danger"
        confirmarIcon={<Ban size={16} aria-hidden="true" />}
        onSubmit={enviarAnulacion}
        onSuccess={completarAnulacion}
        onCancelar={() => setPedirPin(false)}
      />
    )}
    </>
  )
}
