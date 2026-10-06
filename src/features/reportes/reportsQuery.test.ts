import { describe, expect, it } from 'vitest'
import {
  CICLO_PERIODOS,
  agruparMetodos,
  construirEjeDias,
  construirRanking,
  calcularTotales,
  etiquetaPeriodo,
  etiquetaVisible,
  formatearDia,
  formatearMoneda,
  formatearMonedaCompacta,
  formatearRangoLegible,
  margenEsNegativo,
  pasoEje,
  porcentaje,
  rangoDesdePreset,
  siguientePeriodo,
  totalCredito,
  type PresetRango,
  type RangoFechas,
} from './reportsQuery'
import type { ProductoRanking, VentaDiaria } from '../../../electron/db/types'

function dia(fecha: string, total: number, costo = total / 2, unidades = 1, ventas = 1): VentaDiaria {
  return { fecha, ventas, unidades, total, costo }
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

describe('rangoDesdePreset', () => {
  const hoy = new Date(2026, 2, 15, 14, 30) // 15/03/2026, 14:30 local

  it('hoy acota al día completo', () => {
    const { desde, hasta } = rangoDesdePreset('hoy', hoy)
    expect(desde).toBe(new Date(2026, 2, 15, 0, 0, 0, 0).toISOString())
    expect(hasta).toBe(new Date(2026, 2, 15, 23, 59, 59, 999).toISOString())
  })

  it('últimos 7 días incluye hoy, o sea 6 días hacia atrás', () => {
    const { desde, hasta } = rangoDesdePreset('siete', hoy)
    expect(desde).toBe(new Date(2026, 2, 9, 0, 0, 0, 0).toISOString())
    expect(hasta).toBe(new Date(2026, 2, 15, 23, 59, 59, 999).toISOString())
  })

  it('últimos 30 días incluye hoy, o sea 29 días hacia atrás', () => {
    // 14/02 a 15/03 son 30 días cerrados. Con 30 hacia atrás serían 31.
    const { desde } = rangoDesdePreset('treinta', hoy)
    expect(desde).toBe(new Date(2026, 1, 14, 0, 0, 0, 0).toISOString())
  })

  it('este mes arranca el día 1 y no el 15', () => {
    const { desde } = rangoDesdePreset('mes_actual', hoy)
    expect(desde).toBe(new Date(2026, 2, 1, 0, 0, 0, 0).toISOString())
  })

  it('mes anterior cruza el cambio de año', () => {
    const enero = new Date(2026, 0, 20, 10)
    const { desde, hasta } = rangoDesdePreset('mes_anterior', enero)
    expect(desde).toBe(new Date(2025, 11, 1, 0, 0, 0, 0).toISOString())
    expect(hasta).toBe(new Date(2025, 11, 31, 23, 59, 59, 999).toISOString())
  })

  it('todo no pone límites', () => {
    expect(rangoDesdePreset('todo', hoy)).toEqual({ desde: null, hasta: null })
  })

  it('devuelve ISO completo con hora, nunca YYYY-MM-DD pelado', () => {
    // Motivo: la base compara strings contra un fecha_hora en UTC, y '2026-03-01'
    // es prefijo de '2026-03-01T12:00:00Z', así que el día 1 quedaría excluido.
    const { desde } = rangoDesdePreset('mes_actual', new Date(2026, 2, 15))
    expect(desde).not.toBe('2026-03-01')
    expect(desde).toContain('T')
  })

  it('este año arranca el 1 de enero y cierra hoy', () => {
    const { desde, hasta } = rangoDesdePreset('anio_actual', new Date(2026, 2, 15))
    expect(desde).toBe(new Date(2026, 0, 1, 0, 0, 0, 0).toISOString())
    expect(hasta).toBe(new Date(2026, 2, 15, 23, 59, 59, 999).toISOString())
  })

  it('este año en diciembre no se pasa al año siguiente', () => {
    const diciembre = new Date(2026, 11, 31, 10)
    const { desde, hasta } = rangoDesdePreset('anio_actual', diciembre)
    expect(desde).toBe(new Date(2026, 0, 1, 0, 0, 0, 0).toISOString())
    expect(hasta).toBe(new Date(2026, 11, 31, 23, 59, 59, 999).toISOString())
  })

  it('no le cruza el horario: el inicio del día es local', () => {
    const { desde } = rangoDesdePreset('hoy', new Date(2026, 2, 15, 0, 30))
    expect(desde).toBe(new Date(2026, 2, 15, 0, 0, 0, 0).toISOString())
  })
})

describe('siguientePeriodo', () => {
  it('recorre día → semana → mes → año', () => {
    expect(siguientePeriodo('hoy')).toBe('siete')
    expect(siguientePeriodo('siete')).toBe('mes_actual')
    expect(siguientePeriodo('mes_actual')).toBe('anio_actual')
  })

  it('vuelve al primer período después del último', () => {
    expect(siguientePeriodo('anio_actual')).toBe('hoy')
  })

  it('si el preset no está en el ciclo arranca en el primero', () => {
    // Queda en `hoy` en vez de devolver un período indefinido.
    expect(siguientePeriodo('todo')).toBe('hoy')
    expect(siguientePeriodo('mes_anterior')).toBe('hoy')
  })

  it('dar vueltas tantas veces como valores tiene el ciclo vuelve al inicio', () => {
    let preset: PresetRango = 'mes_actual'
    for (let i = 0; i < CICLO_PERIODOS.length; i += 1) {
      preset = siguientePeriodo(preset)
    }
    expect(preset).toBe('mes_actual')
  })
})

describe('etiquetaPeriodo', () => {
  it('usa el nombre corto del ciclo', () => {
    expect(etiquetaPeriodo('hoy')).toBe('Día')
    expect(etiquetaPeriodo('siete')).toBe('Semana')
    expect(etiquetaPeriodo('mes_actual')).toBe('Mes')
    expect(etiquetaPeriodo('anio_actual')).toBe('Año')
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

  it('preset "hoy" muestra un solo día', () => {
    const hoy = new Date(2026, 2, 15)
    expect(formatearRangoLegible(rangoDesdePreset('hoy', hoy))).toBe('15/03')
  })

  it('preset "mes actual" muestra el mes completo', () => {
    const hoy = new Date(2026, 2, 15)
    expect(formatearRangoLegible(rangoDesdePreset('mes_actual', hoy))).toBe('01/03 - 15/03')
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
    expect(eje[1]).toMatchObject({ ventas: 0, total: 0, costo: 0, resultado: 0 })
    expect(eje[3]).toMatchObject({ total: 300 })
  })

  it('deriva el resultado por día', () => {
    const eje = construirEjeDias([dia('2026-03-09', 100, 60)], rango('2026-03-09T00:00:00.000-03:00', '2026-03-09T23:59:59.999-03:00'), hoy)
    expect(eje[0].resultado).toBe(40)
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
  it('junta crédito y cuenta corriente en un solo renglón', () => {
    const filas = agruparMetodos([
      { metodo: 'efectivo', monto: 1000 },
      { metodo: 'credito', monto: 300 },
      { metodo: 'cuenta_corriente', monto: 200 },
    ])
    expect(filas).toHaveLength(2)
    expect(filas[0]).toMatchObject({ metodo: 'efectivo', monto: 1000 })
    expect(filas[1]).toMatchObject({ metodo: 'credito', monto: 500 })
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

describe('totalCredito', () => {
  it('suma lo cobrado por los medios a crédito', () => {
    const filas = agruparMetodos([
      { metodo: 'efectivo', monto: 1000 },
      { metodo: 'credito', monto: 400 },
    ])
    expect(totalCredito(filas)).toBe(400)
  })

  it('es cero si no se cobró nada a crédito', () => {
    expect(totalCredito(agruparMetodos([{ metodo: 'efectivo', monto: 1000 }]))).toBe(0)
  })
})

describe('construirRanking', () => {
  const filas: ProductoRanking[] = [
    { productoId: 1, nombre: 'Coca', cantidad: 4, monto: 1000, costo: 400, margen: 600 },
    { productoId: 2, nombre: 'Pan', cantidad: 2, monto: 300, costo: 250, margen: 50 },
  ]

  it('calcula el porcentaje sobre el total vendido', () => {
    const ranking = construirRanking(filas, 1300)
    expect(ranking[0].porcentajeVenta).toBeCloseTo(76.9, 1)
    expect(ranking[1].porcentajeVenta).toBeCloseTo(23.1, 1)
  })

  it('marca el margen negativo', () => {
    expect(margenEsNegativo(-1)).toBe(true)
    expect(margenEsNegativo(0)).toBe(false)
  })

  it('no rompe con total vendido cero', () => {
    expect(construirRanking([], 0)).toEqual([])
  })
})

describe('calcularTotales', () => {
  it('deriva unidades, ticket promedio y margen porcentual', () => {
    const totales = calcularTotales({
      totalVentas: 1000,
      totalCosto: 400,
      resultado: 600,
      cantVentas: 4,
      ventasPorDia: [dia('2026-03-09', 600, 200, 3), dia('2026-03-10', 400, 200, 2)],
    })
    expect(totales.unidades).toBe(5)
    expect(totales.ticketPromedio).toBe(250)
    expect(totales.margenPorcentaje).toBe(60)
    expect(totales.margenNegativo).toBe(false)
  })

  it('no divide por cero sin ventas', () => {
    const totales = calcularTotales({
      totalVentas: 0,
      totalCosto: 0,
      resultado: 0,
      cantVentas: 0,
      ventasPorDia: [],
    })
    expect(totales.ticketPromedio).toBe(0)
    expect(Number.isNaN(totales.ticketPromedio)).toBe(false)
    expect(totales.margenPorcentaje).toBe(0)
  })

  it('detecta el período que se vendió por debajo del costo', () => {
    const totales = calcularTotales({
      totalVentas: 100,
      totalCosto: 150,
      resultado: -50,
      cantVentas: 1,
      ventasPorDia: [],
    })
    expect(totales.margenNegativo).toBe(true)
  })
})