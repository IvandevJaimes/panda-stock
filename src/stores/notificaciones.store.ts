import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Notificacion } from '../features/notificaciones/notificacionesQuery'

/** Las alertas de stock nacen por eventos de venta; las de vencimiento se sincronizan. */
type NotificacionesState = {
  /** Último snapshot persistido: la campana se ve llena apenas abre la app. */
  visibles: Notificacion[]
  /** Mapa de id → stock al momento de descartarlo (-1 para sin condición). */
  descartes: Record<string, number>
  sincronizar: (actuales: Notificacion[]) => void
  agregarAlertasDeVenta: (alertas: Notificacion[]) => void
  eliminar: (id: string) => void
  limpiar: () => void
  /**
   * Silencia el stock cargado en inventario para que solo alerte si una
   * venta posterior reduce el stock por debajo de este valor.
   */
  registrarStockInicial: (productoId: number, stockActual: number) => void
}

export const useNotificacionesStore = create<NotificacionesState>()(
  persist(
    (set) => ({
      visibles: [],
      descartes: {},
      sincronizar: (actuales) => {
        set((estado) => {
          const estadoActual = (estado ?? {}) as Partial<NotificacionesState>
          const alertasDeVenta = (estadoActual.visibles ?? []).filter(
            (notificacion) => notificacion.origen === 'venta',
          )
          const idsActuales = new Set(actuales.map((notificacion) => notificacion.id))
          const combinadas = [
            ...actuales,
            ...alertasDeVenta.filter((notificacion) => !idsActuales.has(notificacion.id)),
          ]
          const mapaActuales = new Map(combinadas.map((n) => [n.id, n]))
          const descartados: Record<string, number> = { ...(estadoActual.descartes ?? {}) }
          Object.keys(descartados).forEach((id) => {
            if (!mapaActuales.has(id)) delete descartados[id]
          })
          const visibles = combinadas.filter((n) => {
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
      agregarAlertasDeVenta: (alertas) => {
        const nuevas = alertas.filter((alerta) => alerta.origen === 'venta')
        if (nuevas.length === 0) return

        set((estado) => {
          const idsProductos = new Set(nuevas.map((alerta) => alerta.productoId))
          const anteriores = estado.visibles.filter(
            (notificacion) =>
              notificacion.origen !== 'venta' || !idsProductos.has(notificacion.productoId),
          )
          const idsExistentes = new Set(anteriores.map((notificacion) => notificacion.id))
          return {
            visibles: [
              ...nuevas.filter((alerta) => !idsExistentes.has(alerta.id)),
              ...anteriores,
            ],
          }
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
      registrarStockInicial: (productoId, stockActual) =>
        set((estado) => {
          const estadoActual = (estado ?? {}) as Partial<NotificacionesState>
          const descartes: Record<string, number> = { ...(estadoActual.descartes ?? {}) }
          descartes[`stock_bajo:${productoId}`] = stockActual
          if (stockActual <= 0) {
            descartes[`stock_agotado:${productoId}`] = -1
          }
          const visiblesActuales = estadoActual.visibles ?? []
          const visibles = visiblesActuales.filter(
            (n) =>
              n.productoId !== productoId ||
              (n.tipo !== 'stock_bajo' && n.tipo !== 'stock_agotado'),
          )
          return { descartes, visibles }
        }),
    }),
    {
      name: 'panda-notificaciones-storage',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (estadoPersistido) => {
        if (!estadoPersistido || typeof estadoPersistido !== 'object') {
          return { visibles: [], descartes: {} }
        }

        const estado = estadoPersistido as Partial<NotificacionesState>
        const visibles = Array.isArray(estado.visibles) ? estado.visibles : []
        return {
          visibles: visibles.filter(
            (notificacion) =>
              notificacion.tipo !== 'stock_bajo' && notificacion.tipo !== 'stock_agotado',
          ),
          descartes: estado.descartes ?? {},
        }
      },
      partialize: (estado) => ({
        visibles: estado.visibles,
        descartes: estado.descartes,
      }),
    },
  ),
)
