import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { PROTECCIONES_INICIALES } from './types.ts'

const carpeta = mkdtempSync(path.join(tmpdir(), 'panda-anulacion-test-'))
process.env.PANDA_STOCK_DB = path.join(carpeta, 'test.db')

const { initDatabase } = await import('./index.ts')
const repo = await import('./repository.ts')

let cajaId = 0
let empleadoId = 0

beforeAll(() => {
  initDatabase()
  expect(repo.createContrasena('8877')).toBe(true)
  repo.setProtecciones({ protecciones: { ...PROTECCIONES_INICIALES, anularVentas: true }, pin: '8877' })
  empleadoId = repo.createEmpleado({ nombre: 'Caja Anulación' }).id
  cajaId = repo.openCaja({ responsable: 'Caja Anulación', montoInicial: 100 }).id
})

function crearProducto(nombre: string) {
  return repo.createProducto({
    nombre,
    precioVenta: 100,
    costo: 60,
    stockActual: 20,
    stockMinimo: 0,
  })
}

function vender(
  productoId: number,
  opciones: {
    cantidad: number
    precio: number
    metodo: 'efectivo' | 'cuenta_corriente'
    clienteId?: number
  },
) {
  const total = opciones.cantidad * opciones.precio
  return repo.processSale({
    cajaId,
    empleadoId,
    clienteId: opciones.clienteId,
    subtotal: total,
    descuento: 0,
    impuesto: 0,
    total,
    items: [
      {
        productoId,
        tipoTarifa: 'minorista',
        descripcionItem: 'Artículo de prueba',
        cantidad: opciones.cantidad,
        precioUnitario: opciones.precio,
        costoUnitario: 60,
      },
    ],
    pagos: [{ metodo: opciones.metodo, monto: total }],
  })
}

describe('anulación de ventas', () => {
  it('rechaza PIN vacío o inválido y repone todo el stock con PIN válido', () => {
    const producto = crearProducto('Artículo anulación en efectivo')
    const venta = vender(producto.id, { cantidad: 2, precio: 90, metodo: 'efectivo' })

    expect(() => repo.anularVenta({ ventaId: venta.ventaId, motivo: 'Error' })).toThrow(expect.objectContaining({ code: 'AUTHORIZATION_REQUIRED' }))
    expect(() => repo.anularVenta({ pin: 'incorrecta', ventaId: venta.ventaId, motivo: 'Error' })).toThrow(expect.objectContaining({ code: 'INVALID_PIN' }))
    expect(repo.getVentaDetalle(venta.ventaId)?.venta.estado).toBe('completada')

    const resultado = repo.anularVenta({
      pin: '8877',
      ventaId: venta.ventaId,
      motivo: 'Error de cobro',
    })!

    expect(resultado).toMatchObject({
      ventaId: venta.ventaId,
      total: 180,
      unidadesRestituidas: 2,
      motivo: 'Error de cobro',
    })
    expect(repo.getProductoById(producto.id)?.stockActual).toBe(20)
    expect(repo.getVentaDetalle(venta.ventaId)?.venta).toMatchObject({
      estado: 'anulada',
      motivoAnulacion: 'Error de cobro',
    })
    expect(repo.getVentaDetalle(venta.ventaId)?.venta.anuladoEn).not.toBeNull()

    const caja = repo.getCajaSummary(cajaId)
    expect(caja.totalVentas).toBe(0)
    expect(caja.cantidadVentas).toBe(0)
    expect(caja.totalEfectivo).toBe(0)
    expect(caja.montoEsperado).toBe(100)

    const reportes = repo.getReportesSummary()
    expect(reportes.totalVentas).toBe(0)
    expect(reportes.totalCosto).toBe(0)
    expect(reportes.resultado).toBe(0)
  })

  it('no permite anular dos veces ni un ticket inexistente', () => {
    const producto = crearProducto('Artículo doble anulación')
    const venta = vender(producto.id, { cantidad: 1, precio: 50, metodo: 'efectivo' })

    repo.anularVenta({ pin: '8877', ventaId: venta.ventaId, motivo: 'Cobro duplicado' })
    expect(repo.getProductoById(producto.id)?.stockActual).toBe(20)

    expect(() => repo.anularVenta({
      pin: '8877',
      ventaId: venta.ventaId,
      motivo: 'Otra vez',
    })).toThrow(/ya se encuentra anulada/i)
    expect(repo.getProductoById(producto.id)?.stockActual).toBe(20)

    expect(() => repo.anularVenta({
      pin: '8877',
      ventaId: 999999,
      motivo: 'Fantasma',
    })).toThrow(/no existe/i)
  })

  it('no anula un ticket que ya tiene una devolución completada', () => {
    const producto = crearProducto('Artículo con devolución previa')
    const venta = vender(producto.id, { cantidad: 1, precio: 70, metodo: 'efectivo' })

    repo.processDevolucion({ pin: '8877', ventaId: venta.ventaId })
    expect(repo.getProductoById(producto.id)?.stockActual).toBe(20)

    expect(() => repo.anularVenta({
      pin: '8877',
      ventaId: venta.ventaId,
      motivo: 'Error',
    })).toThrow(/devolución completada/i)
    expect(repo.getProductoById(producto.id)?.stockActual).toBe(20)
  })

  it('cancela la deuda de una venta en cuenta corriente al anularla', () => {
    const producto = crearProducto('Artículo anulación cuenta corriente')
    const clienteId = repo.createCliente({ nombre: 'Cliente Anulación CC' }).id
    const venta = vender(producto.id, {
      cantidad: 2,
      precio: 50,
      metodo: 'cuenta_corriente',
      clienteId,
    })

    expect(repo.getClientes({ incluirInactivos: true }).find((cliente) => cliente.id === clienteId)?.saldo).toBe(100)

    repo.anularVenta({ pin: '8877', ventaId: venta.ventaId, motivo: 'Cliente canceló' })

    expect(repo.getClientes({ incluirInactivos: true }).find((cliente) => cliente.id === clienteId)?.saldo).toBe(0)
    const movimientos = repo.getMovimientosCuentaCorriente({ clienteId, limit: 20 })
    expect(movimientos.some((movimiento) =>
      movimiento.tipo === 'devolucion' && movimiento.ventaId === venta.ventaId,
    )).toBe(true)
    expect(repo.getProductoById(producto.id)?.stockActual).toBe(20)
  })

  it('anula sin caja abierta y restituye todas las líneas del ticket', () => {
    const primero = crearProducto('Primer artículo anulado')
    const segundo = crearProducto('Segundo artículo anulado')
    const total = 100
    const venta = repo.processSale({
      cajaId,
      empleadoId,
      subtotal: total,
      descuento: 0,
      impuesto: 0,
      total,
      items: [
        { productoId: primero.id, tipoTarifa: 'minorista', descripcionItem: 'Primero', cantidad: 1, precioUnitario: 40, costoUnitario: 60 },
        { productoId: segundo.id, tipoTarifa: 'minorista', descripcionItem: 'Segundo', cantidad: 2, precioUnitario: 30, costoUnitario: 60 },
      ],
      pagos: [{ metodo: 'transferencia', monto: total }],
    })
    repo.closeCaja({ cajaId, montoReal: repo.getCajaSummary(cajaId).montoEsperado })

    const resultado = repo.anularVenta({ pin: '8877', ventaId: venta.ventaId, motivo: 'Producto rechazado' })
    expect(resultado?.unidadesRestituidas).toBe(3)
    expect(repo.getProductoById(primero.id)?.stockActual).toBe(20)
    expect(repo.getProductoById(segundo.id)?.stockActual).toBe(20)
  })
})
