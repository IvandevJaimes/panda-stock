import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const directorio = mkdtempSync(path.join(tmpdir(), 'panda-movimientos-test-'))
process.env.PANDA_STOCK_DB = path.join(directorio, 'test.db')

const { cerrarDatabase, initDatabase } = await import('./index.ts')
const repo = await import('./repository.ts')

beforeAll(() => {
  initDatabase()
})

afterAll(() => {
  cerrarDatabase()
  rmSync(directorio, { recursive: true, force: true })
})

describe('filtros de movimientos de stock', () => {
  it('incluye los límites del período y conserva el filtro por producto', () => {
    const producto = repo.createProducto({
      nombre: 'Producto para filtrar movimientos',
      precioVenta: 100,
      costo: 60,
      stockActual: 0,
      stockMinimo: 0,
    })
    repo.crearMovimientoStock({ productoId: producto.id, tipo: 'entrada', cantidad: 2 })

    const [movimiento] = repo.getMovimientosStock({ productoId: producto.id })
    expect(movimiento).toBeDefined()
    if (!movimiento) return

    expect(repo.getMovimientosStock({
      productoId: producto.id,
      desde: movimiento.fechaHora,
      hasta: movimiento.fechaHora,
    })).toEqual([movimiento])
    expect(repo.getMovimientosStock({
      productoId: producto.id,
      desde: '2000-01-01T00:00:00.000Z',
      hasta: '2001-01-01T00:00:00.000Z',
    })).toEqual([])
  })

  it('conserva la valoración de una merma aunque cambie el costo actual del lote', () => {
    const producto = repo.createProducto({
      nombre: 'Producto para valorar merma',
      precioVenta: 100,
      costo: 60,
      stockActual: 0,
      stockMinimo: 0,
    })
    const lote = repo.createLote({
      productoId: producto.id,
      fechaIngreso: '2026-10-01T00:00:00.000Z',
      costoUnitario: 42,
      cantidadInicial: 3,
    })

    repo.crearMovimientoStock({
      productoId: producto.id,
      loteId: lote.id,
      tipo: 'merma',
      cantidad: 1,
      motivo: 'Prueba de costo histórico',
    })
    repo.updateLote(lote.id, { costoUnitario: 999 })

    const reporte = repo.getReportesSummary()
    const perdida = reporte.perdidas.mermas.find((merma) => merma.motivo === 'Prueba de costo histórico')

    expect(perdida).toMatchObject({
      loteId: lote.id,
      costoUnitarioReferencia: 42,
      fuenteCostoMerma: 'lote',
      costoUnitario: 42,
      fuenteCosto: 'lote',
      perdidaEstimada: 42,
    })
    expect(reporte.perdidas.plataPerdida).toBe(42)
  })

  it('guarda el costo de referencia de una merma sin lote al momento de registrarla', () => {
    const producto = repo.createProducto({
      nombre: 'Producto para merma sin lote',
      precioVenta: 100,
      costo: 31,
      stockActual: 5,
      stockMinimo: 0,
    })

    repo.createAjusteStock({ productoId: producto.id, tipo: 'merma', cantidad: 2, motivo: 'Rotura' })
    repo.updateProducto(producto.id, { costo: 250 })

    const reporte = repo.getReportesSummary()
    const perdida = reporte.perdidas.mermas.find((merma) => merma.motivo === 'Rotura')

    expect(perdida).toMatchObject({
      costoUnitarioReferencia: 31,
      fuenteCostoMerma: 'referencia',
      costoUnitario: 31,
      fuenteCosto: 'referencia',
      perdidaEstimada: 62,
    })
  })
})
