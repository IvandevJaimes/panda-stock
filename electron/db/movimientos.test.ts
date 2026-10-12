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
})
