import type { FiltrosVentas, Venta, VentaCompletaInput, VentaDetalle, VentaHistorial, VentaResult } from '../../electron/db/types'
import { toErrorMessage } from './errors'

/** Mínimo que siempre alcanza para una sesión de mostrador; el modal pagina más si hace falta. */
export const HISTORIAL_MINIMO = 20

export const ventasService = {
  async process(venta: VentaCompletaInput): Promise<VentaResult> {
    if (!venta.empleadoId) throw new Error('El empleado es obligatorio')
    if (!venta.items.length) throw new Error('La venta no tiene ítems')
    if (!venta.pagos.length) throw new Error('La venta no tiene pagos')

    try {
      return await window.electronAPI.ventas.process(venta)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async getAll(filtros?: FiltrosVentas): Promise<Venta[]> {
    try {
      return await window.electronAPI.ventas.getAll(filtros)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async getDetail(idVenta: number): Promise<VentaDetalle | null> {
    try {
      return await window.electronAPI.ventas.getDetail(idVenta)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async getRecientes(limite: number = HISTORIAL_MINIMO): Promise<VentaHistorial[]> {
    if (limite < 1) throw new Error('El límite de ventas debe ser al menos 1')

    try {
      return await window.electronAPI.ventas.getRecientes(limite)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },
}