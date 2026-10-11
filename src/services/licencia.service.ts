import { desenvolverResultadoSeguro, normalizarError } from './errors'
import type { EstadoLicencia } from '../../electron/licencia/tipos'

async function ejecutar<T>(accion: () => Promise<T>): Promise<T> {
  try {
    return await accion()
  } catch (error) {
    throw normalizarError(error)
  }
}

export const licenciaService = {
  obtenerHuella: () => ejecutar(() => window.electronAPI.licencia.huella()),
  obtenerEstado: () => ejecutar(async () =>
    desenvolverResultadoSeguro(await window.electronAPI.licencia.estado()),
  ),
  activar: (texto: string): Promise<EstadoLicencia> => ejecutar(async () =>
    desenvolverResultadoSeguro(await window.electronAPI.licencia.activar(texto)),
  ),
  completar: () => ejecutar(() => window.electronAPI.licencia.completada()),
}
