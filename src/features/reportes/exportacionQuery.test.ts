import { describe, expect, it } from 'vitest'
import type { ReportesSummary } from '../../../electron/db/types'
import { construirExportacion, nombreArchivoExportacion } from './exportacionQuery'
import type { FilaExcel } from '../../../electron/exportaciones.types'
import { PESTANAS_REPORTES, type PestanaReportes } from './metricasPestana'
import type { RangoFechas } from './reportsQuery'

function resumenVacio(): ReportesSummary {
  return {
    totalVentas: 0,
    totalCosto: 0,
    resultado: 0,
    cantVentas: 0,
    caja: null,
    movimientos: { cantidad: 0, unidades: 0, entradas: 0, salidas: 0, porTipo: [] },
    perdidas: { cantidadMermas: 0, unidadesPerdidas: 0, plataPerdida: 0, porProducto: [] },
    cortes: { cantidad: 0, diferenciaTotal: 0, conDescuadre: 0, cortes: [] },
    ventasPorMetodo: [],
    productosMasVendidos: [],
    ventasPorDia: [],
  } as unknown as ReportesSummary
}

const COMPLETO: ReportesSummary = {
  ...resumenVacio(),
  totalVentas: 20000,
  totalCosto: 12000,
  resultado: 8000,
  cantVentas: 40,
  ventasPorDia: [
    { fecha: '2026-03-02', ventas: 3, unidades: 5, total: 5000, costo: 3000 },
    { fecha: '2026-03-04', ventas: 2, unidades: 2, total: 2000, costo: 1200 },
  ],
  ventasPorMetodo: [
    { metodo: 'efectivo', monto: 12000 },
    { metodo: 'transferencia', monto: 5000 },
    { metodo: 'debito', monto: 3000 },
  ],
  productosMasVendidos: [
    { productoId: 1, nombre: 'Gaseosa Cola', cantidad: 30, monto: 6000, costo: 3600, margen: 2400 },
  ],
  movimientos: {
    cantidad: 25,
    unidades: 310,
    entradas: 8,
    salidas: 17,
    porTipo: [
      { tipo: 'entrada', cantidad: 8, unidades: 200 },
      { tipo: 'merma', cantidad: 2, unidades: 13 },
    ],
  },
  perdidas: {
    cantidadMermas: 2,
    unidadesPerdidas: 13,
    plataPerdida: 3400,
    porProducto: [
      { productoId: 1, nombre: 'Yogur', unidades: 13, costoUnitario: 261.5, perdido: 3400 },
    ],
  },
  cortes: {
    cantidad: 2,
    diferenciaTotal: -125,
    conDescuadre: 1,
    cortes: [
      {
        id: 10,
        empleadoNombre: 'Ana',
        montoInicial: 5000,
        montoEsperado: 12000,
        montoReal: 11875,
        diferencia: -125,
        fechaApertura: '2026-03-02T14:00:00.000',
        // Sin offset a propósito: la expect apunta a la hora LOCAL del corte y
        // con Z dependería de la zona horaria de la máquina que corre el test.
        fechaCierre: '2026-03-02T22:30:00.000',
        observaciones: null,
      },
      {
        id: 11,
        empleadoNombre: 'Luis',
        montoInicial: 5000,
        montoEsperado: null,
        montoReal: null,
        diferencia: null,
        fechaApertura: null,
        fechaCierre: null,
        observaciones: null,
      },
    ],
  },
  devoluciones: {
    cantidad: 2,
    unidades: 4,
    total: 500,
    costo: 300,
    gananciaRevertida: 200,
  },
}

const RANGO: RangoFechas = {
  desde: '2026-03-01T00:00:00.000-03:00',
  hasta: '2026-03-05T23:59:59.999-03:00',
}

const GENERADO = new Date(2026, 2, 6, 14, 30, 5)

function exportar(
  pestana: PestanaReportes,
  resumen: ReportesSummary = COMPLETO,
  rango: RangoFechas = RANGO,
) {
  return construirExportacion({ pestana, resumen, rango, generadoEn: GENERADO })
}

function filasDe(pestana: PestanaReportes, resumen?: ReportesSummary): FilaExcel[] {
  const hojas = exportar(pestana, resumen).hojas
  return hojas[0]!.filas
}

function valorDe(
  filas: FilaExcel[],
  clave: string,
): string | number | boolean | undefined {
  const fila = filas.find((f) => f[0]?.value === clave)
  return fila?.[1]?.value
}

function tieneSeccion(filas: FilaExcel[], titulo: string): boolean {
  return filas.some((fila) => fila[0]?.value === titulo)
}

describe('nombreArchivoExportacion', () => {
  it('es legible, con la pestaña, la fecha y la extensión', () => {
    expect(nombreArchivoExportacion('ventas', new Date(2026, 0, 2, 3, 4, 5))).toBe(
      'reportes-ventas-2026-01-02-030405.xlsx',
    )
    expect(nombreArchivoExportacion('cortes', GENERADO)).toBe(
      'reportes-cortes-2026-03-06-143005.xlsx',
    )
  })
})

describe('construirExportacion', () => {
  it('arma una sola hoja con el nombre de la pestaña activa', () => {
    for (const pestana of PESTANAS_REPORTES) {
      const input = exportar(pestana.valor)

      expect(input.hojas).toHaveLength(1)
      expect(input.hojas[0]!.nombre).toBe(pestana.etiqueta)
      expect(input.nombreArchivo).toContain(pestana.valor)
    }
  })

  it('abre con el título, el período resuelto y el momento del export', () => {
    const filas = filasDe('ventas')

    expect(filas[0]![0]!.value).toBe('Panda Stock · Reportes — Ventas')
    expect(filas[1]![0]!.value).toBe('Período: 01/03 - 05/03')
    expect(filas[2]![0]!.value).toBe('Exportado: 06/03/2026 14:30')
  })

  it('exporta el resumen de devoluciones, sin sustituirlo por ventas', () => {
    const filas = filasDe('devoluciones', COMPLETO)

    expect(tieneSeccion(filas, 'Resumen')).toBe(true)
    expect(filas.some((fila) => fila.some((celda) => celda.value === 'Devoluciones completadas'))).toBe(true)
    expect(filas.some((fila) => fila.some((celda) => celda.value === 'Ventas por día'))).toBe(false)
  })

  it('el resultado es JSON-subeable: solo números, strings y booleanos', () => {
    const input = exportar('cortes')

    expect(JSON.parse(JSON.stringify(input))).toEqual(input)
  })
})

describe('exportación de la pestaña Ventas', () => {
  const filas = filasDe('ventas')

  it('apila las secciones que se leen en pantalla', () => {
    expect(tieneSeccion(filas, 'Resumen')).toBe(true)
    expect(tieneSeccion(filas, 'Ventas por día')).toBe(true)
    expect(tieneSeccion(filas, 'Medios de pago')).toBe(true)
    expect(tieneSeccion(filas, 'Productos más vendidos')).toBe(true)
  })

  it('los montos van como números para que Excel pueda sumarlos', () => {
    expect(valorDe(filas, 'Ingresos')).toBe(20000)
    expect(valorDe(filas, 'Ganancia estimada')).toBe(8000)
    expect(valorDe(filas, 'Ticket promedio')).toBe(500)
    expect(valorDe(filas, 'Margen')).toBe(40)
  })

  it('densifica el eje: los días sin venta del período salen con ceros', () => {
    const fechas = filas
      .filter((fila) => /^\d{2}\/\d{2}$/.test(String(fila[0]?.value)))
      .map((fila) => fila[0]!.value)

    expect(fechas).toEqual(['01/03', '02/03', '03/03', '04/03', '05/03'])
  })

  it('agrupa crédito y cuenta corriente en un solo medio', () => {
    const conCredito = exportar('ventas', {
      ...COMPLETO,
      ventasPorMetodo: [
        { metodo: 'credito', monto: 1000 },
        { metodo: 'cuenta_corriente', monto: 2000 },
      ],
    }).hojas[0]!.filas

    const filaCredito = conCredito.find((fila) => fila[0]?.value === 'Crédito')
    expect(filaCredito?.[1]?.value).toBe(3000)
  })

  it('marca con nota las secciones sin datos en vez de dejar filas vacías', () => {
    const vacias = filasDe('ventas', resumenVacio())

    expect(vacias.some((fila) => fila[0]?.value === 'Sin datos en el período')).toBe(true)
  })
})

describe('exportación de la pestaña Movimientos', () => {
  const filas = filasDe('movimientos')

  it('cuenta el total en el resumen y detalla cada tipo con su etiqueta', () => {
    expect(valorDe(filas, 'Movimientos')).toBe(25)
    expect(valorDe(filas, 'Entradas')).toBe(8)
    expect(valorDe(filas, 'Salidas')).toBe(17)

    const merma = filas.find((fila) => fila[0]?.value === 'Mermas')
    expect(merma?.[1]?.value).toBe(2)
    expect(merma?.[2]?.value).toBe(13)
  })

  it('con resumen vacío avisa que no hubo movimientos', () => {
    const vacias = filasDe('movimientos', resumenVacio())

    expect(vacias.some((fila) => fila[0]?.value === 'Sin datos en el período')).toBe(true)
  })
})

describe('exportación de la pestaña Pérdidas', () => {
  const filas = filasDe('perdidas')

  it('detalla cada producto y cierra con el total del período', () => {
    expect(tieneSeccion(filas, 'Mermas por producto')).toBe(true)
    expect(valorDe(filas, 'Plata perdida')).toBe(3400)

    const producto = filas.find((fila) => fila[0]?.value === 'Yogur')
    expect(producto?.[1]?.value).toBe(13)
    expect(producto?.[3]?.value).toBe(3400)

    const total = filas.find((fila) => fila[0]?.value === 'Total')
    expect(total?.[1]?.value).toBe(13)
    expect(total?.[3]?.value).toBe(3400)
  })
})

describe('exportación de la pestaña Cortes', () => {
  const filas = filasDe('cortes')

  it('formatia el cierre y marca con guion los montos que la caja no registró', () => {
    expect(valorDe(filas, 'Diferencia promedio')).toBe(-62.5)

    const cerrada = filas.find((fila) => fila[1]?.value === 'Ana')
    expect(cerrada?.[0]?.value).toBe('02/03/26 · 22:30')
    expect(cerrada?.[4]?.value).toBe(11875)
    expect(cerrada?.[5]?.value).toBe(-125)

    const sinCerrar = filas.find((fila) => fila[1]?.value === 'Luis')
    expect(sinCerrar?.[0]?.value).toBe('Sin fecha')
    expect(sinCerrar?.[3]?.value).toBe('—')
    expect(sinCerrar?.[5]?.value).toBe('—')
  })
})
