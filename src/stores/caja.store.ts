import { create } from 'zustand'
import type { CajaConResponsable } from '../../electron/db/types'
import { cajasService } from '../services/cajas.service'

/**
 * `cargado` separa "todavía no sé si hay caja" de "no hay caja": sin esa
 * diferencia el botón Cobrar parpadea bloqueado en cada arranque aunque la caja
 * esté abierta.
 */
type EstadoCaja = {
  caja: CajaConResponsable | null
  cargado: boolean
  cargar: () => Promise<void>
  setCaja: (caja: CajaConResponsable) => void
  limpiar: () => void
}

export const useCajaStore = create<EstadoCaja>((set) => ({
  caja: null,
  cargado: false,

  cargar: async () => {
    try {
      set({ caja: await cajasService.getActive(), cargado: true })
    } catch (error) {
      // Ante una falla se asume que no hay caja: es el estado que obliga a
      // abrirla. El error se propaga para que el layout lo muestre.
      set({ caja: null, cargado: true })
      throw error
    }
  },

  setCaja: (caja) => set({ caja, cargado: true }),

  limpiar: () => set({ caja: null, cargado: true }),
}))
