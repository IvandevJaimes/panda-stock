import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/*
  Reportes, cuentas corrientes y anulaciones comparten UNA sola contraseña
  (`seguridad_reportes`). La maestra "Panda2026" funciona siempre como respaldo,
  pero nunca se muestra en la interfaz. La contraseña con la que arranca la base
  ("1234") es solo el centinela de "no se creó ninguna".
*/
const carpeta = mkdtempSync(path.join(tmpdir(), 'panda-seguridad-test-'))
process.env.PANDA_STOCK_DB = path.join(carpeta, 'test.db')

const { initDatabase } = await import('./index.ts')
const repo = await import('./repository.ts')

initDatabase()

describe('contraseña compartida', () => {
  it('arranca sin contraseña creada (solo el centinela sembrado)', () => {
    expect(repo.tieneContrasena()).toBe(false)
  })

  it('crear contraseña la activa y la valida', () => {
    expect(repo.createContrasena('7788')).toBe(true)
    expect(repo.tieneContrasena()).toBe(true)
    expect(repo.verifyPin('7788')).toBe(true)
    expect(repo.verifyPin('1234')).toBe(false)
  })

  it('no permite crear dos veces: existe una contraseña vigente', () => {
    expect(repo.createContrasena('9999')).toBe(false)
    expect(repo.verifyPin('7788')).toBe(true)
    expect(repo.verifyPin('9999')).toBe(false)
  })

  it('acepta la maestra como respaldo permanente', () => {
    expect(repo.verifyPin('Panda2026')).toBe(true)
  })

  it('rechaza una contraseña incorrecta', () => {
    expect(repo.verifyPin('incorrecta')).toBe(false)
  })

  it('permite cambiar la contraseña con la maestra como actual', () => {
    expect(repo.changePin('Panda2026', '3344')).toBe(true)
    expect(repo.verifyPin('3344')).toBe(true)
    expect(repo.verifyPin('7788')).toBe(false)
  })

  it('rechaza el cambio si la contraseña actual no coincide', () => {
    expect(repo.changePin('9999', '1111')).toBe(false)
    expect(repo.verifyPin('1111')).toBe(false)
  })
})