import type {
  DevolucionCompleta,
  FiltrosDevoluciones,
  ProcesarDevolucionInput,
  ResultadoDevolucion,
  VentaDevolucionDetalle,
  VentaDevolucionResumen,
} from '../../electron/db/types'
import { desenvolverResultadoSeguro, normalizarError } from './errors'

export const devolucionesService = {
  async getVentas(
    filtros?: FiltrosDevoluciones,
  ): Promise<{ items: VentaDevolucionResumen[]; total: number }> {
    try {
      return desenvolverResultadoSeguro(await window.electronAPI.devoluciones.getVentas(filtros))
    } catch (error) {
      throw normalizarError(error)
    }
  },

  async getVentaDetalle(ventaId: number): Promise<VentaDevolucionDetalle | null> {
    try {
      return desenvolverResultadoSeguro(await window.electronAPI.devoluciones.getVentaDetail(ventaId))
    } catch (error) {
      throw normalizarError(error)
    }
  },

  async getHistorial(
    filtros?: FiltrosDevoluciones,
  ): Promise<{ items: DevolucionCompleta[]; total: number }> {
    try {
      return desenvolverResultadoSeguro(await window.electronAPI.devoluciones.getHistorial(filtros))
    } catch (error) {
      throw normalizarError(error)
    }
  },

  async process(input: ProcesarDevolucionInput): Promise<ResultadoDevolucion | null> {
    try {
      return desenvolverResultadoSeguro(await window.electronAPI.devoluciones.process(input))
    } catch (error) {
      throw normalizarError(error)
    }
  },
}
