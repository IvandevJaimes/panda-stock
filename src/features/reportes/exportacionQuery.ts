import type { ReportesSummary } from '../../../electron/db/types'
import type {
  CeldaExcel,
  ExportarExcelInput,
  FilaExcel,
  HojaExcel,
} from '../../../electron/exportaciones.types'
import { PESTANAS_REPORTES, etiquetaMovimiento, type PestanaReportes } from './metricasPestana'
import {
  agruparMetodosHabilitados,
  construirEjeDias,
  construirRanking,
  formatearRangoLegible,
  type MetodosPagoHabilitadosReporte,
  type RangoFechas,
} from './reportsQuery'

/**
 * Lógica pura de la exportación a Excel.
 *
 * El renderer arma las filas y el proceso principal solo las escribe en el
 * Escritorio: así todo lo testeable vive acá y `exportaciones.ts` se reduce a
 * nombre de archivo y escritura. Una sola hoja por pestaña, con las secciones
 * apiladas igual que se leen en pantalla.
 *
 * Los montos van como números y no como `$1.234,56`: un importe texto no se
 * suma ni se filtra en Excel, que es justamente lo que lo distingue de una
 * captura.
 */

const TITULO = { fontWeight: 'bold', backgroundColor: '#d1fae5', textColor: '#065f46' } as const
const SECCION = { fontWeight: 'bold', backgroundColor: '#ecfdf5', textColor: '#047857' } as const
const ENCABEZADO = { fontWeight: 'bold', backgroundColor: '#f1f5f9', textColor: '#334155' } as const
const NOTA = { fontStyle: 'italic', textColor: '#64748b' } as const

function texto(valor: string, extra: Partial<CeldaExcel> = {}): CeldaExcel {
  return { value: valor, ...extra }
}

function numero(valor: number, extra: Partial<CeldaExcel> = {}): CeldaExcel {
  return { value: valor, align: 'right', ...extra }
}

function vacia(): FilaExcel {
  return [texto('')]
}

function titulo(tituloPestana: string, periodo: string, generadoEn: Date): FilaExcel[] {
  return [
    [texto(`Panda Stock · Reportes — ${tituloPestana}`, TITULO)],
    [texto(`Período: ${periodo}`, NOTA)],
    [texto(`Exportado: ${formatearMomento(generadoEn)}`, NOTA)],
    vacia(),
  ]
}

function seccion(etiqueta: string): FilaExcel {
  return [texto(etiqueta, SECCION)]
}

function encabezado(...columnas: string[]): FilaExcel {
  return columnas.map((columna) => texto(columna, ENCABEZADO))
}

function par(clave: string, valor: string | number): FilaExcel {
  return [texto(clave), typeof valor === 'number' ? numero(valor) : texto(valor)]
}

/** Un monto que la caja no registró: el guion es lo que muestra la pantalla. */
function numeroOp(valor: number | null): CeldaExcel {
  return valor === null ? texto('—', { align: 'right' }) : numero(redondear(valor))
}

function porcentajeMetodo(valor: number | null): CeldaExcel {
  return valor === null ? texto('No aplica: hay reintegros netos', { align: 'right' }) : numero(redondear(valor))
}

function sinDatos(): FilaExcel {
  return [texto('Sin datos en el período', NOTA)]
}

function formatearMomento(momento: Date): string {
  const dia = String(momento.getDate()).padStart(2, '0')
  const mes = String(momento.getMonth() + 1).padStart(2, '0')
  const hora = String(momento.getHours()).padStart(2, '0')
  const minuto = String(momento.getMinutes()).padStart(2, '0')
  return `${dia}/${mes}/${momento.getFullYear()} ${hora}:${minuto}`
}

/**
 * `DD/MM/AA · HH:MM` para el corte de caja. La fecha viene en ISO con offset:
 * hay que pasar por `Date` para leer el día y la hora locales.
 */
function formatearCierre(fechaISO: string | null): string {
  if (fechaISO === null) return 'Sin fecha'
  const fecha = new Date(fechaISO)
  if (Number.isNaN(fecha.getTime())) return 'Sin fecha'
  const dia = String(fecha.getDate()).padStart(2, '0')
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const anio = String(fecha.getFullYear()).slice(2)
  const hora = String(fecha.getHours()).padStart(2, '0')
  const minuto = String(fecha.getMinutes()).padStart(2, '0')
  return `${dia}/${mes}/${anio} · ${hora}:${minuto}`
}

function formatearDuracion(aperturaISO: string | null, cierreISO: string | null): string {
  if (aperturaISO === null || cierreISO === null) return '—'
  const duracion = new Date(cierreISO).getTime() - new Date(aperturaISO).getTime()
  if (!Number.isFinite(duracion) || duracion < 0) return '—'
  const minutosTotales = Math.floor(duracion / 60_000)
  const dias = Math.floor(minutosTotales / 1_440)
  const horas = Math.floor((minutosTotales % 1_440) / 60)
  const minutos = minutosTotales % 60
  const partes: string[] = []
  if (dias > 0) partes.push(`${dias} ${dias === 1 ? 'día' : 'días'}`)
  if (horas > 0) partes.push(`${horas} h`)
  if (minutos > 0 || partes.length === 0) partes.push(`${minutos} min`)
  return partes.join(' ')
}

function redondear(valor: number): number {
  return Number(valor.toFixed(2))
}

export type ContextoExportacion = {
  pestana: PestanaReportes
  resumen: ReportesSummary
  rango: RangoFechas
  metodosHabilitados: MetodosPagoHabilitadosReporte
  /** Se pasa afuera para que el test no dependa del reloj. */
  generadoEn?: Date
}

/**
 * Nombre con fecha y hora: el Escritorio es el destino y no hay diálogo que
 * avise si el archivo ya existe, así que dos exportaciones seguidas tienen que
 * convivir en vez de pisarse.
 */
export function nombreArchivoExportacion(pestana: PestanaReportes, ahora: Date): string {
  const anio = ahora.getFullYear()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  const hora = String(ahora.getHours()).padStart(2, '0')
  const minuto = String(ahora.getMinutes()).padStart(2, '0')
  const segundo = String(ahora.getSeconds()).padStart(2, '0')
  return `reportes-${pestana}-${anio}-${mes}-${dia}-${hora}${minuto}${segundo}.xlsx`
}

export function construirExportacion({
  pestana,
  resumen,
  rango,
  metodosHabilitados,
  generadoEn = new Date(),
}: ContextoExportacion): ExportarExcelInput {
  const etiqueta = PESTANAS_REPORTES.find((opcion) => opcion.valor === pestana)?.etiqueta ?? pestana

  const filas =
    pestana === 'movimientos'
      ? filasMovimientos(resumen)
      : pestana === 'perdidas'
        ? filasPerdidas(resumen)
      : pestana === 'cortes'
        ? filasCortes(resumen)
        : filasVentas(resumen, rango, metodosHabilitados)

  const hoja: HojaExcel = {
    nombre: etiqueta,
    filas: [...titulo(etiqueta, formatearRangoLegible(rango), generadoEn), ...filas],
  }

  return {
    nombreArchivo: nombreArchivoExportacion(pestana, generadoEn),
    hojas: [hoja],
  }
}

function filasVentas(
  resumen: ReportesSummary,
  rango: RangoFechas,
  metodosHabilitados: MetodosPagoHabilitadosReporte,
): FilaExcel[] {
  const ticketPromedio =
    resumen.cantVentas > 0 ? resumen.totalVentas / resumen.cantVentas : null

  const metodos = agruparMetodosHabilitados(resumen.ventasPorMetodo, metodosHabilitados)
  const ranking = construirRanking(resumen.productosMasVendidos, resumen.totalVentas)
  const ejeDias = construirEjeDias(resumen.ventasPorDia, rango)

  return [
    seccion('Resumen'),
    par('Ingresos cobrados', resumen.totalCobrado),
    par('Ventas', resumen.cantVentas),
    par('Importe valuado de mermas', resumen.perdidas.plataPerdida),
    par('Cobros netos de mermas valuadas', redondear(resumen.totalCobrado - resumen.perdidas.plataPerdida)),
    par('Alcance del saldo', 'No descuenta costo de ventas ni incluye mermas sin costo histórico.'),
    par('Mermas sin costo histórico', resumen.perdidas.cantidadSinValuar),
    par('Unidades de merma sin valor', resumen.perdidas.unidadesSinValuar),
    par('Ticket promedio', ticketPromedio === null ? '—' : redondear(ticketPromedio)),
    vacia(),

    seccion('Ingresos cobrados por día'),
    encabezado('Fecha', 'Ventas', 'Abonos', 'Unidades', 'Cobrado'),
    ...(ejeDias.length > 0
      ? ejeDias.map((dia) => [
          texto(dia.etiqueta),
          numero(dia.ventas),
          numero(dia.abonos),
          numero(dia.unidades),
          numero(redondear(dia.total)),
        ])
      : [sinDatos()]),
    vacia(),

    seccion('Medios de pago'),
    encabezado('Medio', 'Monto neto', '% de cobros positivos'),
    ...(metodos.length > 0
      ? metodos.map((metodo) => [
          texto(metodo.etiqueta),
          numero(redondear(metodo.monto)),
          porcentajeMetodo(metodo.porcentaje),
        ])
      : [sinDatos()]),
    vacia(),

    seccion('Productos más vendidos'),
    encabezado('Producto', 'Unidades', 'Monto vendido', '% del total'),
    ...(ranking.length > 0
      ? ranking.map((producto) => [
          texto(producto.nombre),
          numero(producto.cantidad),
          numero(redondear(producto.monto)),
          numero(redondear(producto.porcentajeVenta)),
        ])
      : [sinDatos()]),
  ]
}

function filasMovimientos(resumen: ReportesSummary): FilaExcel[] {
  const { movimientos } = resumen
  const porTipo = movimientos.porTipo

  return [
    seccion('Resumen'),
    par('Movimientos', movimientos.cantidad),
    par('Unidades movidas', movimientos.unidades),
    par('Entradas', movimientos.entradas),
    par('Salidas', movimientos.salidas),
    vacia(),

    seccion('Movimientos por tipo'),
    encabezado('Tipo', 'Movimientos', 'Unidades'),
    ...(porTipo.length > 0
      ? porTipo.map((fila) => [
          texto(etiquetaMovimiento(fila.tipo)),
          numero(fila.cantidad),
          numero(fila.unidades),
        ])
      : [sinDatos()]),
  ]
}

function filasPerdidas(resumen: ReportesSummary): FilaExcel[] {
  const { perdidas } = resumen
  const fuenteCosto = (fuente: (typeof perdidas.mermas)[number]['fuenteCosto']): string => {
    if (fuente === 'lote') return 'Costo histórico del lote'
    if (fuente === 'referencia') return 'Costo de referencia al registrar'
    return 'Sin costo histórico'
  }

  return [
    seccion('Resumen'),
    par('Mermas', perdidas.cantidadMermas),
    par('Unidades perdidas', perdidas.unidadesPerdidas),
    par('Importe valuado', redondear(perdidas.plataPerdida)),
    par('Valuado con costo histórico de lote', redondear(perdidas.plataPorCostoLote)),
    par('Estimado con costo de referencia', redondear(perdidas.plataPorReferencia)),
    par('Mermas sin costo histórico', perdidas.cantidadSinValuar),
    par('Unidades sin costo histórico', perdidas.unidadesSinValuar),
    par('Mermas sin producto vinculado', perdidas.mermasSinProducto),
    par('Productos afectados', perdidas.porProducto.length),
    vacia(),

    seccion('Detalle de mermas'),
    encabezado('Fecha y hora', 'Producto', 'Unidades', 'Lote', 'Costo unitario', 'Base de valoración', 'Pérdida estimada', 'Motivo'),
    ...(perdidas.mermas.length > 0
      ? [
          ...perdidas.mermas.map(
            (merma): FilaExcel => [
              texto(formatearCierre(merma.fechaHora)),
              texto(merma.nombreProducto),
              numero(Math.abs(merma.cantidad)),
              texto(merma.loteId === null ? 'Sin lote' : `Lote #${merma.loteId}`),
              merma.costoUnitario === null ? texto('—', { align: 'right' }) : numero(redondear(merma.costoUnitario)),
              texto(fuenteCosto(merma.fuenteCosto)),
              merma.perdidaEstimada === null ? texto('Sin valor', { align: 'right' }) : numero(redondear(merma.perdidaEstimada)),
              texto(merma.motivo?.trim() || 'Sin motivo registrado'),
            ],
          ),
          [
            texto('Total conocido', ENCABEZADO),
            texto(''),
            numero(perdidas.unidadesPerdidas - perdidas.unidadesSinValuar, ENCABEZADO),
            texto(''),
            texto(''),
            texto(''),
            numero(redondear(perdidas.plataPerdida), ENCABEZADO),
            texto('No incluye mermas sin costo histórico', NOTA),
          ] as FilaExcel,
        ]
      : [sinDatos()]),
  ]
}

function filasCortes(resumen: ReportesSummary): FilaExcel[] {
  const { cortes } = resumen
  const sinArqueosComparables = cortes.cortesConDatos === 0
  const promedio = sinArqueosComparables ? null : cortes.diferenciaTotal / cortes.cortesConDatos

  return [
    seccion('Resumen'),
    par('Cortes', cortes.cantidad),
    par('Con descuadre', cortes.conDescuadre),
    par('Sin datos de arqueo', cortes.sinDatosArqueo),
    par('Arqueos con datos', cortes.cortesConDatos),
    par('Diferencia acumulada', sinArqueosComparables ? '—' : redondear(cortes.diferenciaTotal)),
    par('Diferencia promedio', promedio === null ? '—' : redondear(promedio)),
    vacia(),

    seccion('Arqueos de caja'),
    encabezado('Cierre', 'Responsable', 'Esperado', 'Real', 'Diferencia', 'Apertura', 'Duración', 'Nota'),
    ...(cortes.cortes.length > 0
      ? cortes.cortes.map(
          (corte): FilaExcel => [
            texto(formatearCierre(corte.fechaCierre)),
            texto(corte.empleadoNombre),
            numeroOp(corte.montoEsperado),
            numeroOp(corte.montoReal),
            numeroOp(corte.diferencia),
            texto(formatearCierre(corte.fechaApertura)),
            texto(formatearDuracion(corte.fechaApertura, corte.fechaCierre)),
            texto(corte.observaciones?.trim() || 'Sin nota registrada'),
          ],
        )
      : [sinDatos()]),
  ]
}

