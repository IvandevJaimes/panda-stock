import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownRight,
  BarChart3,
  FileSpreadsheet,
  Loader2,
  PackageX,
  Receipt,
  RefreshCw,
  RotateCw,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { KpiCard } from '../../components/ui/KpiCard'
import { LoadingState } from '../../components/ui/LoadingState'
import { Tooltip } from '../../components/ui/Tooltip'
import { cn } from '../../lib/cn'
import { cajasService } from '../../services/cajas.service'
import { reportesService } from '../../services/reportes.service'
import { BotonDatosPrueba } from './BotonDatosPrueba'
import { CajaResumen } from './CajaResumen'
import { DevolucionesPanel } from './DevolucionesPanel'
import { HistorialVentas } from './HistorialVentas'
import { MetodosPagoChart } from './MetodosPagoChart'
import { CortesPanel, MovimientosPanel, PerdidasPanel } from './PanelesPestana'
import { RankingProductos } from './RankingProductos'
import { VentasPorDiaChart } from './VentasPorDiaChart'
import { SOMBRA_CARD } from './estilos'
import {
  PESTANAS_REPORTES,
  metricasDePestana,
  type PestanaReportes,
  type TonoMetrica,
} from './metricasPestana'
import {
  agruparMetodos,
  construirEjeDias,
  construirRanking,
  etiquetaPeriodo,
  formatearRangoLegible,
  rangoDesdePreset,
  siguientePeriodo,
  totalCredito,
  type PresetRango,
} from './reportsQuery'
import { construirExportacion } from './exportacionQuery'
import type { CajaConResponsable, CajaSummary, ReportesSummary } from '../../../electron/db/types'

/** Arranca en "Mes": el ciclo empieza en Día, y "Todo" no tiene eje diario que densificar. */
const PRESET_INICIAL: PresetRango = 'mes_actual'

const ICONO_TONO: Record<TonoMetrica, LucideIcon> = {
  emerald: TrendingUp,
  amber: Receipt,
  sky: ArrowDownRight,
  violet: BarChart3,
  rose: AlertTriangle,
}

const COLOR_TONO: Record<TonoMetrica, string> = {
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  sky: 'bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400',
  violet: 'bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
}

export function ReportesPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ContenidoReportes />
    </div>
  )
}

function ContenidoReportes() {
  const [pestana, setPestana] = useState<PestanaReportes>('ventas')
  const [preset, setPreset] = useState<PresetRango>(PRESET_INICIAL)
  const [resumen, setResumen] = useState<ReportesSummary | null>(null)
  const [caja, setCaja] = useState<CajaConResponsable | null>(null)
  const [resumenCaja, setResumenCaja] = useState<CajaSummary | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recarga, setRecarga] = useState(0)

  const rango = useMemo(() => rangoDesdePreset(preset), [preset])

  const avanzarPeriodo = useCallback(() => {
    setPreset((actual) => siguientePeriodo(actual))
  }, [])

  /*
    Reset durante el render (mismo patrón que `HistorialVentasModal`): el effect
    queda con una sola responsabilidad, pedir. Si el `setCargando(true)` viviera
    en el effect, el setState síncrono dispararía un render en cascada.
  */
  const claveFiltro = `${rango.desde}|${rango.hasta}|${recarga}`
  const [filtroAplicado, setFiltroAplicado] = useState(claveFiltro)

  if (filtroAplicado !== claveFiltro) {
    setFiltroAplicado(claveFiltro)
    setResumen(null)
    setResumenCaja(null)
    setCargando(true)
    setError(null)
  }

  const recargar = useCallback(() => setRecarga((valor) => valor + 1), [])

  useEffect(() => {
    let vigente = true

    Promise.all([
      reportesService.getSummary({
        desde: rango.desde ?? undefined,
        hasta: rango.hasta ?? undefined,
        topProductos: 10,
      }),
      cajasService.getActive(),
    ])
      .then(async ([datos, cajaActiva]) => {
        const resumenCajaActual = cajaActiva
          ? await cajasService.getSummary(cajaActiva.id)
          : null

        if (!vigente) return
        setResumen(datos)
        setCaja(cajaActiva)
        setResumenCaja(resumenCajaActual)
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
  }, [rango.desde, rango.hasta, recarga])

  const metodos = useMemo(() => agruparMetodos(resumen?.ventasPorMetodo ?? []), [resumen])
  const ranking = useMemo(
    () => construirRanking(resumen?.productosMasVendidos ?? [], resumen?.totalVentas ?? 0),
    [resumen],
  )
  const ejeDias = useMemo(
    () => construirEjeDias(resumen?.ventasPorDia ?? [], rango),
    [resumen, rango],
  )

  const etiquetaPreset = useMemo(() => etiquetaPeriodo(preset), [preset])

  const metricas = useMemo(() => metricasDePestana(pestana, resumen), [pestana, resumen])

  const [exportando, setExportando] = useState(false)

  const exportarReporte = useCallback(async () => {
    if (exportando || resumen === null) return

    setExportando(true)
    try {
      const input = construirExportacion({ pestana, resumen, rango })
      const ruta = await reportesService.exportarExcel({
        ...input,
        elegirCarpeta: true,
      })
      if (ruta === null) {
        toast.info('Exportación cancelada')
        return
      }
      toast.success('Reporte exportado', { description: ruta })
    } catch (fallo) {
      toast.error('No se pudo exportar el reporte', {
        description: fallo instanceof Error ? fallo.message : undefined,
      })
    } finally {
      setExportando(false)
    }
  }, [exportando, pestana, resumen, rango])

  const pestanaActiva = useMemo(
    () => PESTANAS_REPORTES.find((opcion) => opcion.valor === pestana) ?? PESTANAS_REPORTES[0]!,
    [pestana],
  )

  if (error !== null) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
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
    )
  }

  if (cargando && resumen === null) {
    return <LoadingState title="Cargando reportes..." description="Consultando ventas del período." />
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
      {/* Título + acciones, mismo estilo que el encabezado de Inventario */}
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            Reportes
          </h1>
          <Tooltip
            content={
              <span className="block">
                <span className="block font-display font-semibold">{formatearRangoLegible(rango)}</span>
                <span className="mt-0.5 block text-[11px] opacity-70">Clic para cambiar de período</span>
              </span>
            }
            delay={[200, 50]}
          >
            <button
              type="button"
              onClick={avanzarPeriodo}
              aria-label={`Período: ${etiquetaPreset}. Clic para cambiar.`}
              className={cn(
                'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-display text-sm font-bold text-emerald-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:outline-none dark:border-slate-700/80 dark:bg-slate-800 dark:text-emerald-400 dark:hover:border-emerald-600/60 dark:hover:bg-slate-700 dark:hover:text-emerald-300',
                cargando && 'animate-pulse',
              )}
            >
              {etiquetaPreset}
              <RefreshCw size={12} className={cn('transition-transform', cargando && 'animate-spin')} />
            </button>
          </Tooltip>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <BotonDatosPrueba alCambiar={recargar} />
        </div>
      </div>

      {/* Métricas de la pestaña activa */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricas.map((metrica) => {
          const Icono = ICONO_TONO[metrica.tono]

          return (
            <KpiCard
              key={metrica.titulo}
              icon={<Icono size={17} />}
              iconBgClass={COLOR_TONO[metrica.tono]}
              title={metrica.titulo}
              value={metrica.valor}
              subtitle={metrica.subtitulo}
              className={SOMBRA_CARD}
            />
          )
        })}
      </div>

      {/* Pestañas */}
      <div className={`flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-slate-800/80 dark:bg-[#111827] ${SOMBRA_CARD}`}>
        {PESTANAS_REPORTES.map((opcion) => {
          const activa = opcion.valor === pestana

          return (
            <button
              key={opcion.valor}
              type="button"
              onClick={() => setPestana(opcion.valor)}
              aria-pressed={activa}
              className={cn(
                'cursor-pointer rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                activa
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
              )}
            >
              {opcion.etiqueta}
            </button>
          )
        })}

        {/* Mismo estilo que las pestañas, pero es una acción: el ícono la
            distingue de las selecciones de la barra. */}
        <button
          type="button"
          onClick={exportarReporte}
          disabled={exportando || cargando}
          title="Elige la carpeta donde guardar la pestaña activa como .xlsx"
          className={cn(
            'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2',
            'text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
            'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
            'disabled:pointer-events-none disabled:opacity-60',
          )}
        >
          {exportando ? (
            <Loader2 size={14} className="shrink-0 animate-spin" />
          ) : (
            <FileSpreadsheet size={14} className="shrink-0" />
          )}
          {exportando ? 'Exportando…' : 'Exportar'}
        </button>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            {pestanaActiva.resumen}
          </span>
        </div>
      </div>

      {/* Contenido de la pestaña */}
      {pestana === 'ventas' && (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <VentasPorDiaChart puntos={ejeDias} />
            </div>
            <MetodosPagoChart filas={metodos} totalCredito={totalCredito(metodos)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <RankingProductos filas={ranking} />
            </div>
            <div className="space-y-4">
              <CajaResumen caja={caja} resumen={resumenCaja} />
            </div>
          </div>

          <HistorialVentas desde={rango.desde} hasta={rango.hasta} />

          <p className="flex items-center justify-center gap-1.5 pb-2 text-[11px] text-slate-400 dark:text-slate-500">
            <ShoppingCart size={12} />
            Los movimientos de stock están en la pestaña Movimientos.
          </p>
        </>
      )}

      {pestana === 'movimientos' && <MovimientosPanel resumen={resumen} />}

      {pestana === 'perdidas' && <PerdidasPanel resumen={resumen} />}

      {pestana === 'cortes' && <CortesPanel resumen={resumen} />}

      {pestana === 'devoluciones' && (
        <DevolucionesPanel
          desde={rango.desde}
          hasta={rango.hasta}
          onSuccess={recargar}
        />
      )}

      {pestana !== 'ventas' && pestana !== 'devoluciones' && (
        <p className="flex items-center justify-center gap-1.5 pb-2 text-[11px] text-slate-400 dark:text-slate-500">
          <PackageX size={12} />
          {pestana === 'perdidas'
            ? 'Las mermas se valoran al costo actual del producto, no al del día de la merma.'
            : pestana === 'cortes'
              ? 'Los cortes cuentan por la fecha en que se cerró la caja.'
              : pestana === 'movimientos'
                ? 'Las devoluciones aparecen como entradas de mercadería.'
                : 'Los tickets anulados no afectan el stock ni los ingresos.'}
        </p>
      )}
    </div>
  )
}
