import type { FiltrosVentas, Venta, VentaCompletaInput, VentaDetalle, VentaResult } from '../../electron/db/types'
import { toErrorMessage } from './errors'

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
}