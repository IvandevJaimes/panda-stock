import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export interface FuentesHuella {
  win32: () => string | null
  darwin: () => string | null
  linux: () => string | null
}

export interface DatosHuella {
  huella: string
  advertencia?: string
}

const ADVERTENCIA_INSTALACION = 'No se pudo leer el identificador de hardware. Esta licencia queda asociada a esta instalación; consultá con soporte antes de reinstalar o cambiar el equipo.'
const ID_INSTALACION_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizarIdentificador(valor: string | null | undefined): string | null {
  const identificador = valor?.trim()
  if (!identificador || identificador.length > 512) return null
  if (/^(0+|f{8}(-?f{4}){3}-f{12}|unknown|null|none|to be filled by o\.e\.m\.)$/i.test(identificador)) {
    return null
  }
  return identificador
}

function ejecutar(comando: string, argumentos: string[]): string | null {
  try {
    return execFileSync(comando, argumentos, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 4000,
      windowsHide: true,
    }).trim()
  } catch {
    return null
  }
}

function leerWindows(): string | null {
  const registro = ejecutar('reg.exe', [
    'query',
    'HKLM\\SOFTWARE\\Microsoft\\Cryptography',
    '/v',
    'MachineGuid',
  ])
  const machineGuid = registro?.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/i)?.[1]
  const normalizado = normalizarIdentificador(machineGuid)
  if (normalizado) return normalizado

  const uuidWmic = ejecutar('wmic.exe', ['csproduct', 'get', 'uuid'])
    ?.split(/\r?\n/)
    .map((linea) => linea.trim())
    .find((linea) => linea && !/^uuid$/i.test(linea))
  const wmicValido = normalizarIdentificador(uuidWmic)
  if (wmicValido) return wmicValido

  return normalizarIdentificador(ejecutar('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    '(Get-CimInstance -ClassName Win32_ComputerSystemProduct).UUID',
  ]))
}

function leerMac(): string | null {
  const salida = ejecutar('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'])
  return normalizarIdentificador(salida?.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/)?.[1])
}

function leerLinux(): string | null {
  for (const archivo of ['/etc/machine-id', '/var/lib/dbus/machine-id']) {
    try {
      const identificador = normalizarIdentificador(readFileSync(archivo, 'utf8'))
      if (identificador) return identificador
    } catch {
      continue
    }
  }
  return null
}

const FUENTES_SISTEMA: FuentesHuella = {
  win32: leerWindows,
  darwin: leerMac,
  linux: leerLinux,
}

export function obtenerHuellaCruda(
  fuentes: FuentesHuella = FUENTES_SISTEMA,
  plataforma: NodeJS.Platform = process.platform,
): string | null {
  if (plataforma !== 'win32' && plataforma !== 'darwin' && plataforma !== 'linux') return null
  return normalizarIdentificador(fuentes[plataforma]())
}

function obtenerIdInstalacion(directorioLicencia: string): string {
  mkdirSync(directorioLicencia, { recursive: true, mode: 0o700 })
  if (process.platform !== 'win32') chmodSync(directorioLicencia, 0o700)

  const archivo = path.join(directorioLicencia, 'instalacion-id')
  if (existsSync(archivo)) {
    try {
      const existente = readFileSync(archivo, 'utf8').trim()
      if (ID_INSTALACION_REGEX.test(existente)) return existente
    } catch {
      // Se reemplaza una identidad ilegible para mantener el fallback persistente.
    }
  }

  const id = randomUUID()
  const temporal = `${archivo}.${randomUUID()}.tmp`
  writeFileSync(temporal, `${id}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
  renameSync(temporal, archivo)
  if (process.platform !== 'win32') chmodSync(archivo, 0o600)
  return id
}

export function obtenerDatosHuella(
  directorioLicencia: string,
  fuentes: FuentesHuella = FUENTES_SISTEMA,
  plataforma: NodeJS.Platform = process.platform,
): DatosHuella {
  const cruda = obtenerHuellaCruda(fuentes, plataforma)
  const identidad = cruda ?? obtenerIdInstalacion(directorioLicencia)
  const huella = createHash('sha256')
    .update(`panda-stock-hw-v1:${identidad}`, 'utf8')
    .digest('base64url')
  return cruda
    ? { huella }
    : { huella, advertencia: ADVERTENCIA_INSTALACION }
}

export function obtenerHuella(
  directorioLicencia: string,
  fuentes: FuentesHuella = FUENTES_SISTEMA,
  plataforma: NodeJS.Platform = process.platform,
): string {
  return obtenerDatosHuella(directorioLicencia, fuentes, plataforma).huella
}
