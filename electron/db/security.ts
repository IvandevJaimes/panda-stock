import { createHash, randomBytes, scryptSync, timingSafeEqual, verify } from 'node:crypto'
import type { KeyObject } from 'node:crypto'
import type { ErrorSeguridadCode } from './types.ts'

const SCRYPT_N = 32_768
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEY_LENGTH = 64
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024
const RECOVERY_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAvuPO+wTupIdueehhTnoWkB1xm6hRDNGUHz86NNfxGYg=
-----END PUBLIC KEY-----`

export class ErrorAutorizacion extends Error {
  readonly code: ErrorSeguridadCode
  readonly retryAt?: number

  constructor(
    code: ErrorSeguridadCode,
    message: string,
    retryAt?: number,
  ) {
    super(message)
    this.name = 'ErrorAutorizacion'
    this.code = code
    this.retryAt = retryAt
  }
}

function compararHexSeguro(a: string, b: string): boolean {
  if (!/^[\da-f]+$/i.test(a) || !/^[\da-f]+$/i.test(b) || a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(pin, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAX_MEMORY,
  })
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${hash.toString('hex')}`
}

export function verificarHashPin(pin: string, almacenado: string): { valido: boolean; necesitaMigracion: boolean } {
  if (/^[\da-f]{64}$/i.test(almacenado)) {
    const legado = createHash('sha256').update(pin).digest('hex')
    return { valido: compararHexSeguro(legado, almacenado), necesitaMigracion: true }
  }

  const [algoritmo, nTexto, rTexto, pTexto, saltTexto, hashTexto] = almacenado.split('$')
  const n = Number(nTexto)
  const r = Number(rTexto)
  const p = Number(pTexto)
  if (
    algoritmo !== 'scrypt' ||
    !Number.isInteger(n) || n < 16_384 || n > 65_536 ||
    !Number.isInteger(r) || r < 1 || r > 16 ||
    !Number.isInteger(p) || p < 1 || p > 4 ||
    !saltTexto || !/^[\da-f]{32}$/i.test(saltTexto) ||
    !hashTexto || !/^[\da-f]{128}$/i.test(hashTexto)
  ) {
    return { valido: false, necesitaMigracion: false }
  }

  const esperado = Buffer.from(hashTexto, 'hex')
  const calculado = scryptSync(pin, Buffer.from(saltTexto, 'hex'), esperado.length, {
    N: n,
    r,
    p,
    maxmem: SCRYPT_MAX_MEMORY,
  })
  return { valido: timingSafeEqual(calculado, esperado), necesitaMigracion: false }
}

export function verificarClaveRecuperacion(
  codigo: string,
  recoveryId: string,
  clavePublica: string | KeyObject = RECOVERY_PUBLIC_KEY,
): boolean {
  if (!/^[A-Za-z0-9_-]{86}$/.test(codigo)) return false

  try {
    return verify(
      null,
      Buffer.from(`panda-stock-recovery-v1:${recoveryId}`),
      clavePublica,
      Buffer.from(codigo, 'base64url'),
    )
  } catch {
    return false
  }
}
