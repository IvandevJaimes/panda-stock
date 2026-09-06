import type { FiltrosProducto, Producto } from '../../electron/db/types'
import { toErrorMessage } from './errors'

function limpiarBarras(codigosBarra: string | null | undefined): string | null {
  if (!codigosBarra?.trim()) return null
  return codigosBarra
    .split(',')
    .map((codigo) => codigo.trim())
    .filter(Boolean)
    .join(',')
}

export const productosService = {
  async scan(codigo: string): Promise<Producto | null> {
    const codigoLimpio = codigo.trim()
    if (!codigoLimpio) return null

    try {
      return await window.electronAPI.productos.scan(codigoLimpio)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async getAll(filtros?: FiltrosProducto): Promise<Producto[]> {
    try {
      return await window.electronAPI.productos.getAll(filtros)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async getById(id: number): Promise<Producto | null> {
    try {
      return await window.electronAPI.productos.getById(id)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async create(data: Record<string, unknown>): Promise<Producto> {
    const nombre = String(data.nombre ?? '').trim()
    const codigoInterno = String(data.codigoInterno ?? '').trim()

    if (!nombre) throw new Error('El nombre del producto es obligatorio')
    if (!codigoInterno) throw new Error('El código interno es obligatorio')

    try {
      return await window.electronAPI.productos.create({
        ...data,
        nombre,
        codigoInterno,
        codigosBarras: limpiarBarras(data.codigosBarras as string | null | undefined),
      })
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async update(id: number, data: Record<string, unknown>): Promise<Producto> {
    const actualizado: Record<string, unknown> = { ...data }

    if (actualizado.nombre !== undefined) {
      actualizado.nombre = String(actualizado.nombre).trim()
    }
    if (actualizado.codigoInterno !== undefined) {
      actualizado.codigoInterno = String(actualizado.codigoInterno).trim()
    }
    if (actualizado.codigosBarras !== undefined) {
      actualizado.codigosBarras = limpiarBarras(actualizado.codigosBarras as string | null)
    }

    try {
      return await window.electronAPI.productos.update(id, actualizado)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async delete(id: number): Promise<void> {
    try {
      await window.electronAPI.productos.delete(id)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async getAlerts(): Promise<Producto[]> {
    try {
      return await window.electronAPI.productos.getAlerts()
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },
}