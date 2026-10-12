import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownRight,
  BarChart3,
  FileSpreadsheet,
  Loader2,
  PackageX,
  Receipt,
  RotateCw,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/LoadingState'
import { PeriodNav } from '../../components/ui/periodNav/PeriodNav'
import { cn } from '../../lib/cn'
import { cajasService } from '../../services/cajas.service'
import { reportesService } from '../../services/reportes.service'
import { CajaResumen } from './CajaResumen'
import { DevolucionesPanel } from './DevolucionesPanel'
import { HistorialVentas } from './HistorialVentas'
import { MetodosPagoChart } from './MetodosPagoChart'
import { CortesPanel, MovimientosPanel, PerdidasPanel } from './PanelesPestana'
import { RankingProductos } from './RankingProductos'
import { ReporteKpiCard } from './ReporteKpiCard'
import { ResultadoNetoVentas } from './ResultadoNetoVentas'
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
  rangoDesdePeriodo,
  totalTarjetaCuentaCorriente,
  type PeriodoReporte,
} from './reportsQuery'
import { construirExportacion } from './exportacionQuery'
import type { CajaConResponsable, CajaSummary, ReportesSummary } from '../../../electron/db/types'

const ICONO_TONO: Record<TonoMetrica, LucideIcon> = {
  emerald: TrendingUp,
  amber: Receipt,
  sky: ArrowDownRight,
  violet: BarChart3,
  rose: AlertTriangle,
}

const RETRASOS_METRICAS = ['stagger-1', 'stagger-2', 'stagger-3', 'stagger-4'] as const

const COLOR_TONO: Record<TonoMetrica, string> = {
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  sky: 'bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400',
  violet: 'bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
}

export function ReportesPage() {
  return <ContenidoReportes />
}

function ContenidoReportes() {
  const [pestana, setPestana] = useState<PestanaReportes>('ventas')
  const [periodo, setPeriodo] = useState<PeriodoReporte>('month')
  const [cursor, setCursor] = useState(() => new Date())
  const [resumen, setResumen] = useState<ReportesSummary | null>(null)
  const [caja, setCaja] = useState<CajaConResponsable | null>(null)
  const [resumenCaja, setResumenCaja] = useState<CajaSummary | null>(null)
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
        topProductos: 100,
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

  if (error !== null) {
    return (
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
    )
  }

  if (cargando && resumen === null) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingState
          title="Cargando reportes..."
          description="Consultando ventas del período."
          fullPage
        />
      </div>
    )
  }

  return (
    <div className="w-full space-y-4 py-4">
      <div className="flex items-center justify-between gap-3 animate-entry-up">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            Reportes
          </h1>
        </div>
        <Button
          onClick={exportarReporte}
          disabled={exportando || cargando}
          aria-label={exportando ? 'Exportando reporte' : 'Exportar reporte'}
          title="Elige la carpeta donde guardar la pestaña activa como .xlsx"
          variant="primary"
          className="h-10 shrink-0 gap-2 rounded-2xl px-4 text-sm font-bold shadow-xs sm:h-12 sm:px-6 sm:text-base"
        >
          {exportando ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-5 w-5 shrink-0" />
          )}
          {exportando ? 'Exportando…' : 'Exportar'}
        </Button>
      </div>

      <div className="sticky top-0 z-30 w-full bg-[#f4f6f8] dark:bg-[#0b0f17]">
        <div className="relative flex w-full min-w-0 flex-col gap-3 pt-3 pb-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="order-2 flex flex-wrap items-center gap-1.5 xl:order-1">
            {PESTANAS_REPORTES.map((opcion) => {
              const activa = opcion.valor === pestana

              return (
                <button
                  key={opcion.valor}
                  type="button"
                  onClick={() => setPestana(opcion.valor)}
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

          <div className="order-1 flex w-full min-w-0 justify-start overflow-visible xl:order-2 xl:w-auto">
            <div className="min-w-0 max-w-full">
              <PeriodNav
                period={periodo}
                onPeriodChange={setPeriodo}
                cursor={cursor}
                onCursorChange={setCursor}
                onToday={() => setCursor(new Date())}
              />
            </div>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-full h-3 bg-gradient-to-b from-slate-900/10 to-transparent dark:from-black/45"
          />
        </div>
      </div>

      {pestana === 'ventas' && resumen !== null && (
        <ResultadoNetoVentas
          ventasNetas={resumen.totalVentas}
          costoVendido={resumen.totalCosto}
          perdidasMermas={resumen.perdidas.plataPerdida}
        />
      )}

      {/* Métricas de la pestaña activa */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricas.map((metrica, index) => {
          const Icono = ICONO_TONO[metrica.tono]

          return (
            <ReporteKpiCard
              key={metrica.titulo}
              icon={<Icono size={17} />}
              iconBgClass={COLOR_TONO[metrica.tono]}
              title={metrica.titulo}
              value={metrica.valor}
              subtitle={metrica.subtitulo}
              className={cn(
                SOMBRA_CARD,
                'animate-entry-up',
                RETRASOS_METRICAS[index] ?? 'stagger-4',
              )}
            />
          )
        })}
      </div>

      {/* Contenido de la pestaña */}
      {pestana === 'ventas' && (
        <>
          <div className="grid gap-4 xl:grid-cols-3 animate-entry-up stagger-1">
            <div className="xl:col-span-2">
              <VentasPorDiaChart puntos={ejeDias} />
            </div>
            <MetodosPagoChart filas={metodos} totalTarjetaCuentaCorriente={totalTarjetaCuentaCorriente(metodos)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-3 animate-entry-up stagger-2">
            <div className="xl:col-span-2">
              <RankingProductos key={`${rango.desde}|${rango.hasta}`} filas={ranking} />
            </div>
            <div className="space-y-4">
              <CajaResumen caja={caja} resumen={resumenCaja} />
            </div>
          </div>

          <div className="animate-entry-up stagger-3">
            <HistorialVentas key={`${rango.desde}|${rango.hasta}`} desde={rango.desde} hasta={rango.hasta} />
          </div>

          <p className="flex items-center justify-center gap-1.5 pb-2 text-[11px] text-slate-400 dark:text-slate-500 animate-entry-up stagger-4">
            <ShoppingCart size={12} />
            Los movimientos de stock están en la pestaña Movimientos.
          </p>
        </>
      )}

      {pestana === 'movimientos' && (
        <div className="animate-entry-up stagger-1">
          <MovimientosPanel key={`${rango.desde}|${rango.hasta}`} resumen={resumen} desde={rango.desde} hasta={rango.hasta} />
        </div>
      )}

      {pestana === 'perdidas' && (
        <div className="animate-entry-up stagger-1">
          <PerdidasPanel key={`${rango.desde}|${rango.hasta}`} resumen={resumen} />
        </div>
      )}

      {pestana === 'cortes' && (
        <div className="animate-entry-up stagger-1">
          <CortesPanel key={`${rango.desde}|${rango.hasta}`} resumen={resumen} />
        </div>
      )}

      {pestana === 'devoluciones' && (
        <div className="animate-entry-up stagger-1">
          <DevolucionesPanel
            desde={rango.desde}
            hasta={rango.hasta}
            onSuccess={recargar}
          />
        </div>
      )}

      {pestana !== 'ventas' && pestana !== 'devoluciones' && (
        <p className="flex items-center justify-center gap-1.5 pb-2 text-[11px] text-slate-400 dark:text-slate-500 animate-entry-up stagger-2">
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
