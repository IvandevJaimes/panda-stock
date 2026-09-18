import type { Marca } from '../../electron/db/types'
import { toErrorMessage } from './errors'

export const marcasService = {
  async getAll(): Promise<Marca[]> {
    try {
      return await window.electronAPI.marcas.getAll()
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async create(nombre: string): Promise<Marca> {
    const nombreLimpio = nombre.trim()
    if (!nombreLimpio) throw new Error('El nombre de la marca es obligatorio')

    try {
      return await window.electronAPI.marcas.create(nombreLimpio)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async update(id: number, nombre: string): Promise<void> {
    const nombreLimpio = nombre.trim()
    if (!nombreLimpio) throw new Error('El nombre de la marca es obligatorio')

    try {
      await window.electronAPI.marcas.update(id, nombreLimpio)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async delete(id: number): Promise<void> {
    try {
      await window.electronAPI.marcas.delete(id)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },
}