import type { ErrorSeguridadCode, ResultadoSeguro } from '../../electron/db/types'

export class ErrorSeguridad extends Error {
  constructor(
    readonly code: ErrorSeguridadCode,
    message: string,
    readonly retryAt?: number,
  ) {
    super(message)
    this.name = 'ErrorSeguridad'
  }
}

export function desenvolverResultadoSeguro<T>(resultado: ResultadoSeguro<T>): T {
  if (resultado.ok) return resultado.value
  throw new ErrorSeguridad(resultado.error.code, resultado.error.message, resultado.error.retryAt)
}

export function normalizarError(error: unknown): Error {
  if (error instanceof ErrorSeguridad) return error
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
