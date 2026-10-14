import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  AlertTriangle,
  ArrowDownRight,
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
  Loader2,
  PackageX,
  Receipt,
  RotateCw,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import { toast } from 'sonner'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingState } from '../../components/ui/LoadingState'
import { Modal } from '../../components/ui/Modal'
import { PeriodNav } from '../../components/ui/periodNav/PeriodNav'
import { cn } from '../../lib/cn'
import { productosService } from '../../services/productos.service'
import { reportesService } from '../../services/reportes.service'
import { HistorialVentas } from './HistorialVentas'
import { MetodosPagoChart } from './MetodosPagoChart'
import { MetodosPagoResumen } from './MetodosPagoResumen'
import { CortesPanel } from './CortesPanel'
import { MovimientosPanel } from './PanelesPestana'
import { PerdidasPanel } from './PerdidasPanel'
import { RankingProductos } from './RankingProductos'
import { ReporteKpiCard } from './ReporteKpiCard'
import { VentasPorDiaChart } from './VentasPorDiaChart'
import { SOMBRA_CARD } from './estilos'
import {
  PESTANAS_REPORTES,
  metricasDePestana,
  type PestanaReportes,
  type TonoMetrica,
} from './metricasPestana'
import {
  construirEjeDias,
  construirRanking,
  rangoDesdePeriodo,
  type PeriodoReporte,
  type RangoFechas,
} from './reportsQuery'
import type { ReportesSummary } from '../../../electron/db/types'

const ICONO_TONO: Record<TonoMetrica, LucideIcon> = {
  emerald: TrendingUp,
  amber: Receipt,
  sky: ArrowDownRight,
  violet: BarChart3,
  rose: AlertTriangle,
}

const RETRASOS_METRICAS = ['stagger-1', 'stagger-2', 'stagger-3', 'stagger-4'] as const
const CLASE_NOTA = 'flex items-start gap-2 rounded-xl border border-slate-200/80 bg-white/75 px-3 py-2.5 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300'

function formatearRangoExportacion(rango: RangoFechas): string {
  const formatear = (fecha: string) => {
    const valor = new Date(fecha)
    return Number.isNaN(valor.getTime())
      ? `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}/${fecha.slice(0, 4)}`
      : valor.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  if (rango.desde && rango.hasta) {
    const desde = formatear(rango.desde)
    const hasta = formatear(rango.hasta)
    return desde === hasta ? desde : `${desde} - ${hasta}`
  }
  if (rango.desde) return `Desde ${formatear(rango.desde)}`
  if (rango.hasta) return `Hasta ${formatear(rango.hasta)}`
  return 'Todo el historial'
}

function describirPeriodoExportacion(periodo: PeriodoReporte, cursor: Date): string {
  if (periodo === 'day') {
    return cursor.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  }
  if (periodo === 'month') {
    return cursor.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  }
  return String(cursor.getFullYear())
}

function tieneActividadEnPeriodo(resumen: ReportesSummary): boolean {
  return resumen.cantVentas > 0
    || resumen.totalCobrado !== 0
    || resumen.movimientos.cantidad > 0
    || resumen.perdidas.cantidadMermas > 0
    || resumen.cortes.cantidad > 0
}

const COLOR_TONO: Record<TonoMetrica, string> = {
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  sky: 'bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400',
  violet: 'bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
}

const FONDO_TONO: Record<TonoMetrica, string> = {
  emerald: 'border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/20',
  amber: 'border-amber-200/80 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/20',
  sky: 'border-sky-200/80 bg-sky-50/80 dark:border-sky-900/60 dark:bg-sky-950/20',
  violet: 'border-violet-200/80 bg-violet-50/80 dark:border-violet-900/60 dark:bg-violet-950/20',
  rose: 'border-rose-200/80 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/20',
}

const VALOR_TONO: Record<TonoMetrica, string> = {
  emerald: 'text-emerald-700 dark:text-emerald-400',
  amber: 'text-amber-700 dark:text-amber-300',
  sky: 'text-sky-700 dark:text-sky-300',
  violet: 'text-violet-700 dark:text-violet-300',
  rose: 'text-rose-700 dark:text-rose-400',
}

type ReportesPestanaContextValue = {
  pestana: PestanaReportes
  setPestana: Dispatch<SetStateAction<PestanaReportes>>
}

type ReportesPeriodoContextValue = {
  periodo: PeriodoReporte
  setPeriodo: Dispatch<SetStateAction<PeriodoReporte>>
  cursor: Date
  setCursor: Dispatch<SetStateAction<Date>>
  onToday: () => void
}

const ReportesPestanaContext = createContext<ReportesPestanaContextValue | null>(null)
const ReportesPeriodoContext = createContext<ReportesPeriodoContextValue | null>(null)

export function ReportesPage() {
  return <ContenidoReportes />
}

function ContenidoReportes() {
  const [searchParams] = useSearchParams()
  const [pestana, setPestana] = useState<PestanaReportes>(() => {
    const destino = searchParams.get('tab')
    return destino === 'movimientos' ? 'movimientos' : 'ventas'
  })
  const [periodo, setPeriodo] = useState<PeriodoReporte>('month')
  const [cursor, setCursor] = useState(() => new Date())
  const [resumen, setResumen] = useState<ReportesSummary | null>(null)
  const [inventarioCargado, setInventarioCargado] = useState<{
    recarga: number
    valor: number | null
    disponible: boolean
  } | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recarga, setRecarga] = useState(0)

  const rango = useMemo(
    () => rangoDesdePeriodo(periodo, cursor),
    [periodo, cursor],
  )

  /*
    Reset durante el render (mismo patrón que `HistorialVentasModal`): el effect
    queda con una sola responsabilidad, pedir. Si el `setCargando(true)` viviera
    en el effect, el setState síncrono dispararía un render en cascada.
  */
  const claveFiltro = `${rango.desde}|${rango.hasta}|${recarga}`
  const [filtroAplicado, setFiltroAplicado] = useState(claveFiltro)

  if (filtroAplicado !== claveFiltro) {
    setFiltroAplicado(claveFiltro)
    setCargando(true)
    setError(null)
  }

  const recargar = useCallback(() => setRecarga((valor) => valor + 1), [])
  const irAHoy = useCallback(() => setCursor(new Date()), [])
  const contextoPestana = useMemo(
    () => ({ pestana, setPestana }),
    [pestana],
  )
  const contextoPeriodo = useMemo(
    () => ({ periodo, setPeriodo, cursor, setCursor, onToday: irAHoy }),
    [periodo, cursor, irAHoy],
  )
  useEffect(() => {
    let vigente = true

    reportesService.getSummary({
      desde: rango.desde ?? undefined,
      hasta: rango.hasta ?? undefined,
      topProductos: 10,
    })
      .then((datos) => {
        if (!vigente) return
        setResumen(datos)
      })
      .catch((fallo: unknown) => {
        if (!vigente) return
        setError(fallo instanceof Error ? fallo.message : 'No se pudieron cargar los reportes')
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })

    return () => {
      vigente = false
    }
  }, [rango, recarga])

  useEffect(() => {
    let vigente = true

    productosService.getAll()
      .then((productos) => {
        if (!vigente) return
        const valor = productos.reduce(
          (total, producto) => total + producto.stockActual * producto.costo,
          0,
        )
        setInventarioCargado({
          recarga,
          valor: Math.round(valor * 100) / 100,
          disponible: true,
        })
      })
      .catch(() => {
        if (vigente) setInventarioCargado({ recarga, valor: null, disponible: false })
      })

    return () => {
      vigente = false
    }
  }, [recarga])

  const ranking = useMemo(
    () => construirRanking(resumen?.productosMasVendidos ?? [], resumen?.totalVentas ?? 0),
    [resumen],
  )
  const rankingIngresos = useMemo(
    () => construirRanking(resumen?.productosMayorIngreso ?? [], resumen?.totalVentas ?? 0),
    [resumen],
  )
  const ejeDias = useMemo(
    () => construirEjeDias(resumen?.ventasPorDia ?? [], rango),
    [resumen, rango],
  )
  const inventarioActual = inventarioCargado?.recarga === recarga
    ? inventarioCargado
    : null

  const metricas = useMemo(
    () => metricasDePestana(
      pestana,
      resumen,
      inventarioActual?.valor ?? null,
      inventarioActual?.disponible ?? true,
    ),
    [pestana, resumen, inventarioActual],
  )
  const periodoSinDatos = resumen !== null && !tieneActividadEnPeriodo(resumen)
  const movimientosSinDatos = pestana === 'movimientos'
    && resumen !== null
    && resumen.movimientos.cantidad === 0
  const mostrarEstadoVacio = movimientosSinDatos
    || (periodoSinDatos
      && pestana !== 'movimientos'
      && !(pestana === 'ventas' && searchParams.get('tab') === 'ventas'))

  if (cargando && resumen === null) {
    return (
      <LoadingState
        title="Cargando reportes..."
        description="Consultando ventas del período."
        fullPage
      />
    )
  }

  return (
    <div className="w-full space-y-4 py-4">
      <EncabezadoReportes
        periodo={periodo}
        cursor={cursor}
        estadoDatos={cargando || resumen === null
          ? 'cargando'
          : error !== null
            ? 'error'
            : periodoSinDatos
              ? 'sin-datos'
              : 'disponible'}
      />

      <ReportesPestanaContext.Provider value={contextoPestana}>
        <ReportesPeriodoContext.Provider value={contextoPeriodo}>
          <ReportesToolbar />
        </ReportesPeriodoContext.Provider>
      </ReportesPestanaContext.Provider>

      {cargando ? (
        <LoadingState
          title="Cargando reportes..."
          description="Consultando ventas del período."
          fullPage
        />
      ) : error !== null ? (
        <div className="flex min-h-[60vh] items-center justify-center py-6">
          <div className="max-w-md text-center">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle size={20} />
            </span>
            <p className="mt-3 font-display text-sm font-semibold text-slate-900 dark:text-white">
              No se pudieron cargar los reportes
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{error}</p>
            <Button variant="outline" onClick={recargar} className="mt-4">
              <RotateCw size={14} />
              Reintentar
            </Button>
          </div>
        </div>
      ) : mostrarEstadoVacio ? (
        <EmptyState
          className="min-h-[55vh]"
          icon={<PackageX size={22} />}
          title={movimientosSinDatos ? 'Sin movimientos en este período' : 'Sin datos en este período'}
          description={movimientosSinDatos
            ? 'No hay movimientos de stock registrados en el período seleccionado.'
            : 'No hay ventas, movimientos, pérdidas ni cortes registrados en el período seleccionado.'}
        />
      ) : (
        <div className="px-1 flex flex-col gap-4">
          {/* Métricas de la pestaña activa */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {metricas.map((metrica, index) => {
              const Icono = ICONO_TONO[metrica.tono]

              return (
                <ReporteKpiCard
                  key={metrica.titulo}
                  icon={<Icono size={17} />}
                  iconBgClass={COLOR_TONO[metrica.tono]}
                  title={metrica.titulo}
                  value={metrica.valor}
                  valueClassName={metrica.valorClassName ?? VALOR_TONO[metrica.tono]}
                  subtitle={metrica.subtitulo}
                  action={pestana === 'ventas' && metrica.titulo === 'Mermas valuadas'
                    ? { label: 'Ver pérdidas', onClick: () => setPestana('perdidas') }
                    : undefined}
                  className={cn(
                    SOMBRA_CARD,
                    FONDO_TONO[metrica.tono],
                    'animate-entry-up',
                    RETRASOS_METRICAS[index] ?? 'stagger-4',
                  )}
                />
              )
            })}
          </div>

          {pestana === 'ventas' && (
            <p className={cn(CLASE_NOTA, '-mt-1')}>
              <Info size={15} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>
                El saldo resta las mermas con costo histórico disponible y las ventas netas descuentan devoluciones.
                No descuenta el costo de ventas; las mermas sin costo histórico quedan fuera del importe.
              </span>
            </p>
          )}

          {/* Contenido de la pestaña */}
          {pestana === 'ventas' && (
            <>
              <div className="grid gap-4 xl:grid-cols-3 animate-entry-up stagger-1">
                <div className="xl:col-span-2">
                  <VentasPorDiaChart puntos={ejeDias} />
                </div>
                <MetodosPagoChart pagosPorMetodo={resumen?.ventasPorMetodo ?? []} />
              </div>

              <div className="animate-entry-up stagger-2">
                <MetodosPagoResumen pagosPorMetodo={resumen?.ventasPorMetodo ?? []} />
              </div>

              <div className="grid gap-4 xl:grid-cols-2 animate-entry-up stagger-3">
                <RankingProductos filas={ranking} criterio="unidades" />
                <RankingProductos filas={rankingIngresos} criterio="ingresos" />
              </div>

              <div className="animate-entry-up stagger-4">
                <HistorialVentas
                  key={`${rango.desde}|${rango.hasta}`}
                  desde={rango.desde}
                  hasta={rango.hasta}
                  onVentaAnulada={recargar}
                />
              </div>

              <p className={cn(CLASE_NOTA, 'mx-auto max-w-2xl animate-entry-up stagger-4')}>
                <ShoppingCart size={15} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span>Los movimientos de stock están en la pestaña Movimientos.</span>
              </p>
            </>
          )}

          {pestana === 'movimientos' && (
            <div className="animate-entry-up stagger-1">
              <MovimientosPanel
                key={`${rango.desde}|${rango.hasta}`}
                resumen={resumen}
                desde={rango.desde}
                hasta={rango.hasta}
                buscarInicial={searchParams.get('producto') ?? ''}
              />
            </div>
          )}

          {pestana === 'perdidas' && (
            <div className="animate-entry-up stagger-1">
              <PerdidasPanel
                key={`${rango.desde}|${rango.hasta}`}
                resumen={resumen?.perdidas ?? null}
              />
            </div>
          )}

          {pestana === 'cortes' && (
            <div className="animate-entry-up stagger-1">
              <CortesPanel key={`${rango.desde}|${rango.hasta}`} resumen={resumen} />
            </div>
          )}

          {pestana !== 'ventas' && (
            <p className={cn(CLASE_NOTA, 'mx-auto max-w-2xl animate-entry-up stagger-2')}>
              <PackageX size={15} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>
                {pestana === 'perdidas'
                  ? 'Las mermas se muestran por cantidad de unidades descartadas.'
                  : pestana === 'cortes'
                    ? 'Los cortes cuentan por la fecha en que se cerró la caja.'
                    : 'Las devoluciones históricas aparecen como entradas de mercadería.'}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

const EncabezadoReportes = memo(function EncabezadoReportes({
  periodo,
  cursor,
  estadoDatos,
}: {
  periodo: PeriodoReporte
  cursor: Date
  estadoDatos: 'cargando' | 'error' | 'sin-datos' | 'disponible'
}) {
  return (
    <div className="flex items-center justify-between gap-3 animate-entry-up">
      <h1 className="min-w-0 font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
        Reportes
      </h1>
      <BotonExportarReporte periodo={periodo} cursor={cursor} estadoDatos={estadoDatos} />
    </div>
  )
})

const BotonExportarReporte = memo(function BotonExportarReporte({
  periodo,
  cursor,
  estadoDatos,
}: {
  periodo: PeriodoReporte
  cursor: Date
  estadoDatos: 'cargando' | 'error' | 'sin-datos' | 'disponible'
}) {
  const [formatoExportando, setFormatoExportando] = useState<'excel' | 'pdf' | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const rangoExportacion = useMemo(
    () => rangoDesdePeriodo(periodo, cursor),
    [cursor, periodo],
  )
  const periodoExportado = formatearRangoExportacion(rangoExportacion)
  const descripcionPeriodo = describirPeriodoExportacion(periodo, cursor)
  const exportacionBloqueada = estadoDatos !== 'disponible' || formatoExportando !== null

  const abrirModal = useCallback(() => {
    setModalAbierto(true)
  }, [])

  const iniciarExportacion = useCallback(async (formato: 'excel' | 'pdf') => {
    if (estadoDatos !== 'disponible' || formatoExportando !== null) return
    setModalAbierto(false)
    setFormatoExportando(formato)
    try {
      const ruta = await reportesService.exportar({
        formato,
        desde: rangoExportacion.desde,
        hasta: rangoExportacion.hasta,
      })
      if (ruta === null) {
        toast.info('Exportación cancelada')
        return
      }
      toast.success(`Reporte ${formato === 'excel' ? 'Excel' : 'PDF'} exportado`, { description: ruta })
    } catch (fallo) {
      toast.error('No se pudo exportar el reporte', {
        description: fallo instanceof Error ? fallo.message : undefined,
      })
    } finally {
      setFormatoExportando(null)
    }
  }, [estadoDatos, formatoExportando, rangoExportacion])

  return (
    <>
      <Button
        onClick={abrirModal}
        disabled={formatoExportando !== null}
        aria-label={formatoExportando ? 'Exportando reporte' : 'Exportar reportes'}
        title="Exporta todos los reportes del período elegido, sin aplicar filtros de búsqueda"
        variant="primary"
        className="h-10 shrink-0 gap-2 rounded-2xl px-4 text-sm font-bold shadow-xs sm:h-12 sm:px-6 sm:text-base"
      >
        {formatoExportando ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : <Download className="h-5 w-5 shrink-0" />}
        {formatoExportando ? 'Exportando…' : 'Exportar'}
      </Button>
      <Modal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title="Exportar reportes"
        subtitle="Revisá el período y elegí el formato del archivo."
        headerIcon={<FileSpreadsheet size={18} />}
        maxWidth="xl"
        footer={(
          <Button variant="outline" onClick={() => setModalAbierto(false)}>
            Cerrar
          </Button>
        )}
      >
        <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Período seleccionado</p>
            <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">{descripcionPeriodo}</p>
          </div>
          <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Fechas incluidas</p>
            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{periodoExportado}</p>
          </div>
        </div>
        {estadoDatos !== 'disponible' && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300"
          >
            <Info size={17} className="shrink-0" aria-hidden="true" />
            <span>
              {estadoDatos === 'sin-datos'
                ? 'No hay datos para exportar en el período seleccionado.'
                : estadoDatos === 'error'
                  ? 'No se pudieron comprobar los datos del período. Reintentá cargar los reportes.'
                  : 'Comprobando los datos del período…'}
            </span>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void iniciarExportacion('excel')}
            disabled={exportacionBloqueada}
            className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-800 transition-colors hover:border-emerald-400 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/70"
          >
            {formatoExportando === 'excel'
              ? <Loader2 size={32} className="animate-spin" />
              : <FileSpreadsheet size={32} aria-hidden="true" />}
            <span className="text-base font-bold">Exportar a Excel</span>
            <span className="text-xs font-medium text-emerald-700/80 dark:text-emerald-300/80">
              Registros del período en pestañas separadas
            </span>
          </button>
          <button
            type="button"
            onClick={() => void iniciarExportacion('pdf')}
            disabled={exportacionBloqueada}
            className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center text-rose-800 transition-colors hover:border-rose-400 hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:border-rose-700 dark:hover:bg-rose-950/70"
          >
            {formatoExportando === 'pdf'
              ? <Loader2 size={32} className="animate-spin" />
              : <FileText size={32} aria-hidden="true" />}
            <span className="text-base font-bold">Exportar a PDF</span>
            <span className="text-xs font-medium text-rose-700/80 dark:text-rose-300/80">
              Métricas y resúmenes, sin listados completos
            </span>
          </button>
        </div>
      </Modal>
    </>
  )
})

const ReportesToolbar = memo(function ReportesToolbar() {
  return (
    <div className="sticky top-0 z-30 w-full bg-[#f4f6f8] dark:bg-[#0b0f17] will-change-transform">
      <div className="relative flex w-full min-w-0 flex-col gap-3 pt-3 pb-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <ReportesPestanas />
        <ReportesPeriodo />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-full h-3 bg-gradient-to-b from-slate-900/10 to-transparent dark:from-black/45"
        />
      </div>
    </div>
  )
})

const ReportesPestanas = memo(function ReportesPestanas() {
  const contexto = useContext(ReportesPestanaContext)
  if (contexto === null) throw new Error('ReportesPestanas requiere ReportesPestanaContext')

  return (
    <div className="order-2 flex flex-wrap items-center gap-1.5 lg:order-1">
      {PESTANAS_REPORTES.map((opcion) => {
        const activa = opcion.valor === contexto.pestana

        return (
          <button
            key={opcion.valor}
            type="button"
            onClick={() => contexto.setPestana(opcion.valor)}
            aria-pressed={activa}
            className={cn(
              'shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-4 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
              activa
                ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs'
                : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300',
            )}
          >
            {opcion.etiqueta}
          </button>
        )
      })}
    </div>
  )
})

const ReportesPeriodo = memo(function ReportesPeriodo() {
  const contexto = useContext(ReportesPeriodoContext)
  if (contexto === null) throw new Error('ReportesPeriodo requiere ReportesPeriodoContext')

  return (
    <div className="order-1 flex w-full min-w-0 justify-start overflow-visible lg:order-2 lg:w-auto lg:justify-end">
      <div className="min-w-0 max-w-full">
        <PeriodNav
          period={contexto.periodo}
          onPeriodChange={contexto.setPeriodo}
          cursor={contexto.cursor}
          onCursorChange={contexto.setCursor}
          onToday={contexto.onToday}
        />
      </div>
    </div>
  )
})
