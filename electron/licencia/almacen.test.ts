import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { borrarLicencia, existeLicencia, guardarLicencia, leerLicencia } from './almacen.ts'
import type { LicenciaFirmada } from './tipos.ts'

const carpetasTemporales: string[] = []

function crearCarpeta(): string {
  const carpeta = mkdtempSync(path.join(tmpdir(), 'panda-licencia-almacen-'))
  carpetasTemporales.push(carpeta)
  return carpeta
}

function crearLicencia(): LicenciaFirmada {
  return {
    v: 1,
    licenseId: 'e1b2e35d-378f-48d1-8f87-97484e850f5d',
    huella: Buffer.alloc(32, 7).toString('base64url'),
    licenciado: 'Comercio de prueba',
    emitidaEn: 1_800_000_000_000,
    venceEn: null,
    funciones: null,
    firma: 'A'.repeat(86),
  }
}

afterEach(() => {
  for (const carpeta of carpetasTemporales.splice(0)) {
    rmSync(carpeta, { recursive: true, force: true })
  }
})

describe('almacenamiento local de licencias', () => {
  it('escribe de forma atómica, aplica permisos restrictivos y permite leer', () => {
    const carpeta = crearCarpeta()
    const licencia = crearLicencia()

    guardarLicencia(licencia, carpeta)

    expect(leerLicencia(carpeta)).toEqual(licencia)
    expect(existeLicencia(carpeta)).toBe(true)
    expect(readdirSync(carpeta)).toEqual(['licencia.lic'])
    if (process.platform !== 'win32') {
      expect(statSync(carpeta).mode & 0o777).toBe(0o700)
      expect(statSync(path.join(carpeta, 'licencia.lic')).mode & 0o777).toBe(0o600)
    }
  })

  it('devuelve null ante archivos corruptos o estructura inválida', () => {
    const carpeta = crearCarpeta()
    const archivo = path.join(carpeta, 'licencia.lic')
    writeFileSync(archivo, '{ JSON roto')
    expect(leerLicencia(carpeta)).toBeNull()
    writeFileSync(archivo, JSON.stringify({ v: 1, firma: 'incompleta' }))
    expect(leerLicencia(carpeta)).toBeNull()
    expect(readFileSync(archivo, 'utf8')).toContain('incompleta')
  })

  it('permite retirar la licencia', () => {
    const carpeta = crearCarpeta()
    guardarLicencia(crearLicencia(), carpeta)

    borrarLicencia(carpeta)

    expect(existeLicencia(carpeta)).toBe(false)
  })
})
