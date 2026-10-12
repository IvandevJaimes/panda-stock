import { useEffect } from 'react'
import { productosService } from '../../services/productos.service'
import { cuentasCorrientesService } from '../../services/cuentas-corrientes.service'
import { useNotificacionesStore } from '../../stores/notificaciones.store'
import { useSettingsStore } from '../../stores/settings.store'
import { onAlertCreated } from '../../stores/stockAlertHistoryStore'
import { hayAlertaStockActiva } from '../../lib/prioridadSonidos'
import { solicitarActualizacionNotificaciones } from '../../lib/notificacionesEvents'
import { showCuentaCorrienteAlert } from '../../components/ui/alerts/CuentaCorrienteAlert'
import {
  deriveNotificacionesDeAlertaVenta,
  deriveNotificacionesCuentaCorriente,
  deriveNotificacionesVencimiento,
  notificacionesNuevas,
} from './notificacionesQuery'
import {
  reproducirSonidoCuentaCorriente,
  reproducirSonidoNotificacion,
} from './sonidoNotificacion'

/** El stock cambia con cada venta: la campana no debe quedar con datos viejos. */
const INTERVALO_REVISION_MS = 5 * 60 * 1000

export { solicitarActualizacionNotificaciones }

export function useNotificaciones() {
  const notificaciones = useNotificacionesStore((estado) => estado.visibles)
  const sincronizar = useNotificacionesStore((estado) => estado.sincronizar)
  const obtenerAlertasCuentaAlInicio = useNotificacionesStore(
    (estado) => estado.obtenerAlertasCuentaAlInicio,
  )
  const eliminar = useNotificacionesStore((estado) => estado.eliminar)
  const limpiar = useNotificacionesStore((estado) => estado.limpiar)

  useEffect(() => {
    let revisando = false
    let pendiente = false
    let inicioPendiente = true

    const revisar = async () => {
      if (revisando) {
        pendiente = true
        return
      }
      revisando = true

      try {
        // La referencia es la lista actual (persistida entre sesiones): solo
        // suena por notificaciones que llegan ahora, no por las heredadas.
        const consultarCuentas = inicioPendiente
        const [productos, clientes] = await Promise.all([
          productosService.getAll(),
          consultarCuentas
            ? cuentasCorrientesService.getClientes({ incluirInactivos: true })
            : Promise.resolve(undefined),
        ])
        const notificacionesCuenta = clientes
          ? deriveNotificacionesCuentaCorriente(clientes)
          : []
        const nuevas = sincronizar(
          [...deriveNotificacionesVencimiento(productos), ...notificacionesCuenta],
          clientes,
        )

        const alertasCuentaInicio = clientes !== undefined
          ? obtenerAlertasCuentaAlInicio(notificacionesCuenta)
          : []
        if (clientes !== undefined) inicioPendiente = false

        if (alertasCuentaInicio.length > 0) {
          showCuentaCorrienteAlert(alertasCuentaInicio)
          if (useSettingsStore.getState().sonidoAlertas) {
            reproducirSonidoCuentaCorriente()
          }
        }

        if (nuevas.length > 0) {
          window.dispatchEvent(new Event('nuevas-notificaciones'))
          const nuevasDeInventario = nuevas.some(
            (notificacion) => notificacion.tipo !== 'cuenta_corriente',
          )
          if (
            nuevasDeInventario &&
            useSettingsStore.getState().sonidoAlertas &&
            !hayAlertaStockActiva()
          ) {
            reproducirSonidoNotificacion()
          }
        }
      } catch {
        // Un fallo puntual de la consulta conserva el último listado:
        // vaciar la campana por un error sería peor que mostrar datos viejos.
      } finally {
        revisando = false
        if (pendiente) {
          pendiente = false
          void revisar()
        }
      }
    }

    void revisar()
    const intervalo = window.setInterval(() => void revisar(), INTERVALO_REVISION_MS)
    const alVolver = () => {
      if (document.visibilityState === 'visible') void revisar()
    }
    const alActualizar = () => {
      void revisar()
    }

    const desuscribirAlertas = onAlertCreated((alerta) => {
      const alertasStock = deriveNotificacionesDeAlertaVenta(alerta)
      if (alertasStock.length > 0) {
        const anteriores = useNotificacionesStore.getState().visibles
        useNotificacionesStore.getState().agregarAlertasDeVenta(alertasStock)
        const actuales = useNotificacionesStore.getState().visibles
        if (notificacionesNuevas(anteriores, actuales).length > 0) {
          window.dispatchEvent(new Event('nuevas-notificaciones'))
          if (useSettingsStore.getState().sonidoAlertas && !hayAlertaStockActiva()) {
            reproducirSonidoNotificacion()
          }
        }
      }
      void revisar()
    })

    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('actualizar-notificaciones', alActualizar)

    return () => {
      desuscribirAlertas()
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('actualizar-notificaciones', alActualizar)
    }
  }, [obtenerAlertasCuentaAlInicio, sincronizar])

  return { notificaciones, eliminar, limpiar }
}
