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
  perdidas: { cantidadMermas: 2, unidadesPerdidas: 13, plataPerdida: 3400, porProducto: [] },
  cortes: { cantidad: 7, diferenciaTotal: -125, conDescuadre: 3, cortes: [] },
  devoluciones: {
    cantidad: 3,
    unidades: 7,
    total: 4200,
    costo: 2800,
    gananciaRevertida: 1400,
  },
}

describe('PESTANAS_REPORTES', () => {
  it('incluye devoluciones junto a las pestañas actuales', () => {
    expect(PESTANAS_REPORTES.map((p) => p.valor)).toEqual([
      'ventas',
      'movimientos',
      'perdidas',
      'cortes',
      'devoluciones',
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
    const juegos = (['ventas', 'movimientos', 'perdidas', 'cortes', 'devoluciones'] as const).map((p) =>
      metricasDePestana(p, COMPLETO).map((m) => m.titulo),
    )

    expect(new Set(juegos).size).toBe(5)
  })

  it('ninguna métrica se repite dentro de la misma pestaña', () => {
    for (const pestana of PESTANAS_REPORTES) {
      const titulos = metricasDePestana(pestana.valor, COMPLETO).map((m) => m.titulo)

      expect(new Set(titulos).size).toBe(titulos.length)
    }
  })

  it('ventas: ingresos, ganancia, costo y ticket promedio', () => {
    const [ingresos, ganancia, costo, ticket] = metricasDePestana('ventas', COMPLETO)

    expect(ingresos?.titulo).toBe('Ingresos')
    expect(ingresos?.valor).toBe('$20000.00')
    expect(ingresos?.subtitulo).toBe('40 ventas')
    expect(ganancia?.titulo).toBe('Ganancia estimada')
    expect(ganancia?.valor).toBe('$8000.00')
    expect(ganancia?.subtitulo).toBe('40.0% de margen')
    expect(costo?.titulo).toBe('Costo de mercadería')
    expect(costo?.valor).toBe('$12000.00')
    expect(ticket?.titulo).toBe('Ticket promedio')
    expect(ticket?.valor).toBe('$500.00')
  })

  it('ventas: ticket promedio es cero sin ventas, no NaN', () => {
    const ticket = metricasDePestana('ventas', { ...COMPLETO, cantVentas: 0, totalVentas: 0 })[3]

    expect(ticket?.valor).toBe('$0.00')
  })

  it('ventas: singulariza la cantidad de ventas', () => {
    const [ingresos] = metricasDePestana('ventas', { ...COMPLETO, cantVentas: 1 })

    expect(ingresos?.subtitulo).toBe('1 venta')
  })

  it('ventas: resultado negativo se marca en rojo', () => {
    const [, ganancia] = metricasDePestana('ventas', { ...COMPLETO, resultado: -500 })

    expect(ganancia?.tono).toBe('rose')
  })

  it('movimientos: cantidad, unidades y el desglose entradas/salidas', () => {
    const [cantidad, unidades, entradas, salidas] = metricasDePestana('movimientos', COMPLETO)

    expect(cantidad?.titulo).toBe('Movimientos')
    expect(cantidad?.valor).toBe(25)
    expect(unidades?.titulo).toBe('Unidades movidas')
    expect(unidades?.valor).toBe('310')
    expect(entradas?.titulo).toBe('Entradas')
    expect(entradas?.valor).toBe(8)
    expect(salidas?.titulo).toBe('Salidas')
    expect(salidas?.valor).toBe(17)
    expect(salidas?.tono).toBe('amber')
  })

  it('perdidas: usa la plata perdida del backend', () => {
    const [mermas, unidades, plata, afectados] = metricasDePestana('perdidas', COMPLETO)

    expect(mermas?.valor).toBe(2)
    expect(mermas?.subtitulo).toBe('registros de merma')
    expect(unidades?.valor).toBe('13')
    expect(plata?.valor).toBe('$3400.00')
    expect(plata?.tono).toBe('rose')
    expect(afectados?.valor).toBe(0)
  })

  it('perdidas: sin mermas queda en verde, no en rojo', () => {
    const [mermas, plata] = metricasDePestana('perdidas', resumenVacio())

    expect(mermas?.tono).toBe('emerald')
    expect(plata?.tono).toBe('emerald')
  })

  it('cortes: avisa cuántos descuadran', () => {
    const [cantidad, descuadres, diferencia, promedio] = metricasDePestana('cortes', COMPLETO)

    expect(cantidad?.valor).toBe(7)
    expect(cantidad?.subtitulo).toBe('Turnos cerrados')
    expect(descuadres?.valor).toBe(3)
    expect(descuadres?.subtitulo).toBe('Cajas que no cerraron exactas')
    expect(diferencia?.valor).toBe('$-125.00')
    expect(promedio?.subtitulo).toBe('Por corte')
  })

  it('cortes: todos cuadrados se informa distinto', () => {
    const descuadres = metricasDePestana('cortes', {
      ...COMPLETO,
      cortes: { cantidad: 4, diferenciaTotal: 0, conDescuadre: 0, cortes: [] },
    })[1]

    expect(descuadres?.subtitulo).toBe('Todos cuadrados')
    expect(descuadres?.tono).toBe('emerald')
  })

  it('cortes: diferencia negativa en rojo, positiva en verde', () => {
    expect(metricasDePestana('cortes', COMPLETO)[2]?.tono).toBe('rose')

    const positiva = metricasDePestana('cortes', {
      ...COMPLETO,
      cortes: { cantidad: 4, diferenciaTotal: 90, conDescuadre: 0, cortes: [] },
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

    expect(String(unidades)).toBe(String(metricasDePestana('movimientos', COMPLETO)[1]?.valor))
  })

  it('la suma de movimientos del desglose es la métrica "Movimientos"', () => {
    const cantidad = filasMovimientos(COMPLETO).reduce((acc, fila) => acc + fila.cantidad, 0)

    expect(cantidad).toBe(metricasDePestana('movimientos', COMPLETO)[0]?.valor)
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
