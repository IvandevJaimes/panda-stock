import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

const carpeta = mkdtempSync(path.join(tmpdir(), 'panda-devoluciones-test-'))
process.env.PANDA_STOCK_DB = path.join(carpeta, 'test.db')

const { initDatabase } = await import('./index.ts')
const repo = await import('./repository.ts')

let cajaId = 0
let empleadoId = 0

beforeAll(() => {
  initDatabase()
  expect(repo.createContrasena('8877')).toBe(true)
  empleadoId = repo.createEmpleado({ nombre: 'Caja Devoluciones' }).id
  cajaId = repo.openCaja({ responsable: 'Caja Devoluciones', montoInicial: 100 }).id
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

describe('devoluciones de ticket completo', () => {
  it('usa el precio y costo del ticket, repone todo el stock y mantiene la venta original', () => {
    const producto = crearProducto('Artículo venta en efectivo')
    const venta = vender(producto.id, { cantidad: 2, precio: 90, metodo: 'efectivo' })

    expect(repo.getVentasDevolucion({ buscar: 'Artículo de prueba' }).items).toHaveLength(1)

    expect(repo.processDevolucion({
      pin: 'incorrecta',
      ventaId: venta.ventaId,
    })).toBeNull()
    expect(repo.processDevolucion({
      pin: '1234',
      ventaId: venta.ventaId,
    })).toBeNull()

    const resultado = repo.processDevolucion({
      pin: 'Panda2026',
      ventaId: venta.ventaId,
    })!

    expect(resultado.total).toBe(180)
    expect(resultado.gananciaRevertida).toBe(60)
    expect(repo.getVentaDetalle(venta.ventaId)?.venta).toMatchObject({
      id: venta.ventaId,
      total: 180,
      estado: 'completada',
    })
    expect(repo.getProductoById(producto.id)?.stockActual).toBe(20)
    expect(repo.getVentaDevolucionDetalle(venta.ventaId)).toBeNull()
    expect(repo.getHistorialDevoluciones({ buscar: 'Artículo de prueba' }).items[0]).toMatchObject({
      ventaId: venta.ventaId,
      total: 180,
      deudaReducida: 0,
    })

    expect(() => repo.processDevolucion({
      pin: '8877',
      ventaId: venta.ventaId,
    })).toThrow(/devolución completada/i)
    expect(repo.getProductoById(producto.id)?.stockActual).toBe(20)

    const resumenCaja = repo.getCajaSummary(cajaId)
    expect(resumenCaja.totalEgresosEfectivo).toBe(180)
    expect(resumenCaja.totalEfectivo).toBe(0)
    expect(resumenCaja.montoEsperado).toBe(100)

    const resumenReportes = repo.getReportesSummary()
    expect(resumenReportes.totalVentas).toBe(0)
    expect(resumenReportes.totalCosto).toBe(0)
    expect(resumenReportes.resultado).toBe(0)
    expect(resumenReportes.ventasPorMetodo).toEqual([])
    expect(resumenReportes.devoluciones).toMatchObject({
      cantidad: 1,
      unidades: 2,
      total: 180,
      costo: 120,
      gananciaRevertida: 60,
    })
    expect(repo.getVentasDevolucion({ buscar: 'Artículo de prueba' }).total).toBe(0)
  })

  it('usa FIFO: aplica el abono a los cargos antiguos y devuelve solo lo cobrado tras descontar deuda', () => {
    const producto = crearProducto('Artículo cuenta corriente')
    const clienteId = repo.createCliente({ nombre: 'Cliente FIFO' }).id
    const ventaAntigua = vender(producto.id, {
      cantidad: 2,
      precio: 50,
      metodo: 'cuenta_corriente',
      clienteId,
    })
    const ventaNueva = vender(producto.id, {
      cantidad: 2,
      precio: 50,
      metodo: 'cuenta_corriente',
      clienteId,
    })
    repo.registrarAbono({ clienteId, monto: 120, metodo: 'efectivo', cajaId })

    expect(repo.getVentasDevolucion({ buscar: 'cuenta corriente' }).total).toBe(2)
    expect(repo.getVentasDevolucion({ buscar: 'Cliente FIFO' }).total).toBe(2)

    repo.processDevolucion({
      pin: '8877',
      ventaId: ventaAntigua.ventaId,
    })

    repo.processDevolucion({
      pin: '8877',
      ventaId: ventaNueva.ventaId,
    })

    expect(repo.getHistorialDevoluciones({ buscar: String(ventaAntigua.ventaId) }).items[0]?.deudaReducida).toBe(0)
    expect(repo.getHistorialDevoluciones({ buscar: String(ventaNueva.ventaId) }).items[0]?.deudaReducida).toBe(80)

    expect(repo.getClientes({ incluirInactivos: true }).find((cliente) => cliente.id === clienteId)?.saldo).toBe(0)
    const movimientos = repo.getMovimientosCuentaCorriente({ clienteId, limit: 20 })
    expect(movimientos.some((movimiento) => movimiento.tipo === 'devolucion' && movimiento.ventaId === ventaNueva.ventaId)).toBe(true)
    expect(movimientos.some((movimiento) =>
      movimiento.tipo === 'reintegro' &&
      movimiento.ventaId === ventaAntigua.ventaId &&
      movimiento.metodo === 'efectivo',
    )).toBe(true)

    const caja = repo.getCajaSummary(cajaId)
    expect(caja.totalEgresosEfectivo).toBe(300)
    expect(caja.totalEfectivo).toBe(0)
    expect(caja.montoEsperado).toBe(100)

    const resumenCuentas = repo.getResumenCuentasCorrientes()
    expect(resumenCuentas.totalPorCobrar).toBe(0)
    expect(
      resumenCuentas.totalCargos - resumenCuentas.totalAbonos -
        resumenCuentas.totalDevoluciones + resumenCuentas.totalReintegros,
    ).toBe(0)
  })

  it('registra un reintegro en efectivo sin asociarlo cuando no hay caja abierta', () => {
    const producto = crearProducto('Artículo sin caja abierta')
    const venta = vender(producto.id, { cantidad: 1, precio: 40, metodo: 'efectivo' })
    repo.closeCaja({ cajaId, montoReal: repo.getCajaSummary(cajaId).montoEsperado })

    const resultado = repo.processDevolucion({
      pin: '8877',
      ventaId: venta.ventaId,
    })
    expect(resultado?.total).toBe(40)
    expect(repo.getHistorialDevoluciones({ buscar: String(venta.ventaId) }).items[0]?.cajaId).toBeNull()
    expect(repo.getProductoById(producto.id)?.stockActual).toBe(20)
  })

  it('reintegra todas las líneas originales del ticket en una sola operación', () => {
    const primero = crearProducto('Primer artículo del ticket')
    const segundo = crearProducto('Segundo artículo del ticket')
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
    const resultado = repo.processDevolucion({
      pin: '8877',
      ventaId: venta.ventaId,
    })

    expect(resultado?.total).toBe(100)
    expect(repo.getProductoById(primero.id)?.stockActual).toBe(20)
    expect(repo.getProductoById(segundo.id)?.stockActual).toBe(20)
    expect(repo.getHistorialDevoluciones({ buscar: String(venta.ventaId) }).items[0]?.items).toHaveLength(2)
  })
})
