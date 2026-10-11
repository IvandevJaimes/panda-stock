import { verify } from 'node:crypto'
import { LICENCIA_PUBLIC_KEYS } from './keys.ts'
import {
  esLicenciaFirmada,
  esPayloadLicencia,
  esRegistroDesconocido,
  VERSION_LICENCIA,
  type LicenciaFirmada,
  type PayloadLicencia,
} from './tipos.ts'

const PREFIJO_FIRMA = 'panda-stock-licencia-v1:'

export type MotivoValidacionLicencia =
  | 'FIRMA_INVALIDA'
  | 'EQUIPO_NO_COINCIDE'
  | 'VERSION_NO_SOPORTADA'
  | 'ESTRUCTURA_INVALIDA'

export type ResultadoValidacionLicencia =
  | { valida: true; licencia: LicenciaFirmada }
  | { valida: false; motivo: MotivoValidacionLicencia }

function serializarCanonico(payload: PayloadLicencia): string {
  return JSON.stringify({
    v: VERSION_LICENCIA,
    licenseId: payload.licenseId,
    huella: payload.huella,
    licenciado: payload.licenciado,
    emitidaEn: payload.emitidaEn,
    venceEn: null,
    funciones: payload.funciones,
  })
}

export function verificarFirma(
  payload: PayloadLicencia,
  firma: string,
  clavesPublicas: string | readonly string[] = LICENCIA_PUBLIC_KEYS,
): boolean {
  if (!/^[A-Za-z0-9_-]{86}$/.test(firma)) return false
  try {
    const firmaBytes = Buffer.from(firma, 'base64url')
    if (firmaBytes.length !== 64 || firmaBytes.toString('base64url') !== firma) return false
    const mensaje = Buffer.from(`${PREFIJO_FIRMA}${serializarCanonico(payload)}`, 'utf8')
    const listaClaves = typeof clavesPublicas === 'string' ? [clavesPublicas] : clavesPublicas
    return listaClaves.some((clavePublica) => verify(null, mensaje, clavePublica, firmaBytes))
  } catch {
    return false
  }
}

function esVersionDesconocida(valor: unknown): boolean {
  return esRegistroDesconocido(valor) &&
    typeof valor.v === 'number' &&
    valor.v !== VERSION_LICENCIA
}

export function validarLicencia(
  documento: unknown,
  huellaActual: string,
  clavesPublicas: string | readonly string[] = LICENCIA_PUBLIC_KEYS,
): ResultadoValidacionLicencia {
  if (esVersionDesconocida(documento)) {
    return { valida: false, motivo: 'VERSION_NO_SOPORTADA' }
  }
  if (!esLicenciaFirmada(documento)) {
    return { valida: false, motivo: 'ESTRUCTURA_INVALIDA' }
  }

  const { firma, ...payload } = documento
  if (!esPayloadLicencia(payload)) {
    return { valida: false, motivo: 'ESTRUCTURA_INVALIDA' }
  }
  if (!verificarFirma(payload, firma, clavesPublicas)) {
    return { valida: false, motivo: 'FIRMA_INVALIDA' }
  }
  if (payload.huella !== huellaActual) {
    return { valida: false, motivo: 'EQUIPO_NO_COINCIDE' }
  }
  return { valida: true, licencia: documento }
}
