export const VERSION_LICENCIA = 1 as const

export interface PayloadLicencia {
  v: typeof VERSION_LICENCIA
  licenseId: string
  huella: string
  licenciado: string
  emitidaEn: number
  venceEn: null
  funciones: string[] | null
}

export interface LicenciaFirmada extends PayloadLicencia {
  firma: string
}

export type ErrorLicenciaCode =
  | 'FIRMA_INVALIDA'
  | 'EQUIPO_NO_COINCIDE'
  | 'VERSION_NO_SOPORTADA'
  | 'ESTRUCTURA_INVALIDA'
  | 'ALMACENAMIENTO'

export type ResultadoLicencia<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: ErrorLicenciaCode; message: string } }

export interface EstadoLicencia {
  estado: 'ausente' | 'valida' | 'invalida'
  motivo?: ErrorLicenciaCode
  huella: string
  licenciado?: string
  licenciaId?: string
  emitidaEn?: number
  venceEn?: null
  advertencia?: string
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function tieneClavesExactas(valor: Record<string, unknown>, claves: readonly string[]): boolean {
  const propias = Object.keys(valor)
  return propias.length === claves.length && claves.every((clave) => Object.hasOwn(valor, clave))
}

export function esPayloadLicencia(valor: unknown): valor is PayloadLicencia {
  if (!esRegistro(valor)) return false
  if (!tieneClavesExactas(valor, ['v', 'licenseId', 'huella', 'licenciado', 'emitidaEn', 'venceEn', 'funciones'])) {
    return false
  }
  return valor.v === VERSION_LICENCIA &&
    typeof valor.licenseId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor.licenseId) &&
    typeof valor.huella === 'string' && /^[A-Za-z0-9_-]{43}$/.test(valor.huella) &&
    typeof valor.licenciado === 'string' && valor.licenciado.trim().length > 0 && valor.licenciado.length <= 200 &&
    typeof valor.emitidaEn === 'number' && Number.isSafeInteger(valor.emitidaEn) && valor.emitidaEn > 0 &&
    valor.venceEn === null &&
    (valor.funciones === null || (
      Array.isArray(valor.funciones) &&
      valor.funciones.length <= 64 &&
      valor.funciones.every((funcion) => typeof funcion === 'string' && /^[a-zA-Z0-9._-]{1,64}$/.test(funcion)) &&
      new Set(valor.funciones).size === valor.funciones.length
    ))
}

export function esLicenciaFirmada(valor: unknown): valor is LicenciaFirmada {
  if (!esRegistro(valor) || !tieneClavesExactas(valor, [
    'v', 'licenseId', 'huella', 'licenciado', 'emitidaEn', 'venceEn', 'funciones', 'firma',
  ])) return false
  const { firma, ...payload } = valor
  return typeof firma === 'string' && /^[A-Za-z0-9_-]{86}$/.test(firma) && esPayloadLicencia(payload)
}

export function esRegistroDesconocido(valor: unknown): valor is Record<string, unknown> {
  return esRegistro(valor)
}
