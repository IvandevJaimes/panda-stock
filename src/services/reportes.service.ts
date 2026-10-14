import type { FiltrosReportes, ReportesSummary } from '../../electron/db/types'
import type { SolicitudExportacionReportes } from '../../electron/exportaciones.types'
import { desenvolverResultadoSeguro, normalizarError } from './errors'

export const reportesService = {
  async getSummary(filtros?: FiltrosReportes): Promise<ReportesSummary> {
    try {
      return desenvolverResultadoSeguro(await window.electronAPI.reportes.getSummary(filtros))
    } catch (error) {
      throw normalizarError(error)
    }
  },

  /** Exporta el rango seleccionado y devuelve la ruta, o `null` si se canceló. */
  async exportar(solicitud: SolicitudExportacionReportes): Promise<string | null> {
    try {
      return desenvolverResultadoSeguro(await window.electronAPI.reportes.exportar(solicitud))
    } catch (error) {
      throw normalizarError(error)
    }
  },
}
