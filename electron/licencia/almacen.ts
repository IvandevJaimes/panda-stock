import { randomUUID } from 'node:crypto'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { esLicenciaFirmada, esRegistroDesconocido, type LicenciaFirmada } from './tipos.ts'

const ARCHIVO_LICENCIA = 'licencia.lic'

export function prepararDirectorioLicencia(directorioLicencia: string): void {
  mkdirSync(directorioLicencia, { recursive: true, mode: 0o700 })
  if (process.platform !== 'win32') chmodSync(directorioLicencia, 0o700)
}

function escribirAtomico(archivo: string, contenido: string): void {
  const temporal = `${archivo}.${randomUUID()}.tmp`
  try {
    writeFileSync(temporal, contenido, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
    renameSync(temporal, archivo)
    if (process.platform !== 'win32') chmodSync(archivo, 0o600)
  } catch (error) {
    try {
      if (existsSync(temporal)) unlinkSync(temporal)
    } catch {
      // Se preserva el error original si no se puede retirar el temporal.
    }
    throw error
  }
}

export function leerLicencia(directorioLicencia: string): LicenciaFirmada | null {
  try {
    const contenido: unknown = JSON.parse(readFileSync(path.join(directorioLicencia, ARCHIVO_LICENCIA), 'utf8'))
    return esLicenciaFirmada(contenido) ? contenido : null
  } catch {
    return null
  }
}

export function existeLicencia(directorioLicencia: string): boolean {
  return existsSync(path.join(directorioLicencia, ARCHIVO_LICENCIA))
}

export function leerVersionLicencia(directorioLicencia: string): number | null {
  try {
    const contenido: unknown = JSON.parse(readFileSync(path.join(directorioLicencia, ARCHIVO_LICENCIA), 'utf8'))
    if (!esRegistroDesconocido(contenido) || typeof contenido.v !== 'number') return null
    return contenido.v
  } catch {
    return null
  }
}

export function guardarLicencia(licencia: LicenciaFirmada, directorioLicencia: string): void {
  if (!esLicenciaFirmada(licencia)) throw new Error('La licencia tiene una estructura inválida.')
  prepararDirectorioLicencia(directorioLicencia)
  escribirAtomico(path.join(directorioLicencia, ARCHIVO_LICENCIA), `${JSON.stringify(licencia)}\n`)
}

export function borrarLicencia(directorioLicencia: string): void {
  const archivo = path.join(directorioLicencia, ARCHIVO_LICENCIA)
  if (existsSync(archivo)) unlinkSync(archivo)
}

