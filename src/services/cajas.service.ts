import type { AperturaCajaInput, Caja, CajaSummary, CierreCajaInput } from '../../electron/db/types'
import { toErrorMessage } from './errors'

export const cajasService = {
  async getActive(): Promise<Caja | null> {
    try {
      return await window.electronAPI.cajas.getActive()
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async open(data: AperturaCajaInput): Promise<Caja> {
    if (!data.empleadoId) throw new Error('El empleado es obligatorio')

    try {
      return await window.electronAPI.cajas.open({
        ...data,
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