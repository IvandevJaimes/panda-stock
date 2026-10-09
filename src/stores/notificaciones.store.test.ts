import { beforeEach, describe, expect, it } from 'vitest'
import { useNotificacionesStore } from './notificaciones.store'
import type { Notificacion } from '../features/notificaciones/notificacionesQuery'

function notif(overrides: Partial<Notificacion> = {}): Notificacion {
  return {
    id: 'stock_bajo:1',
    tipo: 'stock_bajo',
    severidad: 'advertencia',
    productoId: 1,
    producto: 'Gaseosa 500ml',
    imgPath: null,
    termino: '111',
    titulo: 'Stock bajo',
    detalle: '2 de mínimo 5',
    stockActual: 2,
    ...overrides,
  }
}

function estado() {
  return useNotificacionesStore.getState()
}

describe('store de notificaciones', () => {
  beforeEach(() => {
    useNotificacionesStore.setState({ visibles: [], descartes: {} })
  })

  it('sincronizar crea las visibles a partir de las condiciones actuales', () => {
    const a = notif()
    const b = notif({ id: 'vencido:2', tipo: 'vencido', severidad: 'critica' })

    estado().sincronizar([a, b])

    expect(estado().visibles).toEqual([a, b])
    expect(estado().descartes).toEqual({})
  })

  it('una condición que se resuelve sola retira su notificación', () => {
    estado().sincronizar([notif()])
    estado().sincronizar([])

    expect(estado().visibles).toEqual([])
  })

  it('eliminar retira la notificación y no vuelve mientras la condición siga', () => {
    estado().sincronizar([notif()])
    estado().eliminar('stock_bajo:1')
    estado().sincronizar([notif()])

    expect(estado().visibles).toEqual([])
    expect(estado().descartes['stock_bajo:1']).toBe(2)
  })

  it('si la condición se resuelve y vuelve a ocurrir, reactiva la eliminada', () => {
    estado().sincronizar([notif()])
    estado().eliminar('stock_bajo:1')
    estado().sincronizar([])
    estado().sincronizar([notif()])

    expect(estado().visibles).toEqual([notif()])
    expect(estado().descartes).toEqual({})
  })

  it('limpiar descarta todas las visibles', () => {
    const a = notif()
    const b = notif({ id: 'vencido:2', tipo: 'vencido', severidad: 'critica', stockActual: 0 })
    estado().sincronizar([a, b])

    estado().limpiar()

    expect(estado().visibles).toEqual([])
    expect(estado().descartes).toEqual({ 'stock_bajo:1': 2, 'vencido:2': -1 })
  })

  it('sincronizar refresca los datos de una notificación ya visible', () => {
    estado().sincronizar([notif({ stockActual: 2 })])
    estado().sincronizar([notif({ detalle: '1 de mínimo 5', stockActual: 1 })])

    expect(estado().visibles).toEqual([notif({ detalle: '1 de mínimo 5', stockActual: 1 })])
  })

  it('no reintenta ids duplicados en descartes', () => {
    estado().sincronizar([notif()])
    estado().eliminar('stock_bajo:1')
    estado().limpiar()

    expect(estado().descartes).toEqual({ 'stock_bajo:1': 2 })
  })

  it('registrarStockInicial silencia el stock cargado hasta que una venta lo reduce', () => {
    // Al cargar un producto en inventario con stock 2 (mínimo 5)
    estado().registrarStockInicial(1, 2)
    estado().sincronizar([notif({ stockActual: 2 })])

    // No debe aparecer como notificación
    expect(estado().visibles).toEqual([])
    expect(estado().descartes['stock_bajo:1']).toBe(2)

    // Cuando se realiza una venta y el stock baja a 1, la notificación se activa
    estado().sincronizar([notif({ stockActual: 1, detalle: '1 de mínimo 5' })])
    expect(estado().visibles).toEqual([notif({ stockActual: 1, detalle: '1 de mínimo 5' })])
  })

  it('registrarStockInicial también silencia productos con stock 0 al crearse', () => {
    estado().registrarStockInicial(2, 0)
    estado().sincronizar([
      notif({ id: 'stock_agotado:2', tipo: 'stock_agotado', severidad: 'critica', productoId: 2, stockActual: 0 }),
    ])

    expect(estado().visibles).toEqual([])
    expect(estado().descartes['stock_agotado:2']).toBe(-1)
  })
})
