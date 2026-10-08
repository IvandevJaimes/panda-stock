import { describe, expect, it } from 'vitest'
import type { ProductoConLoteActivo } from '../../../electron/db/types'
import { deriveNotificaciones, idsDe, notificacionesNuevas } from './notificacionesQuery'

function producto(overrides: Partial<ProductoConLoteActivo> = {}): ProductoConLoteActivo {
  return {
    id: 1,
    categoriaId: null,
    marcaId: null,
    nombre: 'Gaseosa 500ml',
    codigoInterno: '111',
    codigosBarras: '779001',
    variante: null,
    tipoVenta: 'unidad',
    unidadMedida: 'unidad',
    costo: 100,
    porcentajeGanancia: 100,
    precioVenta: 200,
    stockActual: 10,
    stockMinimo: 5,
    vencimiento: null,
    imgPath: null,
    activo: true,
    creadoEn: '01/01/2025',
    actualizadoEn: null,
    loteActivoVencimiento: null,
    ...overrides,
  }
}

/** `YYYY-MM-DD` local a N días de hoy (positivo = futuro). */
function fechaEn(dias: number): string {
  const fecha = new Date()
  fecha.setHours(0, 0, 0, 0)
  fecha.setDate(fecha.getDate() + dias)
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

describe('deriveNotificaciones', () => {
  it('marca como vencido al que ya pasó de fecha, con el relativo y la fecha', () => {
    const [notif] = deriveNotificaciones([
      producto({ loteActivoVencimiento: fechaEn(-3) }),
    ])

    expect(notif.tipo).toBe('vencido')
    expect(notif.severidad).toBe('critica')
    expect(notif.titulo).toBe('Vencido hace 3 días')
    expect(notif.detalle).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
  })

  it('cuenta "vence hoy" como vencido, no como por vencer', () => {
    const notifs = deriveNotificaciones([
      producto({ loteActivoVencimiento: fechaEn(0) }),
    ])

    expect(notifs.map((n) => n.tipo)).toEqual(['vencido'])
  })

  it('marca por vencer dentro de la ventana de 14 días', () => {
    const [notif] = deriveNotificaciones([
      producto({ loteActivoVencimiento: fechaEn(5) }),
    ])

    expect(notif.tipo).toBe('por_vencer')
    expect(notif.severidad).toBe('advertencia')
    expect(notif.titulo).toBe('Vence en 5 días')
  })

  it('ignora vencimientos fuera de la ventana', () => {
    const notifs = deriveNotificaciones([
      producto({ loteActivoVencimiento: fechaEn(30) }),
    ])

    expect(notifs).toEqual([])
  })

  it('un stock en cero es agotado, con o sin mínimo en cero', () => {
    const notifs = deriveNotificaciones([
      producto({ id: 1, stockActual: 0, stockMinimo: 3 }),
      producto({ id: 2, stockActual: 0, stockMinimo: 0 }),
    ])

    expect(notifs.map((n) => [n.tipo, n.productoId])).toEqual([
      ['stock_agotado', 1],
      ['stock_agotado', 2],
    ])
    expect(notifs[0].severidad).toBe('critica')
    expect(notifs[0].detalle).toBeNull()
  })

  it('marca stock bajo solo cuando hay al menos una unidad por debajo del mínimo', () => {
    const notifs = deriveNotificaciones([
      producto({ stockActual: 2, stockMinimo: 5 }),
    ])

    expect(notifs.map((n) => n.tipo)).toEqual(['stock_bajo'])
    expect(notifs[0].severidad).toBe('advertencia')
    expect(notifs[0].detalle).toBe('2 de mínimo 5')
  })

  it('un producto con vencimiento y stock bajo genera las dos notificaciones', () => {
    const notifs = deriveNotificaciones([
      producto({ loteActivoVencimiento: fechaEn(-1), stockActual: 1, stockMinimo: 4 }),
    ])

    expect(idsDe(notifs)).toEqual(['vencido:1', 'stock_bajo:1'])
  })

  it('ordena críticas primero y dentro de cada grupo por tipo', () => {
    const notifs = deriveNotificaciones([
      producto({ id: 1, stockActual: 9, stockMinimo: 10 }),
      producto({ id: 2, stockActual: 5, stockMinimo: 10 }),
      producto({ id: 3, loteActivoVencimiento: fechaEn(4) }),
      producto({ id: 4, stockActual: 0 }),
      producto({ id: 5, loteActivoVencimiento: fechaEn(-9) }),
    ])

    expect(idsDe(notifs)).toEqual([
      'vencido:5',
      'stock_agotado:4',
      'por_vencer:3',
      'stock_bajo:2',
      'stock_bajo:1',
    ])
  })

  it('ordena los vencidos más viejos primero y los bajos con mayor déficit primero', () => {
    const notifs = deriveNotificaciones([
      producto({ id: 1, loteActivoVencimiento: fechaEn(-2), stockActual: 9, stockMinimo: 10 }),
      producto({ id: 2, loteActivoVencimiento: fechaEn(-30) }),
      producto({ id: 3, stockActual: 8, stockMinimo: 10 }),
      producto({ id: 4, stockActual: 4, stockMinimo: 10 }),
    ])

    expect(idsDe(notifs)).toEqual([
      'vencido:2',
      'vencido:1',
      'stock_bajo:4',
      'stock_bajo:3',
      'stock_bajo:1',
    ])
  })

  it('descarta productos inactivos', () => {
    const notifs = deriveNotificaciones([
      producto({ activo: false, stockActual: 0 }),
    ])

    expect(notifs).toEqual([])
  })

  it('hereda la foto del producto para el thumbnail del desplegable', () => {
    const [notif] = deriveNotificaciones([
      producto({ imgPath: 'productos/gaseosa.png', stockActual: 0 }),
    ])

    expect(notif.imgPath).toBe('productos/gaseosa.png')
  })

  it('usa el código interno como término de búsqueda y el nombre si no tiene', () => {
    const notifs = deriveNotificaciones([
      producto({ id: 1, codigoInterno: '111', stockActual: 0 }),
      producto({ id: 2, codigoInterno: null, nombre: 'Yerba 1kg', stockActual: 0 }),
      producto({ id: 3, codigoInterno: '  ', nombre: 'Azúcar', stockActual: 0 }),
    ])

    // El desempate es alfabético por nombre de producto.
    expect(notifs.map((n) => n.termino)).toEqual(['Azúcar', '111', 'Yerba 1kg'])
  })
})

describe('notificacionesNuevas', () => {
  it('devuelve solo las que no estaban en el listado anterior', () => {
    const anteriores = deriveNotificaciones([producto({ id: 1, stockActual: 0 })])
    const actuales = deriveNotificaciones([
      producto({ id: 1, stockActual: 0 }),
      producto({ id: 2, stockActual: 0 }),
    ])

    expect(idsDe(notificacionesNuevas(anteriores, actuales))).toEqual([
      'stock_agotado:2',
    ])
  })

  it('no devuelve nada cuando el listado no cambió o perdió elementos', () => {
    const anteriores = deriveNotificaciones([
      producto({ id: 1, stockActual: 0 }),
      producto({ id: 2, stockActual: 0 }),
    ])
    const actuales = deriveNotificaciones([producto({ id: 1, stockActual: 0 })])

    expect(notificacionesNuevas(anteriores, actuales)).toEqual([])
    expect(notificacionesNuevas(anteriores, anteriores)).toEqual([])
  })
})
