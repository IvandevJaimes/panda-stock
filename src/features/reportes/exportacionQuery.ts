import type { ReportesSummary } from '../../../electron/db/types'
import type {
  CeldaExcel,
  ExportarExcelInput,
  FilaExcel,
  HojaExcel,
} from '../../../electron/exportaciones.types'
import { PESTANAS_REPORTES, etiquetaMovimiento, type PestanaReportes } from './metricasPestana'
import {
  agruparMetodos,
  construirEjeDias,
  construirRanking,
  formatearRangoLegible,
  porcentaje,
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

function redondear(valor: number): number {
  return Number(valor.toFixed(2))
}

export type ContextoExportacion = {
  pestana: PestanaReportes
  resumen: ReportesSummary
  rango: RangoFechas
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
        : pestana === 'devoluciones'
          ? filasDevoluciones(resumen)
        : filasVentas(resumen, rango)

  const hoja: HojaExcel = {
    nombre: etiqueta,
    filas: [...titulo(etiqueta, formatearRangoLegible(rango), generadoEn), ...filas],
  }

  return {
    nombreArchivo: nombreArchivoExportacion(pestana, generadoEn),
    hojas: [hoja],
  }
}

function filasVentas(resumen: ReportesSummary, rango: RangoFechas): FilaExcel[] {
  const ticketPromedio =
    resumen.cantVentas > 0 ? resumen.totalVentas / resumen.cantVentas : 0

  const metodos = agruparMetodos(resumen.ventasPorMetodo)
  const ranking = construirRanking(resumen.productosMasVendidos, resumen.totalVentas)
  const ejeDias = construirEjeDias(resumen.ventasPorDia, rango)

  return [
    seccion('Resumen'),
    par('Ingresos', resumen.totalVentas),
    par('Ventas', resumen.cantVentas),
    par('Ganancia estimada', resumen.resultado),
    par('Costo de mercadería', resumen.totalCosto),
    par('Ticket promedio', redondear(ticketPromedio)),
    par('Margen', redondear(porcentaje(resumen.resultado, resumen.totalVentas))),
    vacia(),

    seccion('Ventas por día'),
    encabezado('Fecha', 'Ventas', 'Unidades', 'Total', 'Costo', 'Ganancia'),
    ...(ejeDias.length > 0
      ? ejeDias.map((dia) => [
          texto(dia.etiqueta),
          numero(dia.ventas),
          numero(dia.unidades),
          numero(redondear(dia.total)),
          numero(redondear(dia.costo)),
          numero(redondear(dia.resultado)),
        ])
      : [sinDatos()]),
    vacia(),

    seccion('Medios de pago'),
    encabezado('Medio', 'Monto', '% del total'),
    ...(metodos.length > 0
      ? metodos.map((metodo) => [
          texto(metodo.etiqueta),
          numero(redondear(metodo.monto)),
          numero(redondear(metodo.porcentaje)),
        ])
      : [sinDatos()]),
    vacia(),

    seccion('Productos más vendidos'),
    encabezado('Producto', 'Unidades', 'Monto', 'Costo', 'Margen', '% del total'),
    ...(ranking.length > 0
      ? ranking.map((producto) => [
          texto(producto.nombre),
          numero(producto.cantidad),
          numero(redondear(producto.monto)),
          numero(redondear(producto.costo)),
          numero(redondear(producto.margen)),
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

  return [
    seccion('Resumen'),
    par('Mermas', perdidas.cantidadMermas),
    par('Unidades perdidas', perdidas.unidadesPerdidas),
    par('Plata perdida', redondear(perdidas.plataPerdida)),
    par('Productos afectados', perdidas.porProducto.length),
    vacia(),

    seccion('Mermas por producto'),
    encabezado('Producto', 'Unidades', 'Costo unitario', 'Perdido'),
    ...(perdidas.porProducto.length > 0
      ? [
          ...perdidas.porProducto.map(
            (producto): FilaExcel => [
              texto(producto.nombre),
              numero(producto.unidades),
              numero(redondear(producto.costoUnitario)),
              numero(redondear(producto.perdido)),
            ],
          ),
          [
            texto('Total', ENCABEZADO),
            numero(perdidas.unidadesPerdidas, ENCABEZADO),
            texto('', ENCABEZADO),
            numero(redondear(perdidas.plataPerdida), ENCABEZADO),
          ] as FilaExcel,
        ]
      : [sinDatos()]),
  ]
}

function filasCortes(resumen: ReportesSummary): FilaExcel[] {
  const { cortes } = resumen
  const promedio = cortes.cantidad > 0 ? cortes.diferenciaTotal / cortes.cantidad : 0

  return [
    seccion('Resumen'),
    par('Cortes', cortes.cantidad),
    par('Con descuadre', cortes.conDescuadre),
    par('Diferencia acumulada', redondear(cortes.diferenciaTotal)),
    par('Diferencia promedio', redondear(promedio)),
    vacia(),

    seccion('Arqueos de caja'),
    encabezado('Cierre', 'Responsable', 'Inicial', 'Esperado', 'Real', 'Diferencia'),
    ...(cortes.cortes.length > 0
      ? cortes.cortes.map(
          (corte): FilaExcel => [
            texto(formatearCierre(corte.fechaCierre)),
            texto(corte.empleadoNombre),
            numero(redondear(corte.montoInicial)),
            numeroOp(corte.montoEsperado),
            numeroOp(corte.montoReal),
            numeroOp(corte.diferencia),
          ],
        )
      : [sinDatos()]),
  ]
}

function filasDevoluciones(resumen: ReportesSummary): FilaExcel[] {
  const devoluciones = resumen.devoluciones

  return [
    seccion('Resumen'),
    par('Devoluciones completadas', devoluciones?.cantidad ?? 0),
    par('Unidades reintegradas al stock', devoluciones?.unidades ?? 0),
    par('Importe de devoluciones', redondear(devoluciones?.total ?? 0)),
    par('Costo revertido', redondear(devoluciones?.costo ?? 0)),
    par('Ganancia revertida', redondear(devoluciones?.gananciaRevertida ?? 0)),
  ]
}
