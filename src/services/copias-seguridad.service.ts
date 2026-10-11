import { normalizarError } from './errors'
import type { ConfiguracionCopias, TipoDestinoCopias } from '../../electron/db/types'

async function ejecutar<T>(accion: () => Promise<T>): Promise<T> {
  try {
    return await accion()
  } catch (error) {
    throw normalizarError(error)
  }
}

export const copiasSeguridadService = {
  obtenerConfiguracion: () => ejecutar(() => window.electronAPI.copias.obtenerConfiguracion()),
  verificarDestino: (tipoDestino: TipoDestinoCopias) =>
    ejecutar(() => window.electronAPI.copias.verificarDestino(tipoDestino)),
  seleccionarCarpeta: (tipoDestino: TipoDestinoCopias) =>
    ejecutar(() => window.electronAPI.copias.seleccionarCarpeta(tipoDestino)),
  guardarConfiguracion: (configuracion: ConfiguracionCopias) =>
    ejecutar(() => window.electronAPI.copias.guardarConfiguracion(configuracion)),
  crear: () => ejecutar(() => window.electronAPI.copias.crear()),
  seleccionarRestauracion: (tipoDestino: TipoDestinoCopias) =>
    ejecutar(() => window.electronAPI.copias.seleccionarRestauracion(tipoDestino)),
  restaurar: (archivo: string, tipoDestino: TipoDestinoCopias) =>
    ejecutar(() => window.electronAPI.copias.restaurar(archivo, tipoDestino)),
}
