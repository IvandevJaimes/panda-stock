import type { Empleado } from '../../electron/db/types'
import { toErrorMessage } from './errors'

export const empleadosService = {
  async getAll(): Promise<Empleado[]> {
    try {
      return await window.electronAPI.empleados.getAll()
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async create(nombre: string): Promise<Empleado> {
    const nombreLimpio = nombre.trim()
    if (!nombreLimpio) throw new Error('El nombre del empleado es obligatorio')

    try {
      return await window.electronAPI.empleados.create({ nombre: nombreLimpio })
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async toggle(id: number, activo: boolean): Promise<void> {
    try {
      await window.electronAPI.empleados.toggle(id, activo)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },
}