import { describe, expect, it } from 'vitest'
import {
  agruparMetodos,
  construirEjeDias,
  construirRanking,
  calcularTotales,
  etiquetaVisible,
  formatearDia,
  formatearMoneda,
  formatearMonedaCompacta,
  formatearRangoLegible,
  pasoEje,
  porcentaje,
  rangoDesdePeriodo,
  totalTarjetaCuentaCorriente,
  type RangoFechas,
} from './reportsQuery'
import type { ProductoRanking, VentaDiaria } from '../../../electron/db/types'

function dia(fecha: string, total: number, unidades = 1, ventas = 1, abonos = 0): VentaDiaria {
  return { fecha, ventas, abonos, unidades, total }
}

function rango(desde: string | null, hasta: string | null): RangoFechas {
  return { desde, hasta }
}

describe('formateo', () => {
  it('muestra la moneda con dos decimales', () => {
    expect(formatearMoneda(1234.5)).toBe('$1234.50')
    expect(formatearMoneda(0)).toBe('$0.00')
  })

  it('compacta para el eje de los gráficos', () => {
    expect(formatearMonedaCompacta(950)).toBe('$950')
    expect(formatearMonedaCompacta(1_250)).toBe('$1.3K')
    expect(formatearMonedaCompacta(1_340_000)).toBe('$1.3M')
  })

  it('compacta negativos conservando el signo', () => {
    expect(formatearMonedaCompacta(-2_500)).toBe('$-2.5K')
  })
})

describe('porcentaje', () => {
  it('devuelve 0 en vez de NaN cuando el total es cero', () => {
    expect(porcentaje(100, 0)).toBe(0)
    expect(Number.isNaN(porcentaje(0, 0))).toBe(false)
  })

  it('calcula la proporción', () => {
    expect(porcentaje(25, 100)).toBe(25)
  })
})

describe('rangoDesdePeriodo', () => {
  const hoy = new Date(2026, 2, 15, 14, 30)

  it('limita el día seleccionado a sus extremos locales', () => {
    const { desde, hasta } = rangoDesdePeriodo('day', new Date(2026, 2, 9), hoy)
    expect(desde).toBe(new Date(2026, 2, 9, 0, 0, 0, 0).toISOString())
    expect(hasta).toBe(new Date(2026, 2, 9, 23, 59, 59, 999).toISOString())
  })

  it('muestra el mes completo cuando se elige uno anterior', () => {
    const { desde, hasta } = rangoDesdePeriodo('month', new Date(2026, 1, 1), hoy)
    expect(desde).toBe(new Date(2026, 1, 1, 0, 0, 0, 0).toISOString())
    expect(hasta).toBe(new Date(2026, 1, 28, 23, 59, 59, 999).toISOString())
  })

  it('cierra el mes actual al día de hoy', () => {
    const { desde, hasta } = rangoDesdePeriodo('month', hoy, hoy)
    expect(desde).toBe(new Date(2026, 2, 1, 0, 0, 0, 0).toISOString())
    expect(hasta).toBe(new Date(2026, 2, 15, 23, 59, 59, 999).toISOString())
  })

  it('cierra el año elegido al 31 de diciembre', () => {
    const { desde, hasta } = rangoDesdePeriodo('year', new Date(2025, 6, 1), hoy)
    expect(desde).toBe(new Date(2025, 0, 1, 0, 0, 0, 0).toISOString())
    expect(hasta).toBe(new Date(2025, 11, 31, 23, 59, 59, 999).toISOString())
  })

  it('cierra el año actual al día de hoy', () => {
    const { desde, hasta } = rangoDesdePeriodo('year', hoy, hoy)
    expect(desde).toBe(new Date(2026, 0, 1, 0, 0, 0, 0).toISOString())
    expect(hasta).toBe(new Date(2026, 2, 15, 23, 59, 59, 999).toISOString())
  })
})

describe('formatearDia', () => {
  it('devuelve dd/mm con dos dígitos', () => {
    expect(formatearDia('2026-03-09')).toBe('09/03')
  })

it('no inventa una fecha si el valor no parsea', () => {
    expect(formatearDia('basura')).toBe('basura')
  })

  it('con hora y offset lee el día local, no el del string UTC', () => {
    // El preset "hoy" en un huso negativo arranca el día anterior en UTC y
    // termina en el siguiente: recortando mostraría dos días para un turno.
    expect(formatearDia(new Date(2026, 2, 15, 0, 0, 0).toISOString())).toBe('15/03')
    expect(formatearDia(new Date(2026, 2, 15, 23, 59, 59).toISOString())).toBe('15/03')
  })

  it('no corre el día de una etiqueta de eje, que no lleva hora', () => {
    // `YYYY-MM-DD` parseado como ISO es UTC medianoche: en UTC-3 cae en el 8.
    expect(formatearDia('2026-03-09')).toBe('09/03')
  })
})

describe('formatearRangoLegible', () => {
  it('rango completo muestra las dos puntas', () => {
    expect(
      formatearRangoLegible({ desde: '2026-03-01T00:00:00.000-03:00', hasta: '2026-03-31T23:59:59.999-03:00' }),
    ).toBe('01/03 - 31/03')
  })

  it('un solo día no muestra "día - día"', () => {
    // Los dos ISO son strings distintos aunque sea el mismo día local.
    expect(
      formatearRangoLegible({ desde: '2026-03-09T00:00:00.000-03:00', hasta: '2026-03-09T23:59:59.999-03:00' }),
    ).toBe('09/03')
  })

  it('un día seleccionado muestra un solo día', () => {
    const hoy = new Date(2026, 2, 15)
    expect(formatearRangoLegible(rangoDesdePeriodo('day', hoy, hoy))).toBe('15/03')
  })

  it('el mes actual muestra desde su inicio hasta hoy', () => {
    const hoy = new Date(2026, 2, 15)
    expect(formatearRangoLegible(rangoDesdePeriodo('month', hoy, hoy))).toBe('01/03 - 15/03')
  })

  it('sin ninguna punta dice todo el historial', () => {
    expect(formatearRangoLegible({ desde: null, hasta: null })).toBe('Todo el historial')
  })

  it('con una sola punta la nombra en vez de dejar un hueco', () => {
    expect(formatearRangoLegible({ desde: '2026-03-01T00:00:00.000-03:00', hasta: null })).toBe('Desde 01/03')
    expect(formatearRangoLegible({ desde: null, hasta: '2026-03-31T23:59:59.999-03:00' })).toBe('Hasta 31/03')
  })
})

describe('construirEjeDias', () => {
  const hoy = new Date(2026, 2, 15)

  it('rellena los días sin venta con cero', () => {
    // Sin rellenar, el gráfico une domingo con martes en diagonal y se lee como
    // una caída que no ocurrió.
    const eje = construirEjeDias([dia('2026-03-09', 100), dia('2026-03-12', 300)], rango('2026-03-09T00:00:00.000-03:00', '2026-03-12T23:59:59.999-03:00'), hoy)
    expect(eje.map((p) => p.fecha)).toEqual([
      '2026-03-09',
      '2026-03-10',
      '2026-03-11',
      '2026-03-12',
    ])
    expect(eje[1]).toMatchObject({ ventas: 0, unidades: 0, total: 0 })
    expect(eje[3]).toMatchObject({ total: 300 })
  })

  it('conserva los ingresos netos en el día', () => {
    const eje = construirEjeDias([dia('2026-03-09', 100)], rango('2026-03-09T00:00:00.000-03:00', '2026-03-09T23:59:59.999-03:00'), hoy)
    expect(eje[0].total).toBe(100)
  })

  it('incluye un día del rango que no aparece en la serie', () => {
    // El filtro cae en un domingo sin ventas: el domingo tiene que estar igual.
    const eje = construirEjeDias([dia('2026-03-10', 100)], rango('2026-03-09T00:00:00.000-03:00', '2026-03-11T23:59:59.999-03:00'), hoy)
    expect(eje.map((p) => p.fecha)).toEqual(['2026-03-09', '2026-03-10', '2026-03-11'])
  })

  it('no dibuja días futuros cuando el rango llega hasta mañana', () => {
    const eje = construirEjeDias([], rango('2026-03-14T00:00:00.000-03:00', '2026-03-20T23:59:59.999-03:00'), hoy)
    expect(eje.at(-1)?.fecha).toBe('2026-03-15')
    expect(eje).toHaveLength(2)
  })

  it('sin rango no inventa un eje gigante', () => {
    const filas = [dia('2026-03-09', 100), dia('2026-03-10', 200)]
    const eje = construirEjeDias(filas, rango(null, null), hoy)
    expect(eje).toHaveLength(2)
  })

  it('devuelve vacío si no hay ventas ni rango', () => {
    expect(construirEjeDias([], rango(null, null), hoy)).toEqual([])
  })

  it('cruza el cambio de mes correctamente', () => {
    const eje = construirEjeDias([], rango('2026-02-27T00:00:00.000-03:00', '2026-03-02T23:59:59.999-03:00'), new Date(2026, 2, 15))
    expect(eje.map((p) => p.fecha)).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02'])
  })
})

describe('pasoEje y etiquetaVisible', () => {
  it('muestra todas las etiquetas con pocos puntos', () => {
    expect(pasoEje(5)).toBe(1)
    expect(etiquetaVisible(3, 5, 1)).toBe(true)
  })

  it('salta etiquetas cuando hay muchos días', () => {
    expect(pasoEje(31)).toBe(4)
    expect(etiquetaVisible(0, 31, 4)).toBe(true)
    expect(etiquetaVisible(1, 31, 4)).toBe(false)
  })

  it('muestra la última etiqueta aunque no caiga en el paso', () => {
    // Si no, el último día del rango queda sin nombre en el eje.
    expect(etiquetaVisible(30, 31, 4)).toBe(true)
  })
})

describe('agruparMetodos', () => {
  it('agrupa tarjeta de crédito y cuenta corriente en un renglón combinado', () => {
    const filas = agruparMetodos([
      { metodo: 'efectivo', monto: 1000 },
      { metodo: 'credito', monto: 300 },
      { metodo: 'cuenta_corriente', monto: 200 },
    ])
    expect(filas).toHaveLength(2)
    expect(filas[0]).toMatchObject({ metodo: 'efectivo', monto: 1000 })
    expect(filas[1]).toMatchObject({ metodo: 'cuenta_corriente', monto: 500 })
  })

  it('ordena de mayor a menor', () => {
    const filas = agruparMetodos([
      { metodo: 'debito', monto: 100 },
      { metodo: 'efectivo', monto: 900 },
    ])
    expect(filas.map((f) => f.metodo)).toEqual(['efectivo', 'debito'])
  })

  it('calcula el porcentaje sobre el total cobrado', () => {
    const filas = agruparMetodos([
      { metodo: 'efectivo', monto: 750 },
      { metodo: 'debito', monto: 250 },
    ])
    expect(filas[0].porcentaje).toBe(75)
    expect(filas[1].porcentaje).toBe(25)
  })

  it('no divide por cero si no se cobró nada', () => {
    expect(agruparMetodos([])).toEqual([])
    expect(agruparMetodos([{ metodo: 'efectivo', monto: 0 }])[0].porcentaje).toBe(0)
  })

  it('omite los medios que no aparecen', () => {
    const filas = agruparMetodos([{ metodo: 'efectivo', monto: 10 }])
    expect(filas.map((f) => f.etiqueta)).toEqual(['Efectivo'])
  })
})

describe('totalTarjetaCuentaCorriente', () => {
  it('suma los importes registrados con tarjeta de crédito o cuenta corriente', () => {
    const filas = agruparMetodos([
      { metodo: 'efectivo', monto: 1000 },
      { metodo: 'credito', monto: 400 },
    ])
    expect(totalTarjetaCuentaCorriente(filas)).toBe(400)
  })

  it('es cero si no hay importes registrados en esos medios', () => {
    expect(totalTarjetaCuentaCorriente(agruparMetodos([{ metodo: 'efectivo', monto: 1000 }]))).toBe(0)
  })
})

describe('construirRanking', () => {
  const filas: ProductoRanking[] = [
    { productoId: 1, nombre: 'Coca', cantidad: 4, monto: 1000 },
    { productoId: 2, nombre: 'Pan', cantidad: 2, monto: 300 },
  ]

  it('calcula el porcentaje sobre el total vendido', () => {
    const ranking = construirRanking(filas, 1300)
    expect(ranking[0].porcentajeVenta).toBeCloseTo(76.9, 1)
    expect(ranking[1].porcentajeVenta).toBeCloseTo(23.1, 1)
  })

  it('no rompe con total vendido cero', () => {
    expect(construirRanking([], 0)).toEqual([])
  })
})

describe('calcularTotales', () => {
  it('deriva unidades y ticket promedio', () => {
    const totales = calcularTotales({
      totalVentas: 1000,
      cantVentas: 4,
      ventasPorDia: [dia('2026-03-09', 600, 3), dia('2026-03-10', 400, 2)],
    })
    expect(totales.unidades).toBe(5)
    expect(totales.ticketPromedio).toBe(250)
  })

  it('no divide por cero sin ventas', () => {
    const totales = calcularTotales({
      totalVentas: 0,
      cantVentas: 0,
      ventasPorDia: [],
    })
    expect(totales.ticketPromedio).toBe(0)
    expect(Number.isNaN(totales.ticketPromedio)).toBe(false)
  })
})
