import type { MetodoPago, ProductoRanking, VentaDiaria } from '../../../electron/db/types'

/**
 * Lógica pura de la pantalla de reportes. Sin React: los componentes orquestan
 * estado y render, las reglas de negocio viven acá y se testean solas.
 *
 * Copia `formatearMoneda` de `posQuery` en vez de importarlo. Es una línea, pero
 * importar el módulo de POS desde Reportes ataría la pantalla al ticket: un
 * cambio en el cobro rompería la auditoría. Mismo formato de salida.
 */
export function formatearMoneda(valor: number): string {
  return `$${valor.toFixed(2)}`
}

/** Compacta para ejes y tarjetas: $1.2K, $34.5K, $1.2M. */
export function formatearMonedaCompacta(valor: number): string {
  const absoluto = Math.abs(valor)
  if (absoluto >= 1_000_000) return `$${(valor / 1_000_000).toFixed(1)}M`
  if (absoluto >= 1_000) return `$${(valor / 1_000).toFixed(1)}K`
  return `$${valor.toFixed(0)}`
}

export function formatearUnidades(cantidad: number): string {
  return String(Number(cantidad.toFixed(3)))
}

/** Porcentaje seguro: si el denominador es 0 devuelve 0 y no NaN ni Infinity. */
export function porcentaje(parte: number, total: number): number {
  if (total === 0) return 0
  return (parte / total) * 100
}

// ── Rango de fechas ──────────────────────────────────────────────────────────

export type RangoFechas = { desde: string | null; hasta: string | null }
export type PeriodoReporte = 'day' | 'month' | 'year'

function aISO(date: Date): string {
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  const dia = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mes}-${dia}`
}

/** Medianoche local del día que empieza el rango. */
function inicioDelDia(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

/** 23:59:59.999 local del último día del rango. */
function finDelDia(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

// Se envían límites ISO completos para incluir el período al compararlo con fecha_hora.
export function rangoDesdePeriodo(
  periodo: PeriodoReporte,
  cursor: Date,
  hoy: Date = new Date(),
): RangoFechas {
  const inicio = periodo === 'day'
    ? inicioDelDia(cursor)
    : periodo === 'month'
      ? new Date(cursor.getFullYear(), cursor.getMonth(), 1)
      : new Date(cursor.getFullYear(), 0, 1)

  const periodoActual = periodo === 'day'
    ? isSameDayDate(cursor, hoy)
    : periodo === 'month'
      ? cursor.getMonth() === hoy.getMonth() && cursor.getFullYear() === hoy.getFullYear()
      : cursor.getFullYear() === hoy.getFullYear()

  const fin = periodoActual
    ? finDelDia(hoy)
    : periodo === 'day'
      ? finDelDia(cursor)
      : periodo === 'month'
        ? finDelDia(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0))
        : finDelDia(new Date(cursor.getFullYear(), 11, 31))

  return { desde: inicio.toISOString(), hasta: fin.toISOString() }
}

function isSameDayDate(primera: Date, segunda: Date): boolean {
  return primera.getFullYear() === segunda.getFullYear()
    && primera.getMonth() === segunda.getMonth()
    && primera.getDate() === segunda.getDate()
}

// ── Eje de días ──────────────────────────────────────────────────────────────

export type PuntoDia = {
  /** `YYYY-MM-DD`, la clave que devuelve la consulta. */
  fecha: string
  etiqueta: string
  ventas: number
  abonos: number
  unidades: number
  total: number
}

export function formatearDia(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split('-')
  if (!anio || !mes || !dia) return fechaISO

  // `YYYY-MM-DD` a secas es una etiqueta del eje, no una fecha: parsearla como
  // ISO la correría al día anterior en los husos negativos.
  if (!dia.includes('T')) return `${dia}/${mes}`

  /*
    Con hora y offset hay que pasar por `Date` para leer el día LOCAL. Recortar el
    string no sirve: el preset "hoy" va de `15T03:00:00Z` a `16T02:59:59.999Z`
    en un huso UTC-3, y recortando mostraría dos días para un turno de hoy.
  */
  const fecha = new Date(fechaISO)
  if (Number.isNaN(fecha.getTime())) return fechaISO

  const diaLocal = String(fecha.getDate()).padStart(2, '0')
  const mesLocal = String(fecha.getMonth() + 1).padStart(2, '0')
  return `${diaLocal}/${mesLocal}`
}

/** Formatea el rango resuelto para encabezados y reportes exportados. */
export function formatearRangoLegible(rango: RangoFechas): string {
  const { desde, hasta } = rango

  if (desde === null && hasta === null) return 'Todo el historial'
  if (desde === null) return `Hasta ${formatearDia(hasta!)}`
  if (hasta === null) return `Desde ${formatearDia(desde)}`

  // La comparación va sobre los días ya formateados: los dos ISO de un mismo
  // día local son strings distintos (`15T03:00:00Z` y `15T23:59:59.999Z`).
  const diaDesde = formatearDia(desde)
  const diaHasta = formatearDia(hasta)
  if (diaDesde === diaHasta) return diaDesde

  return `${diaDesde} - ${diaHasta}`
}

function sumarUnDia(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split('-').map(Number)
  const fecha = new Date(anio, mes - 1, dia)
  fecha.setDate(fecha.getDate() + 1)
  return aISO(fecha)
}

/**
 * Los días sin actividad NO vienen de la base. La consulta agrupa solo los días
 * con ventas, cobros, abonos o devoluciones, así que el gráfico necesita
 * completar los huecos para no conectar en diagonal días separados.
 *
 * Cuando no hay filtro de fechas (`desde` es null) no hay contra qué rellenar y
 * se devuelve la serie tal cual, sin inventar un eje de miles de días hacia
 * atrás. El rango por defecto del selector es "Este mes", no "Todo", por eso.
 */
export function construirEjeDias(
  filas: VentaDiaria[],
  rango: RangoFechas,
  hoy: Date = new Date(),
): PuntoDia[] {
  const porFecha = new Map(filas.map((fila) => [fila.fecha, fila]))

  if (!rango.desde || !rango.hasta) {
    return filas.map((fila) => ({
      fecha: fila.fecha,
      etiqueta: formatearDia(fila.fecha),
      ventas: fila.ventas,
      abonos: fila.abonos,
      unidades: fila.unidades,
      total: fila.total,
    }))
  }

  // Los extremos salen del rango de fechas, no de la serie: si el filtro cae en
  // un día sin venta, ese día tiene que aparecer igual en el eje.
  //
  // `hoy` se pasa a `YYYY-MM-DD` porque el resto del bucle compara strings, y un
  // `string <= Date` da NaN: el `for` no entra nunca y el eje sale vacío.
  const desde = rango.desde.slice(0, 10)
  const hoyISO = aISO(hoy)
  const hasta = rango.hasta.slice(0, 10)
  const limite = hasta > hoyISO ? hoyISO : hasta

  const densos: PuntoDia[] = []
  for (let cursor = desde; cursor <= limite; cursor = sumarUnDia(cursor)) {
    const fila = porFecha.get(cursor)
    densos.push({
      fecha: cursor,
      etiqueta: formatearDia(cursor),
      ventas: fila?.ventas ?? 0,
      abonos: fila?.abonos ?? 0,
      unidades: fila?.unidades ?? 0,
      total: fila?.total ?? 0,
    })
  }

  return densos
}

/**
 * Cada tick del eje se saltea uno de cada `paso`. Sin esto, un mes son 31
 * etiquetas amontonadas en el eje X y ninguna se lee.
 */
export function etiquetaVisible(indice: number, total: number, paso: number): boolean {
  if (paso <= 1) return true
  return indice % paso === 0 || indice === total - 1
}

/** Cuántos días salto el eje. Más de 10 puntos y el espaciado se aprieta. */
export function pasoEje(cantidad: number): number {
  if (cantidad <= 10) return 1
  return Math.ceil(cantidad / 10)
}

// ── Medios de pago ───────────────────────────────────────────────────────────

/**
 * `credito` y `cuenta_corriente` se agrupan en un renglón combinado.
 *
 * Agruparlos evita dos renglones para importes que no ingresaron de inmediato a caja.
 * El saldo por persona se consulta
 * en la pantalla de cuentas corrientes; este gráfico resume los importes por medio.
 */
export const METODOS_AGRUPADOS: { metodo: MetodoPago; etiqueta: string }[] = [
  { metodo: 'efectivo', etiqueta: 'Efectivo' },
  { metodo: 'transferencia', etiqueta: 'Transferencia' },
  { metodo: 'qr', etiqueta: 'QR' },
  { metodo: 'debito', etiqueta: 'Tarjeta' },
  { metodo: 'cuenta_corriente', etiqueta: 'Tarjeta de crédito' },
]

export type FilaMetodo = {
  metodo: MetodoPago
  etiqueta: string
  monto: number
  /** Participación positiva; null si algún método tiene saldo neto negativo. */
  porcentaje: number | null
}

function porcentajeCobros(monto: number, totalPositivo: number, hayNetoNegativo: boolean): number | null {
  return hayNetoNegativo || monto < 0 ? null : porcentaje(monto, totalPositivo)
}

function esMedioCombinado(metodo: MetodoPago): boolean {
  return metodo === 'credito' || metodo === 'cuenta_corriente'
}

export function agruparMetodos(
  ventasPorMetodo: { metodo: MetodoPago; monto: number }[],
): FilaMetodo[] {
  const acumulado = new Map<string, number>()

  for (const fila of ventasPorMetodo) {
    const clave = esMedioCombinado(fila.metodo) ? 'cuenta_corriente' : fila.metodo
    acumulado.set(clave, (acumulado.get(clave) ?? 0) + fila.monto)
  }

  const totalPositivo = [...acumulado.values()].reduce((acc, monto) => acc + Math.max(monto, 0), 0)
  const hayNetoNegativo = [...acumulado.values()].some((monto) => monto < 0)

  return METODOS_AGRUPADOS.filter((opcion) => acumulado.has(opcion.metodo))
    .map((opcion) => ({
      metodo: opcion.metodo,
      etiqueta: opcion.etiqueta,
      monto: acumulado.get(opcion.metodo) ?? 0,
      porcentaje: porcentajeCobros(acumulado.get(opcion.metodo) ?? 0, totalPositivo, hayNetoNegativo),
    }))
    .sort((a, b) => b.monto - a.monto)
}

/** Suma de los importes registrados con tarjeta de crédito o cuenta corriente. */
export function totalTarjetaCuentaCorriente(filas: FilaMetodo[]): number {
  return filas
    .filter((fila) => fila.metodo === 'cuenta_corriente')
    .reduce((acc, fila) => acc + fila.monto, 0)
}

export type MetodosPagoHabilitadosReporte = {
  tarjetaHabilitada: boolean
  transferenciaHabilitada: boolean
  qrHabilitado: boolean
  cuentaCorrienteHabilitada: boolean
}

const METODOS_PAGO_DETALLADOS: { metodo: MetodoPago; etiqueta: string }[] = [
  { metodo: 'efectivo', etiqueta: 'Efectivo' },
  { metodo: 'transferencia', etiqueta: 'Transferencia' },
  { metodo: 'qr', etiqueta: 'QR' },
  { metodo: 'debito', etiqueta: 'Tarjeta de débito' },
  { metodo: 'credito', etiqueta: 'Tarjeta de crédito' },
  { metodo: 'cuenta_corriente', etiqueta: 'Cuenta corriente' },
]

/** Agrupa los medios individualmente para que el gráfico respete los ajustes actuales. */
export function agruparMetodosHabilitados(
  ventasPorMetodo: readonly { metodo: MetodoPago; monto: number }[],
  habilitados: MetodosPagoHabilitadosReporte,
): FilaMetodo[] {
  const disponible: Record<MetodoPago, boolean> = {
    efectivo: true,
    transferencia: habilitados.transferenciaHabilitada,
    qr: habilitados.qrHabilitado,
    debito: habilitados.tarjetaHabilitada,
    credito: habilitados.tarjetaHabilitada,
    cuenta_corriente: habilitados.cuentaCorrienteHabilitada,
  }
  const acumulado = new Map<MetodoPago, number>()

  for (const fila of ventasPorMetodo) {
    if (!disponible[fila.metodo]) continue
    acumulado.set(fila.metodo, (acumulado.get(fila.metodo) ?? 0) + fila.monto)
  }

  const totalPositivo = [...acumulado.values()].reduce((acc, monto) => acc + Math.max(monto, 0), 0)
  const hayNetoNegativo = [...acumulado.values()].some((monto) => monto < 0)

  return METODOS_PAGO_DETALLADOS
    .filter((opcion) => acumulado.has(opcion.metodo))
    .map((opcion) => {
      const monto = acumulado.get(opcion.metodo) ?? 0
      return {
        ...opcion,
        monto,
        porcentaje: porcentajeCobros(monto, totalPositivo, hayNetoNegativo),
      }
    })
    .sort((a, b) => b.monto - a.monto)
}

// ── Ranking de productos ─────────────────────────────────────────────────────

export type FilaRanking = ProductoRanking & { porcentajeVenta: number }

export function construirRanking(filas: ProductoRanking[], totalVendido: number): FilaRanking[] {
  return filas.map((fila) => ({
    ...fila,
    porcentajeVenta: porcentaje(fila.monto, totalVendido),
  }))
}

// ── Totales de la pantalla ───────────────────────────────────────────────────

export type Totales = {
  totalVentas: number
  cantVentas: number
  unidades: number
  ticketPromedio: number | null
}

export function calcularTotales(
  resumen: {
    totalVentas: number
    cantVentas: number
    ventasPorDia: VentaDiaria[]
  },
): Totales {
  const unidades = resumen.ventasPorDia.reduce((acc, dia) => acc + dia.unidades, 0)
  return {
    totalVentas: resumen.totalVentas,
    cantVentas: resumen.cantVentas,
    unidades,
    ticketPromedio: resumen.cantVentas === 0 ? null : resumen.totalVentas / resumen.cantVentas,
  }
}
