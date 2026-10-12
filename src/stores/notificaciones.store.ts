import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ClienteConSaldo } from '../../electron/db/types'
import type { Notificacion } from '../features/notificaciones/notificacionesQuery'

/** El stock se alerta por eventos de venta; vencimientos y saldos se sincronizan. */
type NotificacionesState = {
  /** Último snapshot persistido: la campana se ve llena apenas abre la app. */
  visibles: Notificacion[]
  /** Mapa de id → stock al momento de descartarlo (-1 para sin condición). */
  descartes: Record<string, number>
  /** Último saldo observado por cliente, persistido para comparar entre sesiones. */
  saldosObservadosCuentas: Record<string, number>
  /** Revisión de deuda que identifica cada nuevo aumento notificado. */
  revisionesCuentas: Record<string, number>
  /** Última revisión anunciada con el alert al abrir la app. */
  revisionesAlertadasCuentas: Record<string, number>
  sincronizar: (
    actuales: Notificacion[],
    clientesCuentaCorriente?: ClienteConSaldo[],
  ) => Notificacion[]
  obtenerAlertasCuentaAlInicio: (actuales: Notificacion[]) => Notificacion[]
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
      saldosObservadosCuentas: {},
      revisionesCuentas: {},
      revisionesAlertadasCuentas: {},
      sincronizar: (actuales, clientesCuentaCorriente) => {
        let nuevas: Notificacion[] = []
        set((estado) => {
          const estadoActual = (estado ?? {}) as Partial<NotificacionesState>
          const saldosObservados = {
            ...(estadoActual.saldosObservadosCuentas ?? {}),
          }
          const revisiones = { ...(estadoActual.revisionesCuentas ?? {}) }
          const clientesConAumento = new Set<number>()
          const clientesConHistorial = new Set<number>()

          if (clientesCuentaCorriente) {
            for (const cliente of clientesCuentaCorriente) {
              const clave = String(cliente.id)
              const saldoAnterior = saldosObservados[clave]
              const saldoActual = Math.round(Math.max(0, cliente.saldo) * 100) / 100

              if (saldoAnterior !== undefined) {
                clientesConHistorial.add(cliente.id)
              }

              if (
                saldoActual > 0 &&
                (saldoAnterior === undefined || saldoActual > saldoAnterior)
              ) {
                revisiones[clave] = (revisiones[clave] ?? 0) + 1
                clientesConAumento.add(cliente.id)
              }

              saldosObservados[clave] = saldoActual
            }
          }

          const actualesConRevision = actuales.map((notificacion) => {
            if (
              notificacion.tipo !== 'cuenta_corriente' ||
              notificacion.clienteId === undefined ||
              !clientesCuentaCorriente
            ) {
              return notificacion
            }

            const clave = String(notificacion.clienteId)
            const revision = revisiones[clave] ?? 1
            const saldoActual = Math.round((notificacion.saldoActual ?? 0) * 100) / 100
            const anterior = (estadoActual.visibles ?? []).find(
              (visible) =>
                visible.tipo === 'cuenta_corriente' &&
                visible.clienteId === notificacion.clienteId,
            )

            return {
              ...notificacion,
              id: `cuenta_corriente:${clave}:${revision}`,
              titulo:
                clientesConAumento.has(notificacion.clienteId) &&
                clientesConHistorial.has(notificacion.clienteId)
                  ? 'Aumentó la deuda'
                  : anterior?.titulo ?? notificacion.titulo,
              detalle: `Saldo pendiente $${saldoActual.toFixed(2)}`,
              saldoActual,
            }
          })
          const alertasDeVenta = (estadoActual.visibles ?? []).filter(
            (notificacion) => notificacion.origen === 'venta',
          )
          const idsActuales = new Set(actualesConRevision.map((notificacion) => notificacion.id))
          const combinadas = [
            ...actualesConRevision,
            ...alertasDeVenta.filter((notificacion) => !idsActuales.has(notificacion.id)),
            ...(!clientesCuentaCorriente
              ? (estadoActual.visibles ?? []).filter(
                  (notificacion) =>
                    notificacion.tipo === 'cuenta_corriente' &&
                    !idsActuales.has(notificacion.id),
                )
              : []),
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

          const idsAnteriores = new Set(
            (estadoActual.visibles ?? []).map((notificacion) => notificacion.id),
          )
          nuevas = visibles.filter((notificacion) => !idsAnteriores.has(notificacion.id))

          return {
            visibles,
            descartes: descartados,
            saldosObservadosCuentas: saldosObservados,
            revisionesCuentas: revisiones,
          }
        })
        return nuevas
      },
      obtenerAlertasCuentaAlInicio: (actuales) => {
        let alertas: Notificacion[] = []
        set((estado) => {
          const revisiones = { ...(estado.revisionesCuentas ?? {}) }
          const revisionesAlertadas = { ...(estado.revisionesAlertadasCuentas ?? {}) }

          alertas = actuales.flatMap((notificacion) => {
            if (
              notificacion.tipo !== 'cuenta_corriente' ||
              notificacion.clienteId === undefined
            ) {
              return []
            }

            const clave = String(notificacion.clienteId)
            const revision = revisiones[clave] ?? 0
            if (revision <= (revisionesAlertadas[clave] ?? 0)) return []

            revisionesAlertadas[clave] = revision
            return [{
              ...notificacion,
              id: `cuenta_corriente:${clave}:${revision}`,
              detalle: `Saldo pendiente $${(notificacion.saldoActual ?? 0).toFixed(2)}`,
            }]
          })

          return { revisionesAlertadasCuentas: revisionesAlertadas }
        })
        return alertas
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
              descartes[id] = noti.stockActual ?? -1
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
              descartes[n.id] = n.stockActual ?? -1
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
      version: 4,
      storage: createJSONStorage(() => localStorage),
      migrate: (estadoPersistido) => {
        if (!estadoPersistido || typeof estadoPersistido !== 'object') {
          return {
            visibles: [],
            descartes: {},
            saldosObservadosCuentas: {},
            revisionesCuentas: {},
            revisionesAlertadasCuentas: {},
          }
        }

        const estado = estadoPersistido as Partial<NotificacionesState>
        const visibles = Array.isArray(estado.visibles) ? estado.visibles : []
        return {
          visibles: visibles.filter(
            (notificacion) =>
              notificacion.tipo !== 'stock_bajo' && notificacion.tipo !== 'stock_agotado',
          ),
          descartes: estado.descartes ?? {},
          saldosObservadosCuentas: estado.saldosObservadosCuentas ?? {},
          revisionesCuentas: estado.revisionesCuentas ?? {},
          revisionesAlertadasCuentas: estado.revisionesAlertadasCuentas ?? {},
        }
      },
      partialize: (estado) => ({
        visibles: estado.visibles,
        descartes: estado.descartes,
        saldosObservadosCuentas: estado.saldosObservadosCuentas,
        revisionesCuentas: estado.revisionesCuentas,
        revisionesAlertadasCuentas: estado.revisionesAlertadasCuentas,
      }),
    },
  ),
)
