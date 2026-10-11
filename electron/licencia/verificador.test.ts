import { generateKeyPairSync, sign } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { validarLicencia } from './verificador.ts'
import type { LicenciaFirmada, PayloadLicencia } from './tipos.ts'

const PREFIJO = 'panda-stock-licencia-v1:'
const huella = Buffer.alloc(32, 7).toString('base64url')
const otraHuella = Buffer.alloc(32, 8).toString('base64url')
const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const clavePublica = publicKey.export({ type: 'spki', format: 'pem' }).toString()

function crearPayload(overrides: Partial<PayloadLicencia> = {}): PayloadLicencia {
  return {
    v: 1,
    licenseId: 'e1b2e35d-378f-48d1-8f87-97484e850f5d',
    huella,
    licenciado: 'Comercio de prueba',
    emitidaEn: 1_800_000_000_000,
    venceEn: null,
    funciones: null,
    ...overrides,
  }
}

function firmar(payload: PayloadLicencia): LicenciaFirmada {
  const canonico = JSON.stringify({
    v: payload.v,
    licenseId: payload.licenseId,
    huella: payload.huella,
    licenciado: payload.licenciado,
    emitidaEn: payload.emitidaEn,
    venceEn: null,
    funciones: payload.funciones,
  })
  const firma = sign(null, Buffer.from(`${PREFIJO}${canonico}`), privateKey).toString('base64url')
  return { ...payload, firma }
}

describe('verificación de licencias offline', () => {
  it('acepta una licencia perpetua firmada para esta huella', () => {
    const licencia = firmar(crearPayload())
    expect(validarLicencia(licencia, huella, clavePublica)).toEqual({
      valida: true,
      licencia,
    })
  })

  it('rechaza una firma alterada', () => {
    const licencia = firmar(crearPayload())
    const firma = `${licencia.firma.slice(0, -1)}${licencia.firma.endsWith('A') ? 'B' : 'A'}`
    expect(validarLicencia({ ...licencia, firma }, huella, clavePublica)).toEqual({
      valida: false,
      motivo: 'FIRMA_INVALIDA',
    })
  })

  it('rechaza un payload alterado después de la firma', () => {
    const licencia = firmar(crearPayload())
    expect(validarLicencia({ ...licencia, licenciado: 'Otro comercio' }, huella, clavePublica)).toEqual({
      valida: false,
      motivo: 'FIRMA_INVALIDA',
    })
  })

  it('rechaza una licencia firmada para otra huella', () => {
    const licencia = firmar(crearPayload({ huella: otraHuella }))
    expect(validarLicencia(licencia, huella, clavePublica)).toEqual({
      valida: false,
      motivo: 'EQUIPO_NO_COINCIDE',
    })
  })

  it('rechaza versiones desconocidas y campos incompletos', () => {
    const licencia = firmar(crearPayload())
    expect(validarLicencia({ ...licencia, v: 2 }, huella, clavePublica)).toEqual({
      valida: false,
      motivo: 'VERSION_NO_SOPORTADA',
    })
    expect(validarLicencia({ v: 1, firma: licencia.firma }, huella, clavePublica)).toEqual({
      valida: false,
      motivo: 'ESTRUCTURA_INVALIDA',
    })
  })

  it('no admite licencias con vencimiento', () => {
    const licencia = firmar(crearPayload())
    expect(validarLicencia({ ...licencia, venceEn: 1_800_000_100_000 }, huella, clavePublica)).toEqual({
      valida: false,
      motivo: 'ESTRUCTURA_INVALIDA',
    })
  })
})
