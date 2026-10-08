import type {
  DevolucionCompleta,
  FiltrosDevoluciones,
  ProcesarDevolucionInput,
  ResultadoDevolucion,
  VentaDevolucionDetalle,
  VentaDevolucionResumen,
} from '../../electron/db/types'
import { toErrorMessage } from './errors'

export const devolucionesService = {
  async getVentas(
    filtros?: FiltrosDevoluciones,
  ): Promise<{ items: VentaDevolucionResumen[]; total: number }> {
    try {
      return await window.electronAPI.devoluciones.getVentas(filtros)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async getVentaDetalle(ventaId: number): Promise<VentaDevolucionDetalle | null> {
    try {
      return await window.electronAPI.devoluciones.getVentaDetail(ventaId)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async getHistorial(
    filtros?: FiltrosDevoluciones,
  ): Promise<{ items: DevolucionCompleta[]; total: number }> {
    try {
      return await window.electronAPI.devoluciones.getHistorial(filtros)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async process(input: ProcesarDevolucionInput): Promise<ResultadoDevolucion | null> {
    try {
      return await window.electronAPI.devoluciones.process(input)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },
}
