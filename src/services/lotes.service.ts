import type { Lote, NuevoLote } from '../../electron/db/types'
import { toErrorMessage } from './errors'

export const lotesService = {
  async getByProducto(productoId: number): Promise<Lote[]> {
    try {
      return await window.electronAPI.lotes.getByProducto(productoId)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async create(data: NuevoLote): Promise<Lote> {
    if (!data.productoId) throw new Error('El producto es obligatorio')
    if (!(data.cantidadInicial > 0)) throw new Error('La cantidad debe ser mayor a cero')
    if (!data.fechaIngreso) throw new Error('La fecha de ingreso es obligatoria')

    try {
      return await window.electronAPI.lotes.create({
        ...data,
        numeroLote: data.numeroLote?.trim() || null,
      })
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async getExpiring(diasLimite: number): Promise<Lote[]> {
    try {
      return await window.electronAPI.lotes.getExpiring(diasLimite)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async update(id: number, data: { fechaVence?: string | null; costoUnitario?: number; cantidadActual?: number; motivo?: string }): Promise<Lote> {
    try {
      return await window.electronAPI.lotes.update(id, data)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async delete(id: number): Promise<void> {
    try {
      await window.electronAPI.lotes.delete(id)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },
}