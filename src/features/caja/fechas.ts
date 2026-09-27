import type { CajaConResponsable } from '../../../electron/db/types'

/**
 * Sale "—" y no una fecha inventada cuando el valor no parsea: es preferible un
 * hueco visible a un "Invalid Date" colgado en el header.
 */
export function formatearFechaHoraCorta(iso?: string | null): string {
  if (!iso) return '—'
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

export function cajaAbiertaDesde(caja: CajaConResponsable): string {
  return `Caja abierta desde ${formatearFechaHoraCorta(caja.fechaApertura)} · ${caja.empleadoNombre}`
}
