import { describe, expect, it } from 'vitest'
import type { ReportesSummary } from '../../../electron/db/types'
import {
  PESTANAS_REPORTES,
  etiquetaMovimiento,
  filasMovimientos,
  metricasDePestana,
} from './metricasPestana'

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
  ventasPorDia: [{ fecha: '2026-03-02', ventas: 40, abonos: 0, unidades: 100, total: 20000 }],
  movimientos: {
    cantidad: 25,
    unidades: 310,
    entradas: 8,
    salidas: 17,
    porTipo: [
      { tipo: 'entrada', cantidad: 8, unidades: 200 },
      { tipo: 'ajuste_positivo', cantidad: 1, unidades: 2 },
      { tipo: 'venta', cantidad: 12, unidades: 90 },
      { tipo: 'ajuste_negativo', cantidad: 2, unidades: 5 },
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
    mermas: [],
    porProducto: [],
  },
  cortes: { cantidad: 7, cortesConDatos: 6, sinDatosArqueo: 1, diferenciaTotal: -125, conDescuadre: 3, cortes: [] },
}

describe('PESTANAS_REPORTES', () => {
  it('incluye las vistas activas de reportes', () => {
    expect(PESTANAS_REPORTES.map((p) => p.valor)).toEqual([
      'ventas',
      'movimientos',
      'perdidas',
      'cortes',
    ])
  })

  it('cada pestaña trae un resumen no vacío para el subtítulo de la barra', () => {
    for (const pestana of PESTANAS_REPORTES) {
      expect(pestana.etiqueta.length).toBeGreaterThan(0)
      expect(pestana.resumen.length).toBeGreaterThan(0)
    }
  })
})

describe('metricasDePestana', () => {
  it('devuelve exactamente cuatro métricas en toda pestaña', () => {
    for (const pestana of PESTANAS_REPORTES) {
      expect(metricasDePestana(pestana.valor, COMPLETO)).toHaveLength(4)
    }
  })

  it('cada pestaña muestra un juego distinto de títulos', () => {
    const juegos = PESTANAS_REPORTES.map(({ valor }) =>
      metricasDePestana(valor, COMPLETO).map((m) => m.titulo),
    )

    expect(new Set(juegos).size).toBe(4)
  })

  it('ninguna métrica se repite dentro de la misma pestaña', () => {
    for (const pestana of PESTANAS_REPORTES) {
      const titulos = metricasDePestana(pestana.valor, COMPLETO).map((m) => m.titulo)

      expect(new Set(titulos).size).toBe(titulos.length)
    }
  })

  it('ventas: ingresos, saldo neto de mermas, valoración y ticket promedio', () => {
    const [ventasNetas, resultado, perdidas, ticket] = metricasDePestana('ventas', COMPLETO)

    expect(ventasNetas?.titulo).toBe('Ingresos cobrados')
    expect(ventasNetas?.valor).toBe('$20000.00')
    expect(ventasNetas?.subtitulo).toContain('abonos recibidos')
    expect(resultado?.titulo).toBe('Cobros netos de mermas')
    expect(resultado?.valor).toBe('$16600.00')
    expect(resultado?.subtitulo).toContain('Saldo positivo')
    expect(resultado?.subtitulo).toContain('no descuenta costo de ventas')
    expect(resultado?.tono).toBe('emerald')
    expect(perdidas?.titulo).toBe('Mermas valuadas')
    expect(perdidas?.valor).toBe('$3400.00')
    expect(ticket?.titulo).toBe('Ticket promedio')
    expect(ticket?.valor).toBe('$500.00')
  })

  it('ventas: no inventa un ticket promedio sin ventas', () => {
    const ticket = metricasDePestana('ventas', { ...COMPLETO, cantVentas: 0, totalVentas: 0 })[3]

    expect(ticket?.valor).toBe('—')
    expect(ticket?.subtitulo).toBe('Sin ventas completadas en el período')
  })

  it('ventas: mantiene clara la semántica del ingreso cobrado', () => {
    const [ventasNetas] = metricasDePestana('ventas', { ...COMPLETO, cantVentas: 1 })

    expect(ventasNetas?.titulo).toBe('Ingresos cobrados')
  })

  it('movimientos: valor del inventario y unidades según el sentido del cambio', () => {
    const [inventario, cantidad, entradas, salidas] = metricasDePestana('movimientos', COMPLETO, 12345)

    expect(inventario?.titulo).toBe('Valor del inventario')
    expect(inventario?.valor).toBe('$12345.00')
    expect(inventario?.subtitulo).toBe('Al costo del stock actual')
    expect(cantidad?.titulo).toBe('Movimientos')
    expect(cantidad?.valor).toBe(25)
    expect(entradas?.titulo).toBe('Unidades ingresadas')
    expect(entradas?.valor).toBe('202')
    expect(salidas?.titulo).toBe('Unidades retiradas')
    expect(salidas?.valor).toBe('108')
    expect(salidas?.tono).toBe('amber')
  })

  it('perdidas: resume registros, unidades e importe', () => {
    const [mermas, unidades, plata, afectados] = metricasDePestana('perdidas', COMPLETO)

    expect(mermas?.valor).toBe(2)
    expect(mermas?.subtitulo).toBe('registros de merma')
    expect(unidades?.valor).toBe('13')
    expect(plata?.valor).toBe('$3400.00')
    expect(plata?.tono).toBe('rose')
    expect(afectados?.valor).toBe(0)
  })

  it('perdidas: sin mermas queda en verde, no en rojo', () => {
    const [mermas, , plata] = metricasDePestana('perdidas', resumenVacio())

    expect(mermas?.tono).toBe('emerald')
    expect(plata?.tono).toBe('emerald')
  })

  it('perdidas: avisa cuando faltan costos históricos y marca el importe como parcial', () => {
    const resumen = {
      ...COMPLETO,
      perdidas: {
        ...COMPLETO.perdidas,
        cantidadSinValuar: 1,
        unidadesSinValuar: 3,
      },
    }
    const metricas = metricasDePestana('ventas', resumen)

    expect(metricas[1]?.subtitulo).toContain('1 merma sin costo histórico')
    expect(metricas[1]?.tono).toBe('amber')
    expect(metricas[2]?.subtitulo).toContain('3 unidades sin valor')
    expect(metricas[2]?.tono).toBe('amber')
  })

  it('cortes: avisa cuántos descuadran', () => {
    const [cantidad, descuadres, diferencia, promedio] = metricasDePestana('cortes', COMPLETO)

    expect(cantidad?.valor).toBe(7)
    expect(cantidad?.subtitulo).toBe('Turnos cerrados')
    expect(descuadres?.valor).toBe(3)
    expect(descuadres?.subtitulo).toContain('3 con diferencia')
    expect(descuadres?.subtitulo).toContain('1 sin arqueo')
    expect(diferencia?.valor).toBe('$-125.00')
    expect(promedio?.subtitulo).toBe('Por arqueo · 6 con datos de 7')
  })

  it('cortes: todos cuadrados se informa distinto', () => {
    const descuadres = metricasDePestana('cortes', {
      ...COMPLETO,
      cortes: { cantidad: 4, cortesConDatos: 4, sinDatosArqueo: 0, diferenciaTotal: 0, conDescuadre: 0, cortes: [] },
    })[1]

    expect(descuadres?.subtitulo).toBe('Todos los arqueos cerraron exactos')
    expect(descuadres?.tono).toBe('emerald')
  })

  it('cortes: no informa todos cuadrados cuando hay cierres sin arqueo', () => {
    const descuadres = metricasDePestana('cortes', {
      ...COMPLETO,
      cortes: { cantidad: 4, cortesConDatos: 3, sinDatosArqueo: 1, diferenciaTotal: 0, conDescuadre: 0, cortes: [] },
    })[1]

    expect(descuadres?.subtitulo).toBe('1 sin datos de arqueo')
    expect(descuadres?.tono).toBe('amber')
  })

  it('cortes: no muestra una diferencia cero si ningún corte tiene arqueo', () => {
    const metricas = metricasDePestana('cortes', {
      ...COMPLETO,
      cortes: { cantidad: 3, cortesConDatos: 0, sinDatosArqueo: 3, diferenciaTotal: 0, conDescuadre: 0, cortes: [] },
    })

    expect(metricas[2]?.valor).toBe('—')
    expect(metricas[2]?.subtitulo).toBe('Sin datos de arqueo para calcularla')
    expect(metricas[3]?.valor).toBe('—')
  })

  it('cortes: diferencia negativa en rojo, positiva en verde', () => {
    const negativoCompleto = metricasDePestana('cortes', {
      ...COMPLETO,
      cortes: { cantidad: 6, cortesConDatos: 6, sinDatosArqueo: 0, diferenciaTotal: -125, conDescuadre: 3, cortes: [] },
    })
    expect(negativoCompleto[2]?.tono).toBe('rose')

    expect(metricasDePestana('cortes', COMPLETO)[2]?.tono).toBe('amber')

    const positiva = metricasDePestana('cortes', {
      ...COMPLETO,
      cortes: { cantidad: 4, cortesConDatos: 4, sinDatosArqueo: 0, diferenciaTotal: 90, conDescuadre: 0, cortes: [] },
    })
    expect(positiva[2]?.tono).toBe('emerald')
    expect(positiva[3]?.tono).toBe('emerald')
  })

  it('resumen null devuelve ceros en vez de romper', () => {
    for (const pestana of PESTANAS_REPORTES) {
      const metricas = metricasDePestana(pestana.valor, null)
      expect(metricas).toHaveLength(4)
      expect(metricas.map((m) => m.valor)).not.toContain(NaN)
      expect(metricas.map((m) => m.subtitulo).join('')).not.toContain('NaN')
      expect(metricas.map((m) => String(m.valor)).join('')).not.toContain('NaN')
    }
  })

  it('ninguna métrica queda con valor undefined', () => {
    for (const pestana of PESTANAS_REPORTES) {
      for (const metrica of metricasDePestana(pestana.valor, resumenVacio())) {
        expect(metrica.valor).toBeDefined()
        expect(metrica.subtitulo).not.toBe('')
      }
    }
  })
})

describe('filasMovimientos', () => {
  it('no filtra ningún tipo: el total tiene que cuadrar con la lista', () => {
    expect(filasMovimientos(COMPLETO).map((fila) => fila.tipo)).toEqual([
      'entrada',
      'ajuste_positivo',
      'venta',
      'ajuste_negativo',
      'merma',
    ])
  })

  it('la suma de unidades del desglose es la métrica "Unidades movidas"', () => {
    const unidades = filasMovimientos(COMPLETO).reduce((acc, fila) => acc + fila.unidades, 0)

    expect(unidades).toBe(COMPLETO.movimientos.unidades)
  })

  it('la suma de movimientos del desglose es la métrica "Movimientos"', () => {
    const cantidad = filasMovimientos(COMPLETO).reduce((acc, fila) => acc + fila.cantidad, 0)

    expect(cantidad).toBe(metricasDePestana('movimientos', COMPLETO)[1]?.valor)
  })

  it('con resumen null devuelve lista vacía', () => {
    expect(filasMovimientos(null)).toEqual([])
  })
})

describe('etiquetaMovimiento', () => {
  it('cubre todos los tipos del schema', () => {
    expect(etiquetaMovimiento('entrada')).toBe('Entradas')
    expect(etiquetaMovimiento('venta')).toBe('Ventas')
    expect(etiquetaMovimiento('ajuste_positivo')).toBe('Ajustes +')
    expect(etiquetaMovimiento('ajuste_negativo')).toBe('Ajustes -')
    expect(etiquetaMovimiento('merma')).toBe('Mermas')
    expect(etiquetaMovimiento('devolucion')).toBe('Devoluciones')
  })
})
