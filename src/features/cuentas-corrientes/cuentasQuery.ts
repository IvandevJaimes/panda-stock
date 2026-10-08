import type {
  ClienteConSaldo,
  MetodoPago,
  MovimientoCuentaCorriente,
} from '../../../electron/db/types'

/**
 * Lógica pura de la pantalla de cuentas corrientes. Sin React: los componentes
 * orquestan estado y render, las reglas viven acá y se testean solas.
 *
 * Copia `formatearMoneda` de `posQuery`/`reportsQuery` en vez de importarlo: es una
 * línea, atar la pantalla de deuda al ticket o a la auditoría significa que un
 * cambio de formato en cualquiera de los dos la rompe. Mismo formato de salida.
 */
export function formatearMoneda(valor: number): string {
  return `$${valor.toFixed(2)}`
}

export function formatearFecha(fechaISO: string): string {
  return new Date(fechaISO).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/**
 * 'cuenta_corriente' queda afuera a propósito: un abono no se paga "en cuenta
 * corriente", se paga en plata. Si el cliente saldara una deuda generating otra
 * deuda, el saldo nunca baja.
 */
export const METODOS_ABONO: { metodo: MetodoPago; etiqueta: string }[] = [
  { metodo: 'efectivo', etiqueta: 'Efectivo' },
  { metodo: 'transferencia', etiqueta: 'Transferencia' },
  { metodo: 'debito', etiqueta: 'Débito' },
  { metodo: 'credito', etiqueta: 'Crédito' },
]

export function metodoDeAbonoEtiqueta(metodo: MetodoPago | null): string {
  if (!metodo) return '—'
  return METODOS_ABONO.find((m) => m.metodo === metodo)?.etiqueta ?? metodo
}

/** Un cargo sin `ventaId` lo escribió una persona a mano, no una venta. */
export function origenMovimiento(movimiento: MovimientoCuentaCorriente): string {
  if (movimiento.tipo === 'cargo') {
    return movimiento.ventaId ? `Venta #${movimiento.ventaId}` : 'Carga manual'
  }
  if (movimiento.tipo === 'devolucion') return `Devolución de venta #${movimiento.ventaId ?? '—'}`
  if (movimiento.tipo === 'reintegro') {
    return `Reintegro de venta #${movimiento.ventaId ?? '—'} · ${metodoDeAbonoEtiqueta(movimiento.metodo)}`
  }
  return metodoDeAbonoEtiqueta(movimiento.metodo)
}

export function buscarClientes(
  clientes: ClienteConSaldo[],
  texto: string,
): ClienteConSaldo[] {
  const busqueda = texto.trim().toLowerCase()

  if (!busqueda) return clientes

  return clientes.filter(
    (cliente) =>
      cliente.nombre.toLowerCase().includes(busqueda) ||
      (cliente.telefono?.toLowerCase().includes(busqueda) ?? false),
  )
}

/**
 * La lista viene ordenada por deuda de mayor a menor desde el backend, pero al
 * filtrar en el renderer hay que reordenar: si no, buscar un cliente devuelve la
 * tabla en el orden en que se filtró y no en el que se ve.
 */
export function ordenarPorDeuda(clientes: ClienteConSaldo[]): ClienteConSaldo[] {
  return [...clientes].sort(
    (a, b) => b.saldo - a.saldo || a.nombre.localeCompare(b.nombre),
  )
}

export function tieneDeuda(cliente: ClienteConSaldo): boolean {
  return cliente.saldo > 0
}
