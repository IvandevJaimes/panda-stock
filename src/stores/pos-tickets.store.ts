import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  actualizarTicketActivo,
  agregarAlTicket,
  agregarTicket,
  cambiarCantidadTicket,
  cambiarMetodoPagoTicket,
  cerrarTicket,
  crearTicket,
  puedeAbrirTicket,
  quitarDelTicket,
  type ItemTicket,
  type MetodoPagoPOS,
  type ProductoPOS,
  type TicketSession,
} from '../features/pos/posQuery'
import type { ProductoConLoteActivo } from '../../electron/db/types'

/**
 * Los tickets son sesión de pantalla, no datos de la base. Por eso viven en
 * Zustand y no en SQLite: no se consultan, no se reportan y no se sincronizan
 * entre cajas. Persistirlos es para no perder una venta armada si el programa
 * se cierra a mitad de camino.
 */
export type EstadoTickets = {
  tickets: TicketSession[]
  activeTicketId: string
  agregar: (producto: ProductoPOS) => void
  cambiarCantidad: (productoId: number, cantidad: number) => void
  quitar: (productoId: number) => void
  vaciarActivo: () => void
  cambiarMetodoPago: (metodo: MetodoPagoPOS) => void
  nuevoTicket: (id: string) => void
  seleccionarTicket: (id: string) => void
  moverTicket: (delta: number) => void
  irAlTicket: (numero: number) => void
  cerrar: (id: string, idNuevo: string) => void
  /**
   * Reescribe nombre, precio, costo e imagen de cada línea con lo que dice el
   * catálogo recién cargado. Se llama una vez, después de cargar los productos:
   * lo que quedó en localStorage es una foto vieja y la base manda.
   */
  rehidratar: (productos: ProductoConLoteActivo[]) => void
  vaciarPersistencia: () => void
}

/**
 * Guarda solo lo que decidió el cajero. `nombre`, `precioVenta`, `costo` e
 * `imgPath` salen de la base y `rehidratar` los repone: persistirlos sería
 * duplicar datos de SQLite en el navegador y, peor, congelar el precio con el
 * que se armó el ticket aunque al día siguiente lo hayan cambiado.
 *
 * Es una proyección a un tipo más chico, así que necesita el `as` para poder
 * meterla en `partialize`, que exige devolver el mismo tipo del estado.
 */
type TicketPersistido = {
  id: string
  numero: number
  metodoPago: MetodoPagoPOS
  items: Pick<ItemTicket, 'productoId' | 'cantidad'>[]
}

const CLAVE = 'panda-pos-tickets'

/** Bump cuando cambie la forma de `TicketPersistido`: la versión vieja se ignora. */
const VERSION = 1

function primerTicket(): { tickets: TicketSession[]; activeTicketId: string } {
  const ticket = crearTicket('t1', 1)
  return { tickets: [ticket], activeTicketId: ticket.id }
}

function aPersistido(tickets: TicketSession[]): TicketPersistido[] {
  return tickets.map((ticket) => ({
    id: ticket.id,
    numero: ticket.numero,
    metodoPago: ticket.metodoPago,
    items: ticket.items.map((item) => ({
      productoId: item.productoId,
      cantidad: item.cantidad,
    })),
  }))
}

/**
 * LocalStorage puede traer basura: una versión vieja, un JSON a medio escribir o
 * un ticket sin items. Si algo de eso no pasa esta forma, se arranca de cero
 * en vez de dejar la pantalla de venta rota.
 */
function desdePersistido(
  crudo: unknown,
): { tickets: TicketSession[]; activeTicketId: string } {
  if (!crudo || typeof crudo !== 'object') return primerTicket()

  const { tickets, activeTicketId } = crudo as {
    tickets?: unknown
    activeTicketId?: unknown
  }
  if (!Array.isArray(tickets) || tickets.length === 0) return primerTicket()

  const validos: TicketSession[] = []
  for (const ticket of tickets as Partial<TicketPersistido>[]) {
    if (!ticket || typeof ticket.id !== 'string') continue

    const crudos = Array.isArray(ticket.items) ? ticket.items : []
    const items = crudos
      .filter(
        (item): item is Pick<ItemTicket, 'productoId' | 'cantidad'> =>
          !!item &&
          typeof item.productoId === 'number' &&
          typeof item.cantidad === 'number' &&
          item.cantidad > 0,
      )
      // La base todavía no cargó: solo hay ids y cantidades, que es todo lo que
      // `rehidratar` necesita para reconstruir la línea.
      .map((item) => ({ ...item }) as ItemTicket)

    validos.push({
      id: ticket.id,
      numero: typeof ticket.numero === 'number' ? ticket.numero : validos.length + 1,
      metodoPago: ticket.metodoPago ?? 'efectivo',
      items,
    })
  }

  if (validos.length === 0) return primerTicket()

  const activo = typeof activeTicketId === 'string' ? activeTicketId : ''
  return {
    tickets: validos,
    activeTicketId: validos.some((t) => t.id === activo) ? activo : validos[0].id,
  }
}

export const usePosTicketsStore = create<EstadoTickets>()(
  persist(
    (set) => ({
      ...primerTicket(),

      agregar: (producto) =>
        set((estado) => ({
          tickets: actualizarTicketActivo(
            estado.tickets,
            estado.activeTicketId,
            (items) => agregarAlTicket(items, producto),
          ),
        })),

      cambiarCantidad: (productoId, cantidad) =>
        set((estado) => ({
          tickets: actualizarTicketActivo(estado.tickets, estado.activeTicketId, (items) =>
            cambiarCantidadTicket(items, productoId, cantidad),
          ),
        })),

      quitar: (productoId) =>
        set((estado) => ({
          tickets: actualizarTicketActivo(estado.tickets, estado.activeTicketId, (items) =>
            quitarDelTicket(items, productoId),
          ),
        })),

      vaciarActivo: () =>
        set((estado) => ({
          tickets: actualizarTicketActivo(estado.tickets, estado.activeTicketId, () => []),
        })),

      cambiarMetodoPago: (metodoPago) =>
        set((estado) => ({
          tickets: cambiarMetodoPagoTicket(estado.tickets, estado.activeTicketId, metodoPago),
        })),

      nuevoTicket: (id) =>
        set((estado) =>
          puedeAbrirTicket(estado.tickets)
            ? { tickets: agregarTicket(estado.tickets, id), activeTicketId: id }
            : estado,
        ),

      seleccionarTicket: (id) => set({ activeTicketId: id }),

      moverTicket: (delta) =>
        set((estado) => {
          const indice = estado.tickets.findIndex((t) => t.id === estado.activeTicketId)
          const destino = estado.tickets[indice + delta]
          return destino ? { activeTicketId: destino.id } : {}
        }),

      irAlTicket: (numero) =>
        set((estado) => {
          const destino = estado.tickets.find((t) => t.numero === numero)
          return destino ? { activeTicketId: destino.id } : {}
        }),

      cerrar: (id, idNuevo) =>
        set((estado) => cerrarTicket(estado.tickets, id, estado.activeTicketId, idNuevo)),

      rehidratar: (productos) =>
        set((estado) => {
          const porId = new Map(productos.map((p) => [p.id, p]))
          let cambio = false

          const tickets = estado.tickets.map((ticket) => {
            const items = ticket.items.map((item) => {
              const producto = porId.get(item.productoId)
              // Sigue en la base: se adoptan sus datos actuales.
              if (!producto) {
                // No está. Borrar un producto que vive en un ticket abierto
                // está bloqueado, así que llegar acá significa que se
                // desactivó o que la base se reinició. Se deja la línea con lo
                // persistido en vez de borrarla sola: perder la venta en
                // silencio es peor que un precio viejo a la vista.
                return item
              }

              const nombre = producto.nombre
              const precioVenta = producto.precioVenta
              const costo = producto.costo ?? item.costo
              const imgPath = producto.imgPath ?? null

              if (
                nombre === item.nombre &&
                precioVenta === item.precioVenta &&
                costo === item.costo &&
                imgPath === item.imgPath
              ) {
                return item
              }

              cambio = true
              return { ...item, nombre, precioVenta, costo, imgPath }
            })

            return items.some((item, i) => item !== ticket.items[i])
              ? { ...ticket, items }
              : ticket
          })

          return cambio ? { tickets } : {}
        }),

      vaciarPersistencia: () => set(primerTicket()),
    }),
    {
      name: CLAVE,
      version: VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (estado) => ({
        tickets: aPersistido(estado.tickets) as unknown as TicketSession[],
        activeTicketId: estado.activeTicketId,
      }),
      // Se reemplaza todo el estado: las acciones se vuelven a crear y lo
      // rehidratado se aplica sobre ellas.
      merge: (persisted, actual) => ({ ...actual, ...desdePersistido(persisted) }),
    },
  ),
)

/**
 * Lee el store fuera de React. Lo necesita el guard de borrado de Inventario:
 * ese flujo no tiene nada que ver con el POS, así que no puede usar el hook
 * desde un componente del POS.
 */
export function productoEnTicketAbierto(productoId: number): boolean {
  return usePosTicketsStore
    .getState()
    .tickets.some((ticket) => ticket.items.some((item) => item.productoId === productoId))
}
