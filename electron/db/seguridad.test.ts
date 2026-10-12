import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { seguridad } from './schema.ts'
import { PROTECCIONES_INICIALES } from './types.ts'
import { verificarClaveRecuperacion } from './security.ts'

const carpeta = mkdtempSync(path.join(tmpdir(), 'panda-seguridad-test-'))
process.env.PANDA_STOCK_DB = path.join(carpeta, 'test.db')

const { getDb, initDatabase } = await import('./index.ts')
const repo = await import('./repository.ts')

initDatabase()

describe('seguridad por contraseña', () => {
  it('permite acciones protegidas mientras no exista contraseña configurada', () => {
    expect(repo.tieneContrasena()).toBe(false)
    const protecciones = { ...PROTECCIONES_INICIALES, eliminarCategorias: true }
    expect(repo.getProtecciones(protecciones)).toEqual(protecciones)
    expect(repo.getProtecciones(PROTECCIONES_INICIALES)).toEqual(protecciones)
    const categoria = repo.createCategoria('Sin contraseña')

    expect(() => repo.deleteCategoria(categoria.id)).not.toThrow()
  })

  it('usa KDF con salt y admite una contraseña real igual a 1234', () => {
    expect(repo.createContrasena('1234')).toBe(true)
    expect(repo.tieneContrasena()).toBe(true)
    const hash = getDb().select({ pinHash: seguridad.pinHash }).from(seguridad).get()?.pinHash
    expect(hash).toMatch(/^scrypt\$32768\$8\$1\$/)
    expect(repo.verifyPin('1234')).toBe(true)
    expect(repo.verifyPin('5678')).toBe(false)
  })

  it('rechaza PIN vacío e incorrecto en una operación protegida', () => {
    const protecciones = { ...PROTECCIONES_INICIALES, eliminarCategorias: true }
    expect(repo.setProtecciones({ protecciones, pin: '1234' })).toEqual(protecciones)
    const categoriaVacia = repo.createCategoria('Pin vacío')
    const categoriaIncorrecta = repo.createCategoria('Pin incorrecto')

    expect(() => repo.deleteCategoria(categoriaVacia.id)).toThrow(expect.objectContaining({ code: 'AUTHORIZATION_REQUIRED' }))
    expect(() => repo.deleteCategoria(categoriaIncorrecta.id, 'incorrecto')).toThrow(expect.objectContaining({ code: 'INVALID_PIN' }))
    expect(repo.deleteCategoria(categoriaVacia.id, '1234')).toBeUndefined()
  })

  it('exige contraseña al eliminar clientes cuando la protección está activa', () => {
    const cliente = repo.createCliente({ nombre: 'Cliente protegido' })
    const protecciones = { ...PROTECCIONES_INICIALES, eliminarClientes: true }
    repo.setProtecciones({ protecciones, pin: '1234' })

    expect(() => repo.eliminarCliente(cliente.id)).toThrow(expect.objectContaining({ code: 'AUTHORIZATION_REQUIRED' }))
    expect(() => repo.eliminarCliente(cliente.id, 'incorrecto')).toThrow(expect.objectContaining({ code: 'INVALID_PIN' }))
    expect(() => repo.eliminarCliente(cliente.id, '1234')).not.toThrow()
  })

  it('migra un SHA-256 válido a scrypt al verificarlo', () => {
    const legacy = createHash('sha256').update('7788').digest('hex')
    getDb().update(seguridad).set({ pinHash: legacy, passwordConfigured: true }).where(eq(seguridad.id, 1)).run()

    expect(repo.verifyPin('7788')).toBe(true)
    const hashActualizado = getDb().select({ pinHash: seguridad.pinHash }).from(seguridad).get()?.pinHash
    expect(hashActualizado).toMatch(/^scrypt\$32768\$8\$1\$/)
  })

  it('persiste el lockout después de cinco intentos fallidos', () => {
    for (let intento = 0; intento < 5; intento += 1) {
      expect(repo.verifyPin('incorrecto')).toBe(false)
    }

    expect(() => repo.verifyPin('incorrecto')).toThrow(expect.objectContaining({ code: 'PIN_LOCKED' }))
    const bloqueo = getDb().select({ lockedUntil: seguridad.lockedUntil, lockoutLevel: seguridad.lockoutLevel }).from(seguridad).get()
    expect(bloqueo?.lockedUntil).toBeGreaterThan(Date.now())
    expect(bloqueo?.lockoutLevel).toBe(1)
  })

  it('vincula la clave de recuperación al código de instalación', () => {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519')
    const recoveryId = repo.getRecoveryId()
    const mensaje = Buffer.from(`panda-stock-recovery-v1:${recoveryId}`)
    const codigo = sign(null, mensaje, privateKey).toString('base64url')

    expect(verificarClaveRecuperacion(codigo, recoveryId, publicKey)).toBe(true)
    expect(verificarClaveRecuperacion(codigo, 'otra-instalacion', publicKey)).toBe(false)
  })

  it('no restablece la contraseña con una clave inválida', () => {
    const hashAnterior = getDb().select({ pinHash: seguridad.pinHash }).from(seguridad).get()?.pinHash
    expect(repo.resetearContrasenaConClave('clave-invalida', 'nueva-clave')).toBe(false)
    const hashActual = getDb().select({ pinHash: seguridad.pinHash }).from(seguridad).get()?.pinHash
    expect(hashActual).toBe(hashAnterior)
  })
})
