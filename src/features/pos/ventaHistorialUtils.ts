import type { MetodoPago } from '../../../electron/db/types'

export const ETIQUETAS_METODO: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  qr: 'QR',
  debito: 'Tarjeta',
  credito: 'Crédito',
  cuenta_corriente: 'Cuenta corriente',
}
