import type { ErrorSeguridadCode, ResultadoSeguro } from '../../electron/db/types'
import type { ErrorLicenciaCode, ResultadoLicencia } from '../../electron/licencia/tipos'

export class ErrorSeguridad extends Error {
  readonly code: ErrorSeguridadCode
  readonly retryAt?: number

  constructor(
    code: ErrorSeguridadCode,
    message: string,
    retryAt?: number,
  ) {
    super(message)
    this.name = 'ErrorSeguridad'
    this.code = code
    this.retryAt = retryAt
  }
}

export function desenvolverResultadoSeguro<T>(resultado: ResultadoSeguro<T>): T
export function desenvolverResultadoSeguro<T>(resultado: ResultadoLicencia<T>): T
export function desenvolverResultadoSeguro<T>(
  resultado: ResultadoSeguro<T> | ResultadoLicencia<T>,
): T {
  if (resultado.ok) return resultado.value
  if (esCodigoSeguridad(resultado.error.code)) {
    throw new ErrorSeguridad(
      resultado.error.code,
      resultado.error.message,
      'retryAt' in resultado.error ? resultado.error.retryAt : undefined,
    )
  }
  const error = new Error(resultado.error.message) as Error & { code: ErrorLicenciaCode }
  error.code = resultado.error.code
  throw error
}

function esCodigoSeguridad(codigo: ErrorSeguridadCode | ErrorLicenciaCode): codigo is ErrorSeguridadCode {
  return codigo === 'AUTHORIZATION_REQUIRED' || codigo === 'INVALID_PIN' || codigo === 'PIN_LOCKED'
}

export function normalizarError(error: unknown): Error {
  if (error instanceof ErrorSeguridad) return error
  if (error instanceof Error && 'code' in error && typeof error.code === 'string') return error
  return new Error(toErrorMessage(error), { cause: error })
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    const match = error.message.match(
      /^Error invoking remote method '[^']+': (?:Error: )?(.+)$/,
    )
    return match?.[1] ?? error.message
  }
  if (typeof error === 'string' && error) return error
  return 'Error inesperado'
}
