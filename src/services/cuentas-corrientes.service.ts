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
import { solicitarActualizacionNotificaciones } from '../lib/notificacionesEvents'
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

  async toggleCliente(id: number, activo: boolean): Promise<Cliente> {
    try {
      return desenvolverResultadoSeguro(await window.electronAPI.cuentasCorrientes.toggleCliente(id, activo))
    } catch (error) {
      throw normalizarError(error)
    }
  },

  async eliminarCliente(id: number, pin?: string): Promise<void> {
    try {
      desenvolverResultadoSeguro(await window.electronAPI.cuentasCorrientes.eliminarCliente(id, pin))
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
      solicitarActualizacionNotificaciones()
    } catch (error) {
      throw normalizarError(error)
    }
  },

  async registrarCargo(data: CargoManualInput): Promise<void> {
    try {
      desenvolverResultadoSeguro(await window.electronAPI.cuentasCorrientes.registrarCargo(data))
      solicitarActualizacionNotificaciones()
    } catch (error) {
      throw normalizarError(error)
    }
  },
}
