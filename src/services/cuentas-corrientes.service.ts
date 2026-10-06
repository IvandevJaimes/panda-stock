import type {
  AbonoInput,
  CargoManualInput,
  Cliente,
  ClienteConSaldo,
  ClienteInput,
  FiltrosCuentaCorriente,
  MovimientoCuentaCorriente,
  ResumenCuentasCorrientes,
} from '../../electron/db/types'
import { toErrorMessage } from './errors'

export const cuentasCorrientesService = {
  async getClientes(opciones?: {
    incluirInactivos?: boolean
  }): Promise<ClienteConSaldo[]> {
    try {
      return await window.electronAPI.cuentasCorrientes.getClientes(opciones)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async crearCliente(data: ClienteInput): Promise<Cliente> {
    try {
      return await window.electronAPI.cuentasCorrientes.crearCliente(data)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async actualizarCliente(id: number, data: ClienteInput): Promise<void> {
    try {
      await window.electronAPI.cuentasCorrientes.actualizarCliente(id, data)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async archivarCliente(id: number): Promise<void> {
    try {
      await window.electronAPI.cuentasCorrientes.archivarCliente(id)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async getResumen(): Promise<ResumenCuentasCorrientes> {
    try {
      return await window.electronAPI.cuentasCorrientes.getResumen()
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async getMovimientos(
    filtros?: FiltrosCuentaCorriente,
  ): Promise<MovimientoCuentaCorriente[]> {
    try {
      return await window.electronAPI.cuentasCorrientes.getMovimientos(filtros)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async registrarAbono(data: AbonoInput): Promise<void> {
    try {
      await window.electronAPI.cuentasCorrientes.registrarAbono(data)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },

  async registrarCargo(data: CargoManualInput): Promise<void> {
    try {
      await window.electronAPI.cuentasCorrientes.registrarCargo(data)
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error })
    }
  },
}
