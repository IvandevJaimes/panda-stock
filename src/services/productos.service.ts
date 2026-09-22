import type {
  FiltrosProducto,
  Producto,
  ProductoConLoteActivo,
} from '../../electron/db/types'
import { toErrorMessage } from './errors'
import { bumpAssetVersion } from '../lib/assets'
import { MIME_A_EXTENSION, MAX_LOGO_SIZE } from '../features/onboarding/business.schema'

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

  async getAll(filtros?: FiltrosProducto): Promise<ProductoConLoteActivo[]> {
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

    try {
      return await window.electronAPI.productos.create({
        ...data,
        nombre,
        codigoInterno: codigoInterno || null,
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
      actualizado.codigoInterno =
        (actualizado.codigoInterno as string | null)?.trim() || null
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

  async setImage(productoId: number, imagen: File): Promise<Producto> {
    const extension = MIME_A_EXTENSION[imagen.type]
    if (!extension) {
      throw new Error('La imagen debe ser PNG, JPG o WebP')
    }
    if (imagen.size > MAX_LOGO_SIZE) {
      throw new Error('La imagen no puede superar los 5 MB')
    }

    try {
      const producto = await window.electronAPI.productos.setImage(
        productoId,
        await imagen.arrayBuffer(),
        extension,
      )
      if (producto.imgPath) bumpAssetVersion(producto.imgPath)
      return producto
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async removeImage(productoId: number): Promise<Producto> {
    try {
      return await window.electronAPI.productos.removeImage(productoId)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async updatePrecio(id: number, nuevoPrecio: number): Promise<Producto> {
    return this.update(id, { precioVenta: nuevoPrecio })
  },

  async updateCodigo(id: number, nuevoCodigo: string): Promise<Producto> {
    const esBarra = /^[0-9, ]+$/.test(nuevoCodigo) && nuevoCodigo.length >= 8
    if (esBarra) {
      return this.update(id, { codigosBarras: nuevoCodigo })
    } else {
      return this.update(id, { codigoInterno: nuevoCodigo })
    }
  },

  async updateVariante(id: number, nuevaVariante: string | null): Promise<Producto> {
    return this.update(id, { variante: nuevaVariante })
  },

  async updateStockMinimo(id: number, stockMinimo: number): Promise<Producto> {
    return this.update(id, { stockMinimo })
  },
}