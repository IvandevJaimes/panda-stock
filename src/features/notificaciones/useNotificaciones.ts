import { useEffect } from 'react'
import { productosService } from '../../services/productos.service'
import { useNotificacionesStore } from '../../stores/notificaciones.store'
import { useSettingsStore } from '../../stores/settings.store'
import {
  deriveNotificaciones,
  notificacionesNuevas,
} from './notificacionesQuery'
import { reproducirSonidoNotificacion } from './sonidoNotificacion'

/** El stock cambia con cada venta: la campana no debe quedar con datos viejos. */
const INTERVALO_REVISION_MS = 5 * 60 * 1000

export function useNotificaciones() {
  const notificaciones = useNotificacionesStore((estado) => estado.visibles)
  const sincronizar = useNotificacionesStore((estado) => estado.sincronizar)
  const eliminar = useNotificacionesStore((estado) => estado.eliminar)
  const limpiar = useNotificacionesStore((estado) => estado.limpiar)

  useEffect(() => {
    const revisar = async () => {
      try {
        // La referencia es la lista actual (persistida entre sesiones): solo
        // suena por notificaciones que llegan ahora, no por las heredadas.
        const anteriores = useNotificacionesStore.getState().visibles
        const productos = await productosService.getAll()
        sincronizar(deriveNotificaciones(productos))
        const actuales = useNotificacionesStore.getState().visibles
        const hayNuevas = notificacionesNuevas(anteriores, actuales).length > 0
        if (hayNuevas && useSettingsStore.getState().sonidoAlertas) {
          reproducirSonidoNotificacion()
        }
      } catch {
        // Un fallo puntual de la consulta conserva el último listado:
        // vaciar la campana por un error sería peor que mostrar datos viejos.
      }
    }

    void revisar()
    const intervalo = window.setInterval(() => void revisar(), INTERVALO_REVISION_MS)
    const alVolver = () => {
      if (document.visibilityState === 'visible') void revisar()
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [sincronizar])

  return { notificaciones, eliminar, limpiar }
}
