import { describe, expect, it } from 'vitest'
import type { ReportesSummary } from '../../../electron/db/types'
import { construirExportacion, nombreArchivoExportacion } from './exportacionQuery'
import type { FilaExcel } from '../../../electron/exportaciones.types'
import { PESTANAS_REPORTES, type PestanaReportes } from './metricasPestana'
import type { RangoFechas } from './reportsQuery'

function resumenVacio(): ReportesSummary {
  return {
    totalVentas: 0,
    totalCobrado: 0,
    cantVentas: 0,
    caja: null,
    movimientos: { cantidad: 0, unidades: 0, entradas: 0, salidas: 0, porTipo: [] },
    perdidas: {
      cantidadMermas: 0,
      unidadesPerdidas: 0,
      cantidadSinValuar: 0,
      unidadesSinValuar: 0,
      mermasSinProducto: 0,
      plataPorCostoLote: 0,
      plataPorReferencia: 0,
      plataPerdida: 0,
      mermas: [],
      porProducto: [],
    },
    cortes: { cantidad: 0, cortesConDatos: 0, sinDatosArqueo: 0, diferenciaTotal: 0, conDescuadre: 0, cortes: [] },
    ventasPorMetodo: [],
    productosMasVendidos: [],
    ventasPorDia: [],
  } as unknown as ReportesSummary
}

const COMPLETO: ReportesSummary = {
  ...resumenVacio(),
  totalVentas: 20000,
  totalCobrado: 20000,
  cantVentas: 40,
  ventasPorDia: [
    { fecha: '2026-03-02', ventas: 3, abonos: 1, unidades: 5, total: 5000 },
    { fecha: '2026-03-04', ventas: 2, abonos: 0, unidades: 2, total: 2000 },
  ],
  ventasPorMetodo: [
    { metodo: 'efectivo', monto: 12000 },
    { metodo: 'transferencia', monto: 5000 },
    { metodo: 'debito', monto: 3000 },
  ],
  productosMasVendidos: [
    { productoId: 1, nombre: 'Gaseosa Cola', cantidad: 30, monto: 6000 },
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
    cantidadSinValuar: 0,
    unidadesSinValuar: 0,
    mermasSinProducto: 0,
    plataPorCostoLote: 3400,
    plataPorReferencia: 0,
    plataPerdida: 3400,
    mermas: [
      {
        id: 45,
        productoId: 1,
        loteId: 8,
        ventaId: null,
        tipo: 'merma',
        cantidad: 13,
        costoUnitarioReferencia: null,
        fuenteCostoMerma: 'lote',
        stockAnterior: 20,
        stockPosterior: 7,
        motivo: 'Vencido',
        fechaHora: '2026-03-03T10:30:00.000',
        nombreProducto: 'Yogur',
        costoUnitario: 261.53846153846155,
        fuenteCosto: 'lote',
        perdidaEstimada: 3400,
      },
    ],
    porProducto: [
      { productoId: 1, nombre: 'Yogur', unidades: 13, unidadesSinValuar: 0, mermasSinValuar: 0, perdido: 3400 },
    ],
  },
  cortes: {
    cantidad: 2,
    cortesConDatos: 1,
    sinDatosArqueo: 1,
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
  return construirExportacion({
    pestana,
    resumen,
    rango,
    generadoEn: GENERADO,
    metodosHabilitados: {
      tarjetaHabilitada: true,
      transferenciaHabilitada: true,
      qrHabilitado: true,
      cuentaCorrienteHabilitada: true,
    },
  })
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

  it('el resultado es JSON-subeable: solo números, strings y booleanos', () => {
    const input = exportar('cortes')

    expect(JSON.parse(JSON.stringify(input))).toEqual(input)
  })
})

describe('exportación de la pestaña Ventas', () => {
  const filas = filasDe('ventas')

  it('apila las secciones que se leen en pantalla', () => {
    expect(tieneSeccion(filas, 'Resumen')).toBe(true)
    expect(tieneSeccion(filas, 'Ingresos cobrados por día')).toBe(true)
    expect(tieneSeccion(filas, 'Medios de pago')).toBe(true)
    expect(tieneSeccion(filas, 'Productos más vendidos')).toBe(true)
  })

  it('los montos van como números y el saldo no se presenta como ganancia contable', () => {
    expect(valorDe(filas, 'Ingresos cobrados')).toBe(20000)
    expect(valorDe(filas, 'Cobros netos de mermas valuadas')).toBe(16600)
    expect(valorDe(filas, 'Importe valuado de mermas')).toBe(3400)
    expect(valorDe(filas, 'Ticket promedio')).toBe(500)
  })

  it('densifica el eje: los días sin venta del período salen con ceros', () => {
    const fechas = filas
      .filter((fila) => /^\d{2}\/\d{2}$/.test(String(fila[0]?.value)))
      .map((fila) => fila[0]!.value)

    expect(fechas).toEqual(['01/03', '02/03', '03/03', '04/03', '05/03'])
  })

  it('exporta débito, crédito y cuenta corriente con sus propios nombres', () => {
    const conTarjetaYCuenta = exportar('ventas', {
      ...COMPLETO,
      ventasPorMetodo: [
        { metodo: 'credito', monto: 1000 },
        { metodo: 'cuenta_corriente', monto: 2000 },
      ],
    }).hojas[0]!.filas

    const tarjeta = conTarjetaYCuenta.find((fila) => fila[0]?.value === 'Tarjeta de crédito')
    const cuenta = conTarjetaYCuenta.find((fila) => fila[0]?.value === 'Cuenta corriente')
    expect(tarjeta?.[1]?.value).toBe(1000)
    expect(cuenta?.[1]?.value).toBe(2000)
  })

  it('omite de la hoja los métodos desactivados en los ajustes', () => {
    const filas = construirExportacion({
      pestana: 'ventas',
      resumen: {
        ...COMPLETO,
        ventasPorMetodo: [
          { metodo: 'efectivo', monto: 100 },
          { metodo: 'transferencia', monto: 50 },
          { metodo: 'qr', monto: 25 },
          { metodo: 'debito', monto: 10 },
        ],
      },
      rango: RANGO,
      generadoEn: GENERADO,
      metodosHabilitados: {
        tarjetaHabilitada: false,
        transferenciaHabilitada: false,
        qrHabilitado: true,
        cuentaCorrienteHabilitada: true,
      },
    }).hojas[0]!.filas

    expect(filas.some((fila) => fila[0]?.value === 'Transferencia')).toBe(false)
    expect(filas.some((fila) => fila[0]?.value === 'Tarjeta de débito')).toBe(false)
    expect(filas.some((fila) => fila[0]?.value === 'QR')).toBe(true)
  })

  it('no exporta un ticket promedio cero si no hubo ventas', () => {
    const filas = filasDe('ventas', { ...COMPLETO, cantVentas: 0, totalVentas: 0 })
    expect(valorDe(filas, 'Ticket promedio')).toBe('—')
  })

  it('omite los porcentajes de todos los medios si hay un reintegro neto', () => {
    const filasConReintegro = filasDe('ventas', {
      ...COMPLETO,
      ventasPorMetodo: [
        { metodo: 'efectivo', monto: -100 },
        { metodo: 'transferencia', monto: 50 },
      ],
    })
    const efectivo = filasConReintegro.find((fila) => fila[0]?.value === 'Efectivo')
    const transferencia = filasConReintegro.find((fila) => fila[0]?.value === 'Transferencia')

    expect(efectivo?.[1]?.value).toBe(-100)
    expect(efectivo?.[2]?.value).toBe('No aplica: hay reintegros netos')
    expect(transferencia?.[2]?.value).toBe('No aplica: hay reintegros netos')
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

  it('exporta cada merma con fecha, lote, costo aplicado, motivo y total conocido', () => {
    expect(tieneSeccion(filas, 'Detalle de mermas')).toBe(true)
    expect(valorDe(filas, 'Importe valuado')).toBe(3400)

    const producto = filas.find((fila) => fila.some((celda) => celda.value === 'Yogur'))
    expect(producto?.[2]?.value).toBe(13)
    expect(producto?.[3]?.value).toBe('Lote #8')
    expect(producto?.[5]?.value).toBe('Costo histórico del lote')
    expect(producto?.[6]?.value).toBe(3400)
    expect(producto?.[7]?.value).toBe('Vencido')

    const total = filas.find((fila) => fila[0]?.value === 'Total conocido')
    expect(total?.[2]?.value).toBe(13)
    expect(total?.[6]?.value).toBe(3400)
  })

  it('marca como no valuadas las mermas antiguas sin costo guardado', () => {
    const incompleto: ReportesSummary = {
      ...COMPLETO,
      perdidas: {
        ...COMPLETO.perdidas,
        cantidadMermas: 2,
        unidadesPerdidas: 15,
        cantidadSinValuar: 1,
        unidadesSinValuar: 2,
        mermas: [
          ...COMPLETO.perdidas.mermas,
          {
            id: 46,
            productoId: 1,
            loteId: null,
            ventaId: null,
            tipo: 'merma',
            cantidad: 2,
            costoUnitarioReferencia: null,
            fuenteCostoMerma: null,
            stockAnterior: 5,
            stockPosterior: 3,
            motivo: 'Registro antiguo',
            fechaHora: '2026-03-03T11:30:00.000',
            nombreProducto: 'Yogur',
            costoUnitario: null,
            fuenteCosto: 'sin_dato',
            perdidaEstimada: null,
          },
        ],
      },
    }
    const filasIncompletas = filasDe('perdidas', incompleto)
    const filaAntigua = filasIncompletas.find((fila) => fila.some((celda) => celda.value === 'Registro antiguo'))

    expect(valorDe(filasIncompletas, 'Unidades sin costo histórico')).toBe(2)
    expect(filaAntigua?.[6]?.value).toBe('Sin valor')
  })
})

describe('exportación de la pestaña Cortes', () => {
  const filas = filasDe('cortes')

  it('formatea el cierre, promedia solo arqueos disponibles y exporta el detalle visible', () => {
    expect(valorDe(filas, 'Diferencia promedio')).toBe(-125)
    expect(valorDe(filas, 'Sin datos de arqueo')).toBe(1)

    const cerrada = filas.find((fila) => fila[1]?.value === 'Ana')
    expect(cerrada?.[0]?.value).toBe('02/03/26 · 22:30')
    expect(cerrada?.[3]?.value).toBe(11875)
    expect(cerrada?.[4]?.value).toBe(-125)
    expect(cerrada?.[6]?.value).toBe('8 h 30 min')
    expect(cerrada?.[7]?.value).toBe('Sin nota registrada')
    expect(cerrada?.some((celda) => celda.value === 5000)).toBe(false)

    const sinCerrar = filas.find((fila) => fila[1]?.value === 'Luis')
    expect(sinCerrar?.[0]?.value).toBe('Sin fecha')
    expect(sinCerrar?.[2]?.value).toBe('—')
    expect(sinCerrar?.[4]?.value).toBe('—')
    expect(sinCerrar?.[6]?.value).toBe('—')
  })

  it('deja diferencias sin valor si ningún corte tiene datos de arqueo', () => {
    const filasSinArqueo = filasDe('cortes', {
      ...COMPLETO,
      cortes: { cantidad: 2, cortesConDatos: 0, sinDatosArqueo: 2, diferenciaTotal: 0, conDescuadre: 0, cortes: [] },
    })

    expect(valorDe(filasSinArqueo, 'Diferencia acumulada')).toBe('—')
    expect(valorDe(filasSinArqueo, 'Diferencia promedio')).toBe('—')
  })
})
