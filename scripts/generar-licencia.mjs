import { sign, randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
import path from 'node:path'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const PREFIJO_FIRMA = 'panda-stock-licencia-v1:'
const VALORES_PERMITIDOS = new Set(['--huella', '--licenciado', '--key', '--out'])
const DIRECTORIO_REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function estaDentroDe(ruta, directorio) {
  const relativa = path.relative(directorio, ruta)
  return relativa === '' || (!relativa.startsWith(`..${path.sep}`) && relativa !== '..' && !path.isAbsolute(relativa))
}

function leerArgumentos(argumentos) {
  const valores = new Map()
  for (let indice = 0; indice < argumentos.length; indice += 1) {
    const clave = argumentos[indice]
    if (clave === '--help') {
      console.log('Uso: pnpm licencia:generar -- --huella <ID> --licenciado "<Nombre>" [--key <private.pem>] [--out <licencia.lic>]')
      process.exit(0)
    }
    if (!VALORES_PERMITIDOS.has(clave)) {
      throw new Error(`Opción no reconocida: ${clave}`)
    }
    const valor = argumentos[indice + 1]
    if (!valor || valor.startsWith('--')) throw new Error(`Falta el valor de ${clave}.`)
    valores.set(clave, valor)
    indice += 1
  }
  return valores
}

try {
  const argumentos = leerArgumentos(process.argv.slice(2))
  if (estaDentroDe(path.resolve(), DIRECTORIO_REPO)) {
    throw new Error('Por seguridad, ejecutá el emisor desde una carpeta privada fuera del repositorio.')
  }

  const huella = argumentos.get('--huella')
  const licenciado = argumentos.get('--licenciado')?.trim()
  const archivoClave = path.resolve(argumentos.get('--key') ?? path.join(homedir(), '.panda-stock-keys', 'private.pem'))

  if (!huella || !/^[A-Za-z0-9_-]{43}$/.test(huella)) {
    throw new Error('El ID de equipo debe ser el código Base64 URL de 43 caracteres que muestra Panda Stock.')
  }
  if (!licenciado || licenciado.length > 200) {
    throw new Error('El nombre del cliente debe tener entre 1 y 200 caracteres.')
  }
  if (estaDentroDe(archivoClave, DIRECTORIO_REPO)) {
    throw new Error('La clave privada debe estar fuera del repositorio.')
  }

  const payload = {
    v: 1,
    licenseId: randomUUID(),
    huella,
    licenciado,
    emitidaEn: Date.now(),
    venceEn: null,
    funciones: null,
  }
  const archivoSalida = path.resolve(argumentos.get('--out') ?? path.join(
    homedir(), '.panda-stock-keys', 'licencias', `${payload.licenseId}.lic`,
  ))
  if (estaDentroDe(archivoSalida, DIRECTORIO_REPO)) {
    throw new Error('El archivo de licencia debe guardarse fuera del repositorio.')
  }

  const contenidoCanonico = JSON.stringify({
    v: payload.v,
    licenseId: payload.licenseId,
    huella: payload.huella,
    licenciado: payload.licenciado,
    emitidaEn: payload.emitidaEn,
    venceEn: null,
    funciones: null,
  })
  const clavePrivada = readFileSync(archivoClave, 'utf8')
  const firma = sign(null, Buffer.from(`${PREFIJO_FIRMA}${contenidoCanonico}`, 'utf8'), clavePrivada)
    .toString('base64url')
  const licencia = { ...payload, firma }
  mkdirSync(path.dirname(archivoSalida), { recursive: true, mode: 0o700 })
  writeFileSync(archivoSalida, `${JSON.stringify(licencia, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
    flag: 'wx',
  })

  console.log(`Licencia perpetua creada: ${archivoSalida}`)
} catch (error) {
  console.error(error instanceof Error ? error.message : 'No se pudo generar la licencia.')
  process.exitCode = 1
}
