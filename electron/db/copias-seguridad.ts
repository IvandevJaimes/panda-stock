import { execFileSync } from 'node:child_process'
import {
  closeSync,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
} from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import Database from 'better-sqlite3'
import { cerrarDatabase, getDb, getDbPath, getSqlite, initDatabase } from './index.ts'
import { appSettings } from './schema.ts'
import type { ConfiguracionCopias, EstadoDestinoCopias, TipoDestinoCopias } from './types.ts'

function leerConfiguracion(): ConfiguracionCopias {
  const rows = getDb().select().from(appSettings).all()
  const valores = new Map(rows.map(({ key, value }) => [key, value]))
  const carpetaAnterior = valores.get('backup_folder') || null
  const destinoGuardado = valores.get('backup_destination')
  const tipoDestino: TipoDestinoCopias = destinoGuardado === 'pc' || destinoGuardado === 'extraible'
    ? destinoGuardado
    : carpetaAnterior ? 'extraible' : 'pc'
  const carpetas: ConfiguracionCopias['carpetas'] = {
    pc: valores.has('backup_folder_pc')
      ? valores.get('backup_folder_pc') || null
      : tipoDestino === 'pc' ? carpetaAnterior : null,
    extraible: valores.has('backup_folder_extraible')
      ? valores.get('backup_folder_extraible') || null
      : tipoDestino === 'extraible' ? carpetaAnterior : null,
  }
  return {
    carpeta: carpetas[tipoDestino],
    carpetas,
    automatica: valores.get('auto_backup_enabled') === 'true',
    tipoDestino,
  }
}

export function obtenerConfiguracionCopias(): ConfiguracionCopias {
  return leerConfiguracion()
}

export function verificarDestinoCopias(tipoDestino: TipoDestinoCopias): EstadoDestinoCopias {
  const configuracion = leerConfiguracion()
  const carpeta = configuracion.carpetas[tipoDestino]
  if (!carpeta) {
    return { disponible: false, mensaje: 'No hay una carpeta configurada para este destino.' }
  }
  try {
    validarCarpetaDestino(carpeta, tipoDestino, false)
    return { disponible: true, mensaje: null }
  } catch (error) {
    return {
      disponible: false,
      mensaje: error instanceof Error ? error.message : 'No se pudo verificar la carpeta de copias.',
    }
  }
}

export function guardarConfiguracionCopias(configuracion: ConfiguracionCopias): ConfiguracionCopias {
  const carpeta = configuracion.carpeta?.trim() || null
  const actual = leerConfiguracion()
  const carpetas = {
    pc: configuracion.carpetas.pc?.trim() || null,
    extraible: configuracion.carpetas.extraible?.trim() || null,
  }
  carpetas[configuracion.tipoDestino] = carpeta
  const activarAutomatica = configuracion.automatica && !actual.automatica
  if (activarAutomatica && !carpeta) {
    throw new Error('Elegí una carpeta para activar la copia automática.')
  }
  const carpetaDestinoAnterior = actual.carpetas[configuracion.tipoDestino]
  if (carpeta && (activarAutomatica || carpeta !== carpetaDestinoAnterior)) {
    validarCarpetaDestino(carpeta, configuracion.tipoDestino)
  }

  const ahora = new Date().toISOString()
  getSqlite().transaction(() => {
    for (const [key, value] of [
      ['backup_folder', carpeta ?? ''],
      ['backup_folder_pc', carpetas.pc ?? ''],
      ['backup_folder_extraible', carpetas.extraible ?? ''],
      ['auto_backup_enabled', String(configuracion.automatica)],
      ['backup_destination', configuracion.tipoDestino],
    ] as const) {
      getDb().insert(appSettings).values({ key, value, actualizadoEn: ahora })
        .onConflictDoUpdate({ target: appSettings.key, set: { value, actualizadoEn: ahora } })
        .run()
    }
  })()
  return leerConfiguracion()
}

export function validarCarpetaDestino(
  carpeta: string,
  tipoDestino: TipoDestinoCopias,
  comprobarEscritura = true,
): string {
  if (!carpeta.trim()) throw new Error('Elegí una carpeta para guardar las copias.')
  let ruta: string
  try {
    ruta = realpathSync(path.resolve(carpeta))
  } catch {
    throw new Error(tipoDestino === 'extraible'
      ? 'La unidad extraíble no está conectada. Conectala y volvé a intentar.'
      : 'La carpeta de copias no está disponible. Revisá la ubicación seleccionada.')
  }
  if (!statSync(ruta).isDirectory()) {
    throw new Error('La ubicación seleccionada no es una carpeta.')
  }
  const esExtraible = esVolumenExtraible(ruta)
  if (tipoDestino === 'extraible' && !esExtraible) {
    throw new Error('Conectá una unidad extraíble y elegí una carpeta dentro de ella.')
  }
  if (tipoDestino === 'pc' && esExtraible) {
    throw new Error('La carpeta seleccionada pertenece a una unidad extraíble. Elegí "Unidad extraíble" o seleccioná una carpeta de esta PC.')
  }
  if (!comprobarEscritura) return ruta

  const prueba = path.join(ruta, `.panda-stock-${randomUUID()}.tmp`)
  let descriptor: number | null = null
  try {
    descriptor = openSync(prueba, 'wx', 0o600)
    fsyncSync(descriptor)
  } catch {
    throw new Error(tipoDestino === 'extraible'
      ? 'No se puede escribir en la unidad extraíble. Revisá que esté conectada y tenga espacio.'
      : 'No se puede escribir en la carpeta seleccionada. Revisá los permisos y el espacio disponible.')
  } finally {
    if (descriptor !== null) closeSync(descriptor)
    try {
      unlinkSync(prueba)
    } catch {
      // Si no se llegó a crear el archivo de prueba, no queda nada que limpiar.
    }
  }
  return ruta
}

function esVolumenExtraible(ruta: string): boolean {
  if (process.platform === 'win32') {
    const rutaNormalizada = ruta.startsWith('\\\\?\\') ? ruta.slice(4) : ruta
    const unidad = path.parse(rutaNormalizada).root
    if (!/^[a-z]:\\$/i.test(unidad)) return false
    try {
      const tipo = execFileSync(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', `(Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='${unidad.slice(0, 2)}'").DriveType`],
        { encoding: 'utf8', timeout: 5000, windowsHide: true },
      ).trim()
      return tipo === '2'
    } catch {
      return false
    }
  }

  if (process.platform === 'darwin') {
    return ruta.startsWith('/Volumes/') && ruta.split(path.sep).filter(Boolean).length >= 2
  }

  if (process.platform !== 'linux') return false
  try {
    const montajes = readFileSync('/proc/self/mountinfo', 'utf8').split('\n')
    const montaje = montajes
      .map((linea) => {
        const [antes, despues] = linea.split(' - ')
        if (!antes || !despues) return null
        const campos = antes.split(' ')
        const punto = campos[4]?.replace(/\\040/g, ' ')
        if (!punto) return null
        return { punto, fuente: despues.split(' ')[1] ?? '' }
      })
      .filter((item): item is { punto: string; fuente: string } => item !== null)
      .filter((item) => ruta === item.punto || ruta.startsWith(`${item.punto}${path.sep}`))
      .sort((a, b) => b.punto.length - a.punto.length)[0]
    if (!montaje) return false
    if (montaje.punto.startsWith('/media/') || montaje.punto.startsWith('/run/media/')) return true
    const nombreDispositivo = montaje.fuente?.match(/^\/dev\/([^/]+)$/)?.[1]
    if (!nombreDispositivo) return false
    const dispositivoBase = nombreDispositivo.replace(/p?\d+$/, '')
    return readFileSync(`/sys/block/${dispositivoBase}/removable`, 'utf8').trim() === '1'
  } catch {
    return false
  }
}

function fechaArchivo(fecha = new Date()): string {
  const dos = (valor: number) => String(valor).padStart(2, '0')
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}_${dos(fecha.getHours())}-${dos(fecha.getMinutes())}-${dos(fecha.getSeconds())}`
}

export async function crearCopiaSeguridad(configuracion?: ConfiguracionCopias): Promise<string> {
  const actual = configuracion ?? leerConfiguracion()
  const carpeta = validarCarpetaDestino(actual.carpeta ?? '', actual.tipoDestino)
  const destino = path.join(carpeta, `panda-stock-${fechaArchivo()}.db`)
  if (existsSync(destino)) throw new Error('Ya existe una copia con este nombre. Esperá un segundo e intentá de nuevo.')
  try {
    await getSqlite().backup(destino)
    validarArchivoSQLite(destino)
    return destino
  } catch (error) {
    try {
      if (existsSync(destino)) unlinkSync(destino)
    } catch {
      // Se conserva el error original; el archivo incompleto se podrá reemplazar manualmente.
    }
    if (error instanceof Error && error.message.startsWith('La copia')) throw error
    throw new Error('No se pudo crear la copia de seguridad. Revisá el pendrive y el espacio disponible.', { cause: error })
  }
}

function validarArchivoSQLite(archivo: string): void {
  if (!existsSync(archivo)) {
    throw new Error('La copia seleccionada ya no está disponible. Verificá que la carpeta o unidad extraíble siga conectada.')
  }
  if (statSync(archivo).size < 100) {
    throw new Error('La copia seleccionada está vacía o incompleta.')
  }
  let conexion: Database.Database | null = null
  try {
    conexion = new Database(archivo, { readonly: true, fileMustExist: true })
    const resultado = conexion.pragma('quick_check') as Array<{ quick_check: string }>
    if (resultado.length !== 1 || resultado[0]?.quick_check !== 'ok') {
      throw new Error('La base SQLite está dañada.')
    }
    const tablas = conexion.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>
    const nombres = new Set(tablas.map(({ name }) => name))
    if (!nombres.has('productos') || !nombres.has('seguridad')) {
      throw new Error('El archivo no contiene una base de datos de Panda Stock válida.')
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Panda Stock')) throw error
    throw new Error('El archivo seleccionado no es una base SQLite válida o está dañado.', { cause: error })
  } finally {
    conexion?.close()
  }
}

export function validarCopiaParaRestaurar(archivo: string): void {
  validarArchivoSQLite(archivo)
}

export async function restaurarCopiaSeguridad(archivo: string): Promise<void> {
  if (!path.isAbsolute(archivo)) throw new Error('La ruta de la copia seleccionada no es válida.')
  validarArchivoSQLite(archivo)
  const destino = getDbPath()
  const temporal = `${destino}.restore-${randomUUID()}`
  const respaldoAnterior = `${destino}.previo-${fechaArchivo()}`
  let conexionOrigen: Database.Database | null = null
  let dbActualMovida = false
  let copiaInstalada = false

  try {
    conexionOrigen = new Database(archivo, { readonly: true, fileMustExist: true })
    await conexionOrigen.backup(temporal)
    validarArchivoSQLite(temporal)
    conexionOrigen.close()
    conexionOrigen = null

    getSqlite().pragma('wal_checkpoint(TRUNCATE)')
    cerrarDatabase()
    for (const sidecar of [`${destino}-wal`, `${destino}-shm`]) {
      if (existsSync(sidecar)) unlinkSync(sidecar)
    }
    renameSync(destino, respaldoAnterior)
    dbActualMovida = true
    renameSync(temporal, destino)
    copiaInstalada = true
    initDatabase()
    unlinkSync(respaldoAnterior)
  } catch (error) {
    conexionOrigen?.close()
    cerrarDatabase()
    if (copiaInstalada && existsSync(destino)) unlinkSync(destino)
    if (dbActualMovida && existsSync(respaldoAnterior)) renameSync(respaldoAnterior, destino)
    if (existsSync(temporal)) unlinkSync(temporal)
    try {
      initDatabase()
    } catch {
      // El error original indica por qué falló la restauración.
    }
    if (error instanceof Error && error.message.includes('Panda Stock')) throw error
    throw new Error('No se pudo restaurar la copia. La base de datos anterior fue conservada.', { cause: error })
  }
}
