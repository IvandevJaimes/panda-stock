import type {
  AperturaCajaInput,
  Caja,
  CajaConResponsable,
  CajaSummary,
  CierreCajaInput,
} from '../../electron/db/types'
import { toErrorMessage } from './errors'

export const cajasService = {
  async getUltimosResponsables(): Promise<string[]> {
    try {
      return await window.electronAPI.cajas.getUltimosResponsables()
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async getUltima(): Promise<(import('../../electron/db/types').CajaConResponsable & { montoInicial: number }) | null> {
    try {
      return await window.electronAPI.cajas.getUltima()
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async getActive(): Promise<CajaConResponsable | null> {
    try {
      return await window.electronAPI.cajas.getActive()
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async open(data: AperturaCajaInput): Promise<CajaConResponsable> {
    const responsable = data.responsable.trim()
    if (!responsable) throw new Error('El nombre del responsable es obligatorio')
    if ((data.montoInicial ?? 0) < 0) throw new Error('El monto inicial no puede ser negativo')

    try {
      return await window.electronAPI.cajas.open({
        ...data,
        responsable,
        montoInicial: data.montoInicial ?? 0,
        observaciones: data.observaciones?.trim() || null,
      })
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async getSummary(cajaId: number): Promise<CajaSummary> {
    try {
      return await window.electronAPI.cajas.getSummary(cajaId)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async close(data: CierreCajaInput): Promise<Caja> {
    if (!data.cajaId) throw new Error('La caja es obligatoria')
    if (data.montoReal < 0) throw new Error('El monto real no puede ser negativo')

    try {
      return await window.electronAPI.cajas.close({
        ...data,
        observaciones: data.observaciones?.trim() || null,
      })
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },
}