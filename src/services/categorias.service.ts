import type { Categoria } from '../../electron/db/types'
import { toErrorMessage } from './errors'

export const categoriasService = {
  async getAll(): Promise<Categoria[]> {
    try {
      return await window.electronAPI.categorias.getAll()
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async create(nombre: string): Promise<Categoria> {
    const nombreLimpio = nombre.trim()
    if (!nombreLimpio) throw new Error('El nombre de la categoría es obligatorio')

    try {
      return await window.electronAPI.categorias.create(nombreLimpio)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async update(id: number, nombre: string): Promise<void> {
    const nombreLimpio = nombre.trim()
    if (!nombreLimpio) throw new Error('El nombre de la categoría es obligatorio')

    try {
      await window.electronAPI.categorias.update(id, nombreLimpio)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async delete(id: number): Promise<void> {
    try {
      await window.electronAPI.categorias.delete(id)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },
}