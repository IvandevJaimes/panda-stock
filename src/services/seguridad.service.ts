import { toErrorMessage } from './errors'

export const seguridadService = {
  async verifyPin(pin: string): Promise<boolean> {
    try {
      return await window.electronAPI.seguridad.verifyPin(pin.trim())
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async changePin(pinActual: string, pinNuevo: string): Promise<boolean> {
    try {
      return await window.electronAPI.seguridad.changePin(pinActual.trim(), pinNuevo.trim())
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },
}