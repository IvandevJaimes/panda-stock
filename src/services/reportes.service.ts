import type { ExportarExcelInput } from '../../electron/exportaciones.types'
import type { FiltrosReportes, ReportesSummary } from '../../electron/db/types'
import { desenvolverResultadoSeguro, normalizarError } from './errors'

export const reportesService = {
  async getSummary(filtros?: FiltrosReportes): Promise<ReportesSummary> {
    try {
      return desenvolverResultadoSeguro(await window.electronAPI.reportes.getSummary(filtros))
    } catch (error) {
      throw normalizarError(error)
    }
  },

  /** Guarda la pestaña activa como `.xlsx` y devuelve la ruta, o `null` si se canceló la elección de carpeta. */
  async exportarExcel(input: ExportarExcelInput): Promise<string | null> {
    try {
      return desenvolverResultadoSeguro(await window.electronAPI.reportes.exportarExcel(input))
    } catch (error) {
      throw normalizarError(error)
    }
  },
}
