import type { ResultadoDatosPrueba } from '../../electron/db/testdata.repository'
import type { ExportarExcelInput } from '../../electron/exportaciones.types'
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

  /** Guarda la pestaña activa como `.xlsx` y devuelve la ruta, o `null` si se canceló la elección de carpeta. */
  async exportarExcel(input: ExportarExcelInput): Promise<string | null> {
    try {
      return await window.electronAPI.reportes.exportarExcel(input)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },
}

/**
 * Siembra y borrado de datos de prueba.
 *
 * Va aparte de `reportesService` porque no es una consulta: escribe en la base y
 * el usuario tiene que confirmar antes de que corra.
 */
export const datosPruebaService = {
  async hay(): Promise<boolean> {
    try {
      return await window.electronAPI.datosPrueba.hay()
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async generar(): Promise<ResultadoDatosPrueba> {
    try {
      return await window.electronAPI.datosPrueba.generar()
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async borrar(): Promise<ResultadoDatosPrueba> {
    try {
      return await window.electronAPI.datosPrueba.borrar()
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },
}