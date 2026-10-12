import { describe, expect, it } from 'vitest'
import {
  construirResumenPerdidas,
  diferenciaArqueo,
  type FilaMermaConCosto,
} from './reportes-query.ts'

function merma(overrides: Partial<FilaMermaConCosto> = {}): FilaMermaConCosto {
  return {
    id: 1,
    productoId: 10,
    loteId: null,
    ventaId: null,
    tipo: 'merma',
    cantidad: 2,
    costoUnitarioReferencia: null,
    fuenteCostoMerma: null,
    stockAnterior: 10,
    stockPosterior: 8,
    motivo: 'Vencido',
    fechaHora: '2026-10-12T12:00:00.000Z',
    nombreProducto: 'Yogur',
    ...overrides,
  }
}

describe('construirResumenPerdidas', () => {
  it('usa el costo histórico del lote y no el costo de referencia', () => {
    const resumen = construirResumenPerdidas([
      merma({
        loteId: 42,
        costoUnitarioReferencia: 125.5,
        fuenteCostoMerma: 'lote',
      }),
    ])

    expect(resumen.plataPerdida).toBe(251)
    expect(resumen.plataPorCostoLote).toBe(251)
    expect(resumen.plataPorReferencia).toBe(0)
    expect(resumen.mermas[0]).toMatchObject({
      costoUnitario: 125.5,
      fuenteCosto: 'lote',
      perdidaEstimada: 251,
    })
  })

  it('conserva el costo de referencia registrado, aunque el producto cambie después', () => {
    const resumen = construirResumenPerdidas([
      merma({ costoUnitarioReferencia: 60, fuenteCostoMerma: 'referencia' }),
    ])

    expect(resumen.plataPerdida).toBe(120)
    expect(resumen.plataPorReferencia).toBe(120)
    expect(resumen.mermas[0]?.fuenteCosto).toBe('referencia')
  })

  it('no inventa importes para registros históricos sin costo guardado, aunque conserven el lote', () => {
    const resumen = construirResumenPerdidas([
      merma({ loteId: 42, costoUnitarioReferencia: null, fuenteCostoMerma: null }),
    ])

    expect(resumen.plataPerdida).toBe(0)
    expect(resumen.cantidadSinValuar).toBe(1)
    expect(resumen.unidadesSinValuar).toBe(2)
    expect(resumen.mermas[0]).toMatchObject({
      costoUnitario: null,
      fuenteCosto: 'sin_dato',
      perdidaEstimada: null,
    })
    expect(resumen.porProducto[0]).toMatchObject({
      unidadesSinValuar: 2,
      mermasSinValuar: 1,
      perdido: 0,
    })
  })

  it('no atribuye un costo si falta la fuente histórica que lo respalda', () => {
    const resumen = construirResumenPerdidas([
      merma({ costoUnitarioReferencia: 75, fuenteCostoMerma: null }),
    ])

    expect(resumen.plataPerdida).toBe(0)
    expect(resumen.cantidadSinValuar).toBe(1)
    expect(resumen.mermas[0]).toMatchObject({
      costoUnitario: null,
      fuenteCosto: 'sin_dato',
      perdidaEstimada: null,
    })
  })

  it('no cuenta registros sin producto vinculado como un producto identificado', () => {
    const resumen = construirResumenPerdidas([
      merma({ productoId: null, nombreProducto: 'Producto sin referencia' }),
      merma({ id: 2, productoId: null, nombreProducto: 'Producto sin referencia' }),
    ])

    expect(resumen.porProducto).toEqual([])
    expect(resumen.mermasSinProducto).toBe(2)
  })

  it('redondea cada movimiento y hace cuadrar los agregados', () => {
    const resumen = construirResumenPerdidas([
      merma({ cantidad: 1, costoUnitarioReferencia: 1.005, fuenteCostoMerma: 'referencia' }),
      merma({ id: 2, cantidad: 2, costoUnitarioReferencia: 1.005, fuenteCostoMerma: 'referencia' }),
    ])

    expect(resumen.mermas.map((fila) => fila.perdidaEstimada)).toEqual([1.01, 2.01])
    expect(resumen.plataPerdida).toBe(3.02)
    expect(resumen.porProducto[0]?.perdido).toBe(3.02)
  })
})

describe('diferenciaArqueo', () => {
  it('calcula real menos esperado a centavos y deja nulo si falta un dato', () => {
    expect(diferenciaArqueo(100.1, 100)).toBe(-0.1)
    expect(diferenciaArqueo(0.1, 0.3)).toBe(0.2)
    expect(diferenciaArqueo(null, 100)).toBeNull()
    expect(diferenciaArqueo(100, null)).toBeNull()
  })
})
