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

/**
 * La fecha de apertura no va acá: vive en el modal de arqueo, junto al timer en
 * vivo. Si el botón la mostrara, el header volvería a cargar con un dato que el
 * cajero solo necesita mientras está contando la gaveta.
 */
export function cajaAbiertaPor(caja: CajaConResponsable): string {
  return `Caja abierta · ${caja.empleadoNombre}`
}
