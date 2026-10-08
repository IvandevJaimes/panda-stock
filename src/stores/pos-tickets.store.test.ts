import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  productoEnTicketAbierto,
  usePosTicketsStore,
} from './pos-tickets.store'
import type { Categoria, ProductoConLoteActivo } from '../../electron/db/types'
import { mapearProductosPOS, type ProductoPOS } from '../features/pos/posQuery'

const CLAVE = 'panda-pos-tickets'

const categoriasPorId = new Map<number, Categoria>([
  [1, { id: 1, nombre: 'Bebidas', activo: true }],
])

function crud(o: Partial<ProductoConLoteActivo> = {}): ProductoConLoteActivo {
  return {
    id: 1,
    categoriaId: 1,
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
    ...o,
  }
}

function pos(o: Partial<ProductoConLoteActivo> = {}): ProductoPOS {
  return mapearProductosPOS([crud(o)], categoriasPorId)[0]
}

function estado() {
  return usePosTicketsStore.getState()
}

/** Escribe en localStorage lo mismo que dejaría una sesión anterior. */
function sembrar(payload: unknown) {
  localStorage.setItem(CLAVE, JSON.stringify({ state: payload, version: 1 }))
}

describe('store de tickets del POS', () => {
  beforeEach(() => {
    localStorage.clear()
    // Sin el `replace`: las acciones del store tienen que sobrevivir al reset.
    usePosTicketsStore.setState({ tickets: [crearTicketInicial()], activeTicketId: 't1' })
  })

  it('arranca con un único ticket vacío y activo', () => {
    expect(estado().tickets).toHaveLength(1)
    expect(estado().activeTicketId).toBe('t1')
    expect(estado().tickets[0].items).toEqual([])
  })

  it('agrega al ticket activo y no a los demás', () => {
    estado().agregar(pos())
    estado().nuevoTicket() // el nuevo queda activo
    const segundo = estado().activeTicketId
    estado().agregar(pos({ id: 2, nombre: 'Lorenz' }))
    estado().seleccionarTicket('t1')
    estado().agregar(pos({ id: 3, nombre: 'Agua' }))

    const porId = Object.fromEntries(estado().tickets.map((t) => [t.id, t.items.length]))
    expect(porId).toEqual({ t1: 2, [segundo]: 1 })
    expect(estado().tickets[1].items[0].nombre).toBe('Lorenz')
  })

  it('ignora el sexto ticket', () => {
    for (let i = 0; i < 5; i += 1) estado().nuevoTicket()

    expect(estado().tickets).toHaveLength(5)
  })

  // La identidad del ticket es su `id`: `PosTabs` marca activo por
  // `id === activeTicketId` y `cerrarTicket` borra la primera coincidencia. Un
  // id repetido rompe las dos cosas a la vez, así que la unicidad es invariante.
  it('mantiene los ids únicos al abrir y cerrar tickets', () => {
    for (let i = 0; i < 20; i += 1) {
      estado().nuevoTicket()
      estado().cerrar(estado().activeTicketId)
    }

    const ids = estado().tickets.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('cerrar un ticket que no es el activo renumera sin mover la vista', () => {
    estado().nuevoTicket()
    const segundo = estado().activeTicketId
    estado().nuevoTicket()
    const tercero = estado().activeTicketId
    estado().cerrar(segundo)

    expect(estado().tickets.map((t) => t.id)).toEqual(['t1', tercero])
    expect(estado().tickets.map((t) => t.numero)).toEqual([1, 2])
    expect(estado().activeTicketId).toBe(tercero)
  })

  it('cerrar el ticket activo deja en pantalla el contiguo anterior', () => {
    estado().nuevoTicket()
    const segundo = estado().activeTicketId
    estado().nuevoTicket()
    estado().cerrar(estado().activeTicketId)

    expect(estado().tickets.map((t) => t.id)).toEqual(['t1', segundo])
    expect(estado().tickets.map((t) => t.numero)).toEqual([1, 2])
    expect(estado().activeTicketId).toBe(segundo)
  })

  it('cerrar el último ticket abre uno nuevo en blanco', () => {
    estado().agregar(pos())
    estado().cerrar('t1')

    expect(estado().tickets).toHaveLength(1)
    const [reemplazo] = estado().tickets
    expect(estado().activeTicketId).toBe(reemplazo.id)
    expect(reemplazo.id).not.toBe('t1')
    expect(reemplazo.items).toEqual([])
  })

  it('persiste solo decisiones del cajero: nunca precio, nombre ni imagen', () => {
    estado().agregar(pos())

    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? '{}')
    const [ticket] = guardado.state.tickets

    expect(ticket.items).toEqual([{ productoId: 1, cantidad: 1 }])
    expect(JSON.stringify(guardado)).not.toContain('Gaseosa')
    expect(JSON.stringify(guardado)).not.toContain('precioVenta')
  })

  it('rehidrata cada línea con nombre y precio del catálogo actual', () => {
    estado().agregar(pos())
    estado().agregar(pos({ id: 2 }))

    estado().rehidratar([
      crud({ id: 1, nombre: 'Gaseosa RENOMBRADA', precioVenta: 350 }),
      crud({ id: 2, nombre: 'Lorenz nuevo', precioVenta: 180 }),
    ])

    // `agregarAlTicket` mete la línea nueva al frente, así que se busca por id
    // y no por posición.
    const porId = Object.fromEntries(
      estado().tickets[0].items.map((i) => [i.productoId, i]),
    )
    expect(porId[1]).toMatchObject({ nombre: 'Gaseosa RENOMBRADA', precioVenta: 350 })
    expect(porId[2]).toMatchObject({ nombre: 'Lorenz nuevo', precioVenta: 180 })
  })

  it('rehidrata igual un producto desactivado: la línea ya armada se cobra', () => {
    estado().agregar(pos())
    estado().agregar(pos())

    estado().rehidratar([crud({ activo: false, precioVenta: 500 })])

    expect(estado().tickets[0].items[0].precioVenta).toBe(500)
  })

  it('no tira el resto del estado cuando un producto ya no está en la base', () => {
    estado().agregar(pos())
    estado().agregar(pos({ id: 2 }))

    estado().rehidratar([crud({ id: 1, precioVenta: 350 })])

    expect(estado().tickets[0].items).toHaveLength(2)
  })

  it('rehidratar sin cambios no genera un estado nuevo', () => {
    estado().agregar(pos())
    estado().rehidratar([crud()])

    const antes = estado().tickets[0]
    estado().rehidratar([crud()])

    expect(estado().tickets[0]).toBe(antes)
  })
})

describe('guard de borrado de productos', () => {
  beforeEach(() => {
    localStorage.clear()
    // Sin el `replace`: las acciones del store tienen que sobrevivir al reset.
    usePosTicketsStore.setState({ tickets: [crearTicketInicial()], activeTicketId: 't1' })
  })

  it('detecta un producto en el ticket activo', () => {
    estado().agregar(pos())
    expect(productoEnTicketAbierto(1)).toBe(true)
  })

  it('detecta un producto en un ticket que NO es el activo', () => {
    estado().nuevoTicket()
    estado().agregar(pos())
    estado().seleccionarTicket('t1')

    expect(productoEnTicketAbierto(1)).toBe(true)
  })

  it('libera el producto cuando se cobra el ticket', () => {
    estado().agregar(pos())
    expect(productoEnTicketAbierto(1)).toBe(true)

    estado().cerrar('t1')
    expect(productoEnTicketAbierto(1)).toBe(false)
  })

  it('libera el producto cuando se quita la línea', () => {
    estado().agregar(pos())
    estado().quitar(1)

    expect(productoEnTicketAbierto(1)).toBe(false)
  })

  it('no bloquea un producto que nunca estuvo en un ticket', () => {
    expect(productoEnTicketAbierto(99)).toBe(false)
  })
})

describe('rehidratación desde localStorage', () => {
  it('recupera todos los tickets con sus cantidades y su método de pago', async () => {
    sembrar({
      activeTicketId: 't2',
      tickets: [
        { id: 't1', numero: 1, metodoPago: 'efectivo', items: [{ productoId: 7, cantidad: 3 }] },
        { id: 't2', numero: 2, metodoPago: 'tarjeta', items: [{ productoId: 9, cantidad: 1 }] },
      ],
    })

    const rehidratado = await recargarDesdeDisco()

    expect(rehidratado.tickets.map((t) => t.id)).toEqual(['t1', 't2'])
    expect(rehidratado.activeTicketId).toBe('t2')
    expect(rehidratado.tickets[1].metodoPago).toBe('tarjeta')
    expect(rehidratado.tickets[0].items[0]).toMatchObject({ productoId: 7, cantidad: 3 })
  })

  it('cae a un ticket válido si el payload está corrupto', async () => {
    sembrar({ tickets: 'no soy una lista', activeTicketId: 't1' })

    const rehidratado = await recargarDesdeDisco()

    expect(rehidratado.tickets).toHaveLength(1)
    expect(rehidratado.tickets[0].items).toEqual([])
  })

  // El contador de ids arranca en cero con cada arranque de la app, así que el
  // primero que genera puede ser un id que ya está rehidratado. Cuando eso
  // pasaba, las dos pestañas homónimas quedaban activas a la vez y cerrar una
  // cerraba la otra, porque `cerrarTicket` borra la primera coincidencia.
  it('no repite un id rehidratado al abrir un ticket nuevo', async () => {
    sembrar({
      activeTicketId: 't2',
      tickets: [
        { id: 't1', numero: 1, metodoPago: 'efectivo', items: [] },
        { id: 't2', numero: 2, metodoPago: 'efectivo', items: [] },
      ],
    })

    const store = await storeRecienCargado()
    store.getState().nuevoTicket()

    const ids = store.getState().tickets.map((t) => t.id)
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
  })

  it('descarta líneas sin cantidad positiva y tickets sin id', async () => {
    sembrar({
      activeTicketId: 't1',
      tickets: [
        {
          id: 't1',
          numero: 1,
          metodoPago: 'efectivo',
          items: [
            { productoId: 7, cantidad: 2 },
            { productoId: 8, cantidad: 0 },
            { productoId: 9 },
            null,
          ],
        },
        { numero: 2, items: [] },
      ],
    })

    const rehidratado = await recargarDesdeDisco()

    expect(rehidratado.tickets).toHaveLength(1)
    expect(rehidratado.tickets[0].items).toHaveLength(1)
    expect(rehidratado.tickets[0].items[0].cantidad).toBe(2)
  })

  it('cae al primer ticket si el activo guardado ya no existe', async () => {
    sembrar({
      activeTicketId: 't99',
      tickets: [{ id: 't1', numero: 1, metodoPago: 'efectivo', items: [] }],
    })

    expect((await recargarDesdeDisco()).activeTicketId).toBe('t1')
  })

  it('ignora un payload de una versión vieja', async () => {
    localStorage.setItem(
      CLAVE,
      JSON.stringify({
        state: {
          activeTicketId: 't1',
          tickets: [{ id: 't1', numero: 1, forma: 'desconocida', items: [] }],
        },
        version: 999,
      }),
    )

    expect((await recargarDesdeDisco()).tickets[0].items).toEqual([])
  })
})

/** Simula un reinicio de la app: lee el store de cero contra el disco. */
function recargarDesdeDisco() {
  return storeRecienCargado().then((store) => store.getState())
}

/** Igual que `recargarDesdeDisco`, pero devuelve el store para poder operar. */
function storeRecienCargado() {
  vi.resetModules()
  return import('./pos-tickets.store').then((mod) => mod.usePosTicketsStore)
}

function crearTicketInicial() {
  return {
    id: 't1',
    numero: 1,
    items: [],
    metodoPago: 'efectivo' as const,
    clienteId: null,
    clienteNombre: null,
  }
}
