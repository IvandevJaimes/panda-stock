import { readdir, readFile, writeFile } from 'node:fs/promises'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import JavaScriptObfuscator from 'javascript-obfuscator'

const directorioElectron = path.resolve(dirname(fileURLToPath(import.meta.url)), '../dist-electron')
const opcionesOfuscacion = {
  compact: true,
  target: 'node',
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  renameProperties: false,
  transformObjectKeys: false,
  stringArray: true,
  stringArrayThreshold: 0.5,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  selfDefending: false,
  sourceMap: false,
}

async function buscarBundlesElectron(directorio) {
  const entradas = await readdir(directorio, { withFileTypes: true })
  const rutas = await Promise.all(entradas.map(async (entrada) => {
    const ruta = path.join(directorio, entrada.name)

    if (entrada.isDirectory()) return buscarBundlesElectron(ruta)
    return /\.(?:c?js|mjs)$/.test(entrada.name) ? [ruta] : []
  }))

  return rutas.flat()
}

const bundlesElectron = await buscarBundlesElectron(directorioElectron)

if (bundlesElectron.length === 0) {
  throw new Error('No se encontraron bundles JavaScript dentro de dist-electron')
}

for (const rutaArchivo of bundlesElectron) {
  const codigoElectron = await readFile(rutaArchivo, 'utf8')
  const codigoOfuscado = JavaScriptObfuscator.obfuscate(codigoElectron, opcionesOfuscacion)

  await writeFile(rutaArchivo, codigoOfuscado.getObfuscatedCode(), 'utf8')
  console.info(`Ofuscado: ${path.relative(path.dirname(directorioElectron), rutaArchivo)}`)
}
