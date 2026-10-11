import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, expect, it } from 'vitest'

const directorioPrueba = mkdtempSync(path.join(tmpdir(), 'panda-copias-test-'))
const directorioCopias = mkdtempSync(path.join(tmpdir(), 'panda-copias-destino-'))
process.env.PANDA_STOCK_DB = path.join(directorioPrueba, 'origen.db')

const { cerrarDatabase, initDatabase } = await import('./index.ts')
const { crearCopiaSeguridad, guardarConfiguracionCopias, obtenerConfiguracionCopias } =
  await import('./copias-seguridad.ts')

initDatabase()

afterAll(() => {
  cerrarDatabase()
  rmSync(directorioPrueba, { recursive: true, force: true })
  rmSync(directorioCopias, { recursive: true, force: true })
})

it('guarda cada copia como un único archivo .db', async () => {
  const actual = obtenerConfiguracionCopias()
  const configuracion = guardarConfiguracionCopias({
    ...actual,
    carpeta: directorioCopias,
    carpetas: { ...actual.carpetas, pc: directorioCopias },
    tipoDestino: 'pc',
  })

  const copia = await crearCopiaSeguridad(configuracion)

  expect(path.extname(copia)).toBe('.db')
  expect(readdirSync(directorioCopias)).toEqual([path.basename(copia)])
})
