import type { ReportesSummary, TipoMovimientoStock } from '../../../electron/db/types'
import { formatearMoneda, formatearUnidades } from './reportsQuery'

export type PestanaReportes =
  | 'ventas'
  | 'movimientos'
  | 'perdidas'
  | 'cortes'

export const PESTANAS_REPORTES: {
  valor: PestanaReportes
  etiqueta: string
  resumen: string
}[] = [
  { valor: 'ventas', etiqueta: 'Ventas', resumen: 'Ingresos cobrados y productos vendidos' },
  { valor: 'movimientos', etiqueta: 'Movimientos', resumen: 'Entradas y salidas de mercadería' },
  { valor: 'perdidas', etiqueta: 'Pérdidas', resumen: 'Mermas y pérdidas estimadas' },
  { valor: 'cortes', etiqueta: 'Cortes de caja', resumen: 'Arqueos de los turnos cerrados' },
]

/** Semántica del color, para que el componente elija el icono y las clases. */
export type TonoMetrica = 'emerald' | 'amber' | 'sky' | 'violet' | 'rose'

export type MetricaPestana = {
  titulo: string
  /** `KpiCard` acepta string o number: los conteos van crudos, los montos formateados. */
  valor: string | number
  valorClassName?: string
  subtitulo: string
  tono: TonoMetrica
}

const ETIQUETAS_MOVIMIENTO: Record<TipoMovimientoStock, string> = {
  entrada: 'Entradas',
  venta: 'Ventas',
  ajuste_positivo: 'Ajustes +',
  ajuste_negativo: 'Ajustes -',
  merma: 'Mermas',
  devolucion: 'Devoluciones',
}

export function etiquetaMovimiento(tipo: TipoMovimientoStock): string {
  return ETIQUETAS_MOVIMIENTO[tipo] ?? tipo
}

/**
 * Cada vista mantiene cuatro métricas para conservar una grilla estable.
 */
export function metricasDePestana(
  pestana: PestanaReportes,
  resumen: ReportesSummary | null,
): MetricaPestana[] {
  const totalVentas = resumen?.totalVentas ?? 0
  const totalCobrado = resumen?.totalCobrado ?? 0
  const cantVentas = resumen?.cantVentas ?? 0
  const plataPerdida = resumen?.perdidas.plataPerdida ?? 0
  const resultadoPeriodo = Math.round((totalCobrado - plataPerdida) * 100) / 100

  const movimientos = resumen?.movimientos
  const perdidas = resumen?.perdidas
  const cortes = resumen?.cortes

  if (pestana === 'movimientos') {
    const entradas = movimientos?.entradas ?? 0
    const salidas = movimientos?.salidas ?? 0

    return [
      {
        titulo: 'Movimientos',
        valor: movimientos?.cantidad ?? 0,
        subtitulo: 'En el período',
        tono: 'sky',
      },
      {
        titulo: 'Unidades movidas',
        valor: formatearUnidades(movimientos?.unidades ?? 0),
        subtitulo: 'Entradas más salidas',
        tono: 'violet',
      },
      {
        titulo: 'Entradas',
        valor: entradas,
        subtitulo: 'Mercadería que ingresó',
        tono: 'emerald',
      },
      {
        titulo: 'Salidas',
        valor: salidas,
        subtitulo: 'Mercadería que salió',
        tono: salidas > entradas ? 'amber' : 'emerald',
      },
    ]
  }

  if (pestana === 'perdidas') {
    const mermas = perdidas?.cantidadMermas ?? 0
    const afectados = perdidas?.porProducto.length ?? 0
    const unidadesPerdidas = perdidas?.unidadesPerdidas ?? 0

    return [
      {
        titulo: 'Mermas',
        valor: mermas,
        subtitulo: mermas === 1 ? 'registro de merma' : 'registros de merma',
        tono: mermas > 0 ? 'rose' : 'emerald',
      },
      {
        titulo: 'Unidades perdidas',
        valor: formatearUnidades(unidadesPerdidas),
        subtitulo: 'Mercadería descartada',
        tono: mermas > 0 ? 'rose' : 'emerald',
      },
      {
        titulo: 'Plata perdida',
        valor: formatearMoneda(perdidas?.plataPerdida ?? 0),
        subtitulo: 'Estimación de las mermas',
        tono: mermas > 0 ? 'rose' : 'emerald',
      },
      {
        titulo: 'Productos afectados',
        valor: afectados,
        subtitulo: afectados === 1 ? 'producto' : 'productos',
        tono: 'amber',
      },
    ]
  }

  if (pestana === 'cortes') {
    const diferencia = cortes?.diferenciaTotal ?? 0
    const descuadres = cortes?.conDescuadre ?? 0
    const cantidad = cortes?.cantidad ?? 0

    return [
      {
        titulo: 'Cortes',
        valor: cantidad,
        subtitulo: 'Turnos cerrados',
        tono: 'violet',
      },
      {
        titulo: 'Con descuadre',
        valor: descuadres,
        subtitulo: descuadres === 0 ? 'Todos cuadrados' : 'Cajas que no cerraron exactas',
        tono: descuadres > 0 ? 'amber' : 'emerald',
      },
      {
        titulo: 'Diferencia acumulada',
        valor: formatearMoneda(diferencia),
        subtitulo: 'Esperado contra real',
        tono: diferencia < 0 ? 'rose' : 'emerald',
      },
      {
        titulo: 'Diferencia promedio',
        valor: formatearMoneda(cantidad > 0 ? diferencia / cantidad : 0),
        subtitulo: 'Por corte',
        tono: diferencia < 0 ? 'rose' : 'emerald',
      },
    ]
  }

  const ticketPromedio = cantVentas > 0 ? totalVentas / cantVentas : 0
  const resultadoEsPositivo = resultadoPeriodo > 0
  const resultadoEsNegativo = resultadoPeriodo < 0

  return [
    {
      titulo: 'Ingresos cobrados',
      valor: formatearMoneda(totalCobrado),
      subtitulo: 'Ventas cobradas y abonos recibidos, netos de reintegros',
      tono: 'emerald',
    },
    {
      titulo: 'Resultado después de mermas',
      valor: formatearMoneda(resultadoPeriodo),
      valorClassName: resultadoEsPositivo
        ? 'text-emerald-700 dark:text-emerald-400'
        : resultadoEsNegativo
          ? 'text-rose-600 dark:text-rose-400'
          : 'text-slate-700 dark:text-slate-300',
      subtitulo: resultadoEsPositivo
        ? 'Ganaste en el período'
        : resultadoEsNegativo
          ? 'Perdiste en el período'
          : 'Sin ganancia ni pérdida',
      tono: resultadoEsPositivo ? 'emerald' : resultadoEsNegativo ? 'rose' : 'violet',
    },
    {
      titulo: 'Pérdidas por mermas',
      valor: formatearMoneda(plataPerdida),
      subtitulo: 'Estimadas para el período',
      tono: plataPerdida > 0 ? 'rose' : 'emerald',
    },
    {
      titulo: 'Ticket promedio',
      valor: formatearMoneda(ticketPromedio),
      subtitulo: `Por ticket · ${cantVentas} ventas`,
      tono: 'sky',
    },
  ]
}

/**
 * El desglose por tipo, tal cual lo agrupa el backend.
 *
 * No se filtran `venta` ni `merma` aunque tengan pestaña propia: la métrica
 * "Movimientos" cuenta todos los tipos, así que esconder dos en la lista
 * dejaría un total que no cuadra con lo que se ve abajo.
 */
export function filasMovimientos(resumen: ReportesSummary | null) {
  return resumen?.movimientos.porTipo ?? []
}
