import { desenvolverResultadoSeguro, normalizarError } from './errors'
import type { ClaveProteccion, ProteccionesSeguridad } from '../../electron/db/types'

export const seguridadService = {
  async verifyPin(pin: string, scope?: ClaveProteccion): Promise<boolean> {
    try {
      return desenvolverResultadoSeguro(await window.electronAPI.seguridad.verifyPin(pin.trim(), scope))
    } catch (error) {
      throw normalizarError(error)
    }
  },

  async changePin(pinActual: string, pinNuevo: string): Promise<boolean> {
    try {
      return desenvolverResultadoSeguro(await window.electronAPI.seguridad.changePin(pinActual.trim(), pinNuevo.trim()))
    } catch (error) {
      throw normalizarError(error)
    }
  },

  async tieneContrasena(): Promise<boolean> {
    try {
      return await window.electronAPI.seguridad.tieneContrasena()
    } catch (error) {
      throw normalizarError(error)
    }
  },

  async getRecoveryId(): Promise<string> {
    try {
      return await window.electronAPI.seguridad.getRecoveryId()
    } catch (error) {
      throw normalizarError(error)
    }
  },

  async resetearConClave(codigo: string, pinNuevo: string): Promise<boolean> {
    try {
      return desenvolverResultadoSeguro(await window.electronAPI.seguridad.resetearConClave(codigo.trim(), pinNuevo.trim()))
    } catch (error) {
      throw normalizarError(error)
    }
  },

  async crearContrasena(pinNuevo: string): Promise<boolean> {
    try {
      return desenvolverResultadoSeguro(await window.electronAPI.seguridad.crearContrasena(pinNuevo.trim()))
    } catch (error) {
      throw normalizarError(error)
    }
  },

  async quitarContrasena(pinActual: string): Promise<boolean> {
    try {
      return desenvolverResultadoSeguro(await window.electronAPI.seguridad.quitarContrasena(pinActual.trim()))
    } catch (error) {
      throw normalizarError(error)
    }
  },

  async getProtecciones(seed: ProteccionesSeguridad): Promise<ProteccionesSeguridad> {
    try {
      return desenvolverResultadoSeguro(await window.electronAPI.seguridad.getProtecciones(seed))
    } catch (error) {
      throw normalizarError(error)
    }
  },

  async setProtecciones(protecciones: ProteccionesSeguridad, pin?: string): Promise<ProteccionesSeguridad> {
    try {
      return desenvolverResultadoSeguro(await window.electronAPI.seguridad.setProtecciones(protecciones, pin?.trim()))
    } catch (error) {
      throw normalizarError(error)
    }
  },
}
