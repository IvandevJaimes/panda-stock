import type { ReportesSummary, TipoMovimientoStock } from '../../../electron/db/types'
import { formatearMoneda, formatearUnidades, margenEsNegativo, porcentaje } from './reportsQuery'

export type PestanaReportes = 'ventas' | 'movimientos' | 'perdidas' | 'cortes'

export const PESTANAS_REPORTES: {
  valor: PestanaReportes
  etiqueta: string
  /** Qué muestra la pestaña, para el subtítulo de la barra. */
  resumen: string
}[] = [
  { valor: 'ventas', etiqueta: 'Ventas', resumen: 'Ingresos y ganancia estimada' },
  { valor: 'movimientos', etiqueta: 'Movimientos', resumen: 'Entradas y salidas de mercadería' },
  { valor: 'perdidas', etiqueta: 'Pérdidas', resumen: 'Mermas y plata perdida' },
  { valor: 'cortes', etiqueta: 'Cortes de caja', resumen: 'Arqueos de los turnos cerrados' },
]

/** Semántica del color, para que el componente elija el icono y las clases. */
export type TonoMetrica = 'emerald' | 'amber' | 'sky' | 'violet' | 'rose'

export type MetricaPestana = {
  titulo: string
  /** `KpiCard` acepta string o number: los conteos van crudos, los montos formateados. */
  valor: string | number
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
 * Las cuatro métricas de la pestaña activa.
 *
 * El usuario pidió que el bloque de métricas cambie con la pestaña en vez de
 * mostrar siempre las mismas cuatro de ventas, y que las cards vivan en una
 * grilla de cuatro columnas arriba de las pestañas. Por eso cada pestaña
 * devuelve exactamente cuatro: la grilla no tiene que cambiar de ancho entre
 * pestañas.
 *
 * `resumen` llega `null` mientras carga: se devuelven los mismos valores en
 * cero para que las cards no baileen de ancho cuando llegan los datos.
 */
export function metricasDePestana(
  pestana: PestanaReportes,
  resumen: ReportesSummary | null,
): MetricaPestana[] {
  const totalVentas = resumen?.totalVentas ?? 0
  const resultado = resumen?.resultado ?? 0
  const cantVentas = resumen?.cantVentas ?? 0

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

    return [
      {
        titulo: 'Mermas',
        valor: mermas,
        subtitulo: mermas === 1 ? 'registro de merma' : 'registros de merma',
        tono: mermas > 0 ? 'rose' : 'emerald',
      },
      {
        titulo: 'Unidades perdidas',
        valor: formatearUnidades(perdidas?.unidadesPerdidas ?? 0),
        subtitulo: 'Mercadería descartada',
        tono: mermas > 0 ? 'rose' : 'emerald',
      },
      {
        titulo: 'Plata perdida',
        valor: formatearMoneda(perdidas?.plataPerdida ?? 0),
        subtitulo: 'Al costo actual del producto',
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

  const margen = porcentaje(resultado, totalVentas)
  const ticketPromedio = cantVentas > 0 ? totalVentas / cantVentas : 0

  return [
    {
      titulo: 'Ingresos',
      valor: formatearMoneda(totalVentas),
      subtitulo: `${cantVentas} ${cantVentas === 1 ? 'venta' : 'ventas'}`,
      tono: 'emerald',
    },
    {
      titulo: 'Ganancia estimada',
      valor: formatearMoneda(resultado),
      subtitulo: `${margen.toFixed(1)}% de margen`,
      tono: margenEsNegativo(resultado) ? 'rose' : 'emerald',
    },
    {
      titulo: 'Costo de mercadería',
      valor: formatearMoneda(resumen?.totalCosto ?? 0),
      subtitulo: 'Costo real de lo vendido',
      tono: 'amber',
    },
    {
      titulo: 'Ticket promedio',
      valor: formatearMoneda(ticketPromedio),
      subtitulo: 'Por venta',
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