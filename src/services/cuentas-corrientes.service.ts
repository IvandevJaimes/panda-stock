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
import { desenvolverResultadoSeguro, normalizarError } from './errors'

export const cuentasCorrientesService = {
  async getClientes(opciones?: {
    incluirInactivos?: boolean
  }): Promise<ClienteConSaldo[]> {
    try {
      return desenvolverResultadoSeguro(await window.electronAPI.cuentasCorrientes.getClientes(opciones))
    } catch (error) {
      throw normalizarError(error)
    }
  },

  async crearCliente(data: ClienteInput): Promise<Cliente> {
    try {
      return desenvolverResultadoSeguro(await window.electronAPI.cuentasCorrientes.crearCliente(data))
    } catch (error) {
      throw normalizarError(error)
    }
  },

  async actualizarCliente(id: number, data: ClienteInput): Promise<void> {
    try {
      desenvolverResultadoSeguro(await window.electronAPI.cuentasCorrientes.actualizarCliente(id, data))
    } catch (error) {
      throw normalizarError(error)
    }
  },

  async archivarCliente(id: number): Promise<void> {
    try {
      desenvolverResultadoSeguro(await window.electronAPI.cuentasCorrientes.archivarCliente(id))
    } catch (error) {
      throw normalizarError(error)
    }
  },

  async getResumen(): Promise<ResumenCuentasCorrientes> {
    try {
      return desenvolverResultadoSeguro(await window.electronAPI.cuentasCorrientes.getResumen())
    } catch (error) {
      throw normalizarError(error)
    }
  },

  async getMovimientos(
    filtros?: FiltrosCuentaCorriente,
  ): Promise<MovimientoCuentaCorriente[]> {
    try {
      return desenvolverResultadoSeguro(await window.electronAPI.cuentasCorrientes.getMovimientos(filtros))
    } catch (error) {
      throw normalizarError(error)
    }
  },

  async registrarAbono(data: AbonoInput): Promise<void> {
    try {
      desenvolverResultadoSeguro(await window.electronAPI.cuentasCorrientes.registrarAbono(data))
    } catch (error) {
      throw normalizarError(error)
    }
  },

  async registrarCargo(data: CargoManualInput): Promise<void> {
    try {
      desenvolverResultadoSeguro(await window.electronAPI.cuentasCorrientes.registrarCargo(data))
    } catch (error) {
      throw normalizarError(error)
    }
  },
}
