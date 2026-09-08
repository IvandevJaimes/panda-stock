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