import type { FiltrosReportes, ReportesSummary } from '../../electron/db/types'
import { toErrorMessage } from './errors'

export const reportesService = {
  async getSummary(filtros?: FiltrosReportes): Promise<ReportesSummary> {
    try {
      return await window.electronAPI.reportes.getSummary(filtros)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },
}