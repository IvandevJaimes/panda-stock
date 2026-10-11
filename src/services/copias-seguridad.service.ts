import { normalizarError } from './errors'
import type { ConfiguracionCopias } from '../../electron/db/types'

async function ejecutar<T>(accion: () => Promise<T>): Promise<T> {
  try {
    return await accion()
  } catch (error) {
    throw normalizarError(error)
  }
}

export const copiasSeguridadService = {
  obtenerConfiguracion: () => ejecutar(() => window.electronAPI.copias.obtenerConfiguracion()),
  seleccionarCarpeta: () => ejecutar(() => window.electronAPI.copias.seleccionarCarpeta()),
  guardarConfiguracion: (configuracion: ConfiguracionCopias) =>
    ejecutar(() => window.electronAPI.copias.guardarConfiguracion(configuracion)),
  crear: () => ejecutar(() => window.electronAPI.copias.crear()),
  seleccionarRestauracion: () => ejecutar(() => window.electronAPI.copias.seleccionarRestauracion()),
  restaurar: (archivo: string) => ejecutar(() => window.electronAPI.copias.restaurar(archivo)),
}
