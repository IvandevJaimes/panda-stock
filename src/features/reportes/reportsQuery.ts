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

export type PresetRango =
  | 'hoy'
  | 'ayer'
  | 'siete'
  | 'treinta'
  | 'mes_actual'
  | 'mes_anterior'
  | 'anio_actual'
  | 'todo'

export type RangoFechas = { desde: string | null; hasta: string | null }

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

function menosDias(date: Date, dias: number): Date {
  const copia = new Date(date)
  copia.setDate(copia.getDate() - dias)
  return copia
}

/**
 * El rango vuelve en ISO COMPLETO con hora local (`2026-03-01T00:00:00.000-03:00`),
 * no en `YYYY-MM-DD`.
 *
 * `ventas.fecha_hora` guarda `toISOString()`, que es UTC. La base compara con
 * `>=` y `<=` sobre strings, así que mandar `2026-03-01` excluiría las ventas de
 * todo el 1 de marzo: la comparación de texto puts `'2026-03-01T12:00:00Z' <
 * '2026-03-01'` porque la segunda cadena es prefijo de la primera. Con el ISO
 * completo con offset, el string ordena por instante y el filtro cae en el día
 * que el usuario eligió.
 */
export function rangoDesdePreset(preset: PresetRango, hoy: Date = new Date()): RangoFechas {
  switch (preset) {
    case 'hoy':
      return { desde: inicioDelDia(hoy).toISOString(), hasta: finDelDia(hoy).toISOString() }
    case 'ayer': {
      const ayer = menosDias(hoy, 1)
      return { desde: inicioDelDia(ayer).toISOString(), hasta: finDelDia(ayer).toISOString() }
    }
    case 'siete': {
      const desde = menosDias(hoy, 6)
      return { desde: inicioDelDia(desde).toISOString(), hasta: finDelDia(hoy).toISOString() }
    }
    case 'treinta': {
      const desde = menosDias(hoy, 29)
      return { desde: inicioDelDia(desde).toISOString(), hasta: finDelDia(hoy).toISOString() }
    }
    case 'mes_actual':
      return {
        desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString(),
        hasta: finDelDia(hoy).toISOString(),
      }
    case 'mes_anterior': {
      const primeroAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
      const ultimoAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
      return { desde: primeroAnterior.toISOString(), hasta: finDelDia(ultimoAnterior).toISOString() }
    }
    case 'anio_actual':
      return {
        desde: new Date(hoy.getFullYear(), 0, 1).toISOString(),
        hasta: finDelDia(hoy).toISOString(),
      }
    case 'todo':
      return { desde: null, hasta: null }
  }
}

/** Los períodos del botón del título, en el orden en que los recorre el clic. */
export type PeriodoCiclo = 'hoy' | 'siete' | 'mes_actual' | 'anio_actual'

export const CICLO_PERIODOS: { valor: PeriodoCiclo; etiqueta: string }[] = [
  { valor: 'hoy', etiqueta: 'Día' },
  { valor: 'siete', etiqueta: 'Semana' },
  { valor: 'mes_actual', etiqueta: 'Mes' },
  { valor: 'anio_actual', etiqueta: 'Año' },
]

/** El período siguiente del ciclo, volviendo al primero al llegar al último. */
export function siguientePeriodo(actual: PresetRango): PeriodoCiclo {
  const indice = CICLO_PERIODOS.findIndex((periodo) => periodo.valor === actual)
  const siguiente = (indice + 1) % CICLO_PERIODOS.length
  return CICLO_PERIODOS[siguiente]!.valor
}

export function etiquetaPeriodo(preset: PresetRango): string {
  return CICLO_PERIODOS.find((periodo) => periodo.valor === preset)?.etiqueta ?? 'Día'
}

// ── Eje de días ──────────────────────────────────────────────────────────────

export type PuntoDia = {
  /** `YYYY-MM-DD`, la clave que devuelve la consulta. */
  fecha: string
  etiqueta: string
  ventas: number
  unidades: number
  total: number
  costo: number
  resultado: number
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

/**
 * El rango ya resuelto, en texto.
 *
 * El pill junto al título dice QUÉ preset está elegido ("Este mes"); esto dice
 * QUÉ fechas resolvió ese preset, que es lo que no se ve en el selector.
 */
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
 * Los días sin venta NO vienen de la base. La consulta agrupa solo los días con
 * filas, así que el lunes sin ventas falta en la serie y el gráfico conecta en
 * diagonal del domingo al martes: se lee como una caída que no ocurrió.
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
      unidades: fila.unidades,
      total: fila.total,
      costo: fila.costo,
      resultado: fila.total - fila.costo,
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
      unidades: fila?.unidades ?? 0,
      total: fila?.total ?? 0,
      costo: fila?.costo ?? 0,
      resultado: (fila?.total ?? 0) - (fila?.costo ?? 0),
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
 * `credito` y `cuenta_corriente` se agrupan en un solo "Crédito".
 *
 * Agruparlos evita dos renglones que el usuario no puede diferenciar: desde el
 * mostrador los dos son "no me/entró plata ahora". La deuda por persona se consulta
 * en la pantalla de cuentas corrientes, no en este gráfico, que solo informa cuánto
 * se cobró por cada medio.
 */
export const METODOS_AGRUPADOS: { metodo: MetodoPago; etiqueta: string }[] = [
  { metodo: 'efectivo', etiqueta: 'Efectivo' },
  { metodo: 'transferencia', etiqueta: 'Transferencia' },
  { metodo: 'debito', etiqueta: 'Tarjeta' },
  { metodo: 'credito', etiqueta: 'Crédito' },
  { metodo: 'cuenta_corriente', etiqueta: 'Cuenta corriente' },
]

export type FilaMetodo = { metodo: MetodoPago; etiqueta: string; monto: number; porcentaje: number }

function esCredito(metodo: MetodoPago): boolean {
  return metodo === 'credito' || metodo === 'cuenta_corriente'
}

export function agruparMetodos(
  ventasPorMetodo: { metodo: MetodoPago; monto: number }[],
): FilaMetodo[] {
  const acumulado = new Map<string, number>()

  for (const fila of ventasPorMetodo) {
    const clave = esCredito(fila.metodo) ? 'credito' : fila.metodo
    acumulado.set(clave, (acumulado.get(clave) ?? 0) + fila.monto)
  }

  const total = [...acumulado.values()].reduce((acc, monto) => acc + monto, 0)

  return METODOS_AGRUPADOS.filter((opcion) => acumulado.has(opcion.metodo))
    .map((opcion) => ({
      metodo: opcion.metodo,
      etiqueta: opcion.etiqueta,
      monto: acumulado.get(opcion.metodo) ?? 0,
      porcentaje: porcentaje(acumulado.get(opcion.metodo) ?? 0, total),
    }))
    .sort((a, b) => b.monto - a.monto)
}

/** Suma de lo cobrado con crédito y cuenta corriente, que es lo que se pudo cobrar. */
export function totalCredito(filas: FilaMetodo[]): number {
  return filas
    .filter((fila) => fila.metodo === 'credito' || fila.metodo === 'cuenta_corriente')
    .reduce((acc, fila) => acc + fila.monto, 0)
}

// ── Ranking de productos ─────────────────────────────────────────────────────

export type FilaRanking = ProductoRanking & { porcentajeVenta: number }

export function construirRanking(filas: ProductoRanking[], totalVendido: number): FilaRanking[] {
  return filas.map((fila) => ({
    ...fila,
    porcentajeVenta: porcentaje(fila.monto, totalVendido),
  }))
}

/** Un margen negativo se muestra en rojo: se vendió por debajo del costo. */
export function margenEsNegativo(margen: number): boolean {
  return margen < 0
}

// ── Totales de la pantalla ───────────────────────────────────────────────────

export type Totales = {
  totalVentas: number
  totalCosto: number
  resultado: number
  cantVentas: number
  unidades: number
  ticketPromedio: number
  margenPorcentaje: number
  margenNegativo: boolean
}

export function calcularTotales(
  resumen: {
    totalVentas: number
    totalCosto: number
    resultado: number
    cantVentas: number
    ventasPorDia: VentaDiaria[]
  },
): Totales {
  const unidades = resumen.ventasPorDia.reduce((acc, dia) => acc + dia.unidades, 0)
  return {
    totalVentas: resumen.totalVentas,
    totalCosto: resumen.totalCosto,
    resultado: resumen.resultado,
    cantVentas: resumen.cantVentas,
    unidades,
    ticketPromedio: resumen.cantVentas === 0 ? 0 : resumen.totalVentas / resumen.cantVentas,
    margenPorcentaje: porcentaje(resumen.resultado, resumen.totalVentas),
    margenNegativo: resumen.resultado < 0,
  }
}