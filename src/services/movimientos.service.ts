import type { AjusteStockInput, FiltrosMovimientos, MovimientoStock } from '../../electron/db/types'
import { toErrorMessage } from './errors'

export const movimientosService = {
  async getAll(filtros?: FiltrosMovimientos): Promise<MovimientoStock[]> {
    try {
      return await window.electronAPI.movimientos.getAll(filtros)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async ajuste(data: AjusteStockInput): Promise<void> {
    if (!data.productoId) throw new Error('El producto es obligatorio')
    if (!(data.cantidad > 0)) throw new Error('La cantidad debe ser mayor a cero')
    if (!data.motivo.trim()) throw new Error('El motivo es obligatorio')

    try {
      await window.electronAPI.movimientos.ajuste({
        ...data,
        motivo: data.motivo.trim(),
      })
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },
}