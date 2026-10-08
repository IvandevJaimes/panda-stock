import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Notificacion } from '../features/notificaciones/notificacionesQuery'

/**
 * Ciclo de vida de una notificación:
 *
 * - `sincronizar` calcula las notificaciones derivadas del estado actual.
 * - Al cerrar (descartar) una notificación de `stock_bajo`, se guarda el stock
 *   actual en `descartes`. Se oculta solo si el stock actual == ese stock
 *   descartado (al bajar -> reaparece; al subir por reposición -> vuelve; al
 *   llegar a 0 cambia a `stock_agotado` y usa -1).
 */
type NotificacionesState = {
  /** Último snapshot persistido: la campana se ve llena apenas abre la app. */
  visibles: Notificacion[]
  /** Mapa de id → stock al momento de descartarlo (-1 para sin condición). */
  descartes: Record<string, number>
  sincronizar: (actuales: Notificacion[]) => void
  eliminar: (id: string) => void
  limpiar: () => void
}

export const useNotificacionesStore = create<NotificacionesState>()(
  persist(
    (set) => ({
      visibles: [],
      descartes: {},
      sincronizar: (actuales) => {
        set((estado) => {
          const estadoActual = (estado ?? {}) as Partial<NotificacionesState>
          const mapaActuales = new Map(actuales.map((n) => [n.id, n]))
          const descartados: Record<string, number> = { ...(estadoActual.descartes ?? {}) }
          Object.keys(descartados).forEach((id) => {
            if (!mapaActuales.has(id)) delete descartados[id]
          })
          const visibles = actuales.filter((n) => {
            const d = descartados[n.id]
            if (n.tipo === 'stock_bajo') {
              if (d !== undefined && d === n.stockActual) {
                return false
              }
              return true
            }
            if (d !== undefined) return false
            return true
          })
          return { visibles, descartes: descartados }
        })
      },
      eliminar: (id) =>
        set((estado) => {
          const estadoActual = (estado ?? {}) as Partial<NotificacionesState>
          const visiblesActuales = estadoActual.visibles ?? []
          const idx = visiblesActuales.findIndex((n) => n.id === id)
          const siguienteVisibles = idx >= 0 ? visiblesActuales.filter((_, i) => i !== idx) : visiblesActuales
          const descartes: Record<string, number> = { ...(estadoActual.descartes ?? {}) }
          const noti = visiblesActuales.find((n) => n.id === id)
          if (noti) {
            if (noti.tipo === 'stock_bajo') {
              descartes[id] = noti.stockActual
            } else {
              descartes[id] = -1
            }
          } else {
            descartes[id] = descartes[id] ?? -1
          }
          return { visibles: siguienteVisibles, descartes }
        }),
      limpiar: () =>
        set((estado) => {
          const estadoActual = (estado ?? {}) as Partial<NotificacionesState>
          const visiblesActuales = estadoActual.visibles ?? []
          const descartes: Record<string, number> = { ...(estadoActual.descartes ?? {}) }
          visiblesActuales.forEach((n) => {
            if (n.tipo === 'stock_bajo') {
              descartes[n.id] = n.stockActual
            } else {
              descartes[n.id] = -1
            }
          })
          return { visibles: [], descartes }
        }),
    }),
    {
      name: 'panda-notificaciones-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (estado) => ({
        visibles: estado.visibles,
        descartes: estado.descartes,
      }),
    },
  ),
)