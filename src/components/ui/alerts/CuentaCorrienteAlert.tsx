/* eslint-disable react-refresh/only-export-components */
import { HandCoins, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Notificacion } from '../../../features/notificaciones/notificacionesQuery'

interface CuentaCorrienteToastProps {
  notificaciones: Notificacion[]
  toastId: string | number
}

const ID_ALERTA_CUENTA_CORRIENTE = 'alerta-cuenta-corriente'

function CuentaCorrienteToast({ notificaciones, toastId }: CuentaCorrienteToastProps) {
  const cantidad = notificaciones.length
  const unicaNotificacion = cantidad === 1 ? notificaciones[0] : null

  return (
    <div
      role="alert"
      onClick={() => {
        toast.dismiss(toastId)
        window.dispatchEvent(new Event('open-notifications'))
      }}
      className="relative flex w-[380px] max-w-[calc(100vw-2rem)] cursor-pointer gap-2 rounded-lg border border-violet-400 bg-violet-600 pr-8 shadow-lg backdrop-blur-md"
    >
      <span className="flex items-center justify-center rounded-l-lg bg-black/20 px-2 text-white">
        <HandCoins className="h-5 w-5" />
      </span>
      <div className="flex min-w-0 flex-1 items-center py-3">
        {cantidad > 1 ? (
          <span className="text-sm font-semibold text-white">
            Hay {cantidad} clientes con deudas pendientes
          </span>
        ) : unicaNotificacion ? (
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            <span className="shrink-0 text-sm font-semibold text-white">
              Deuda pendiente:
            </span>
            <span
              key={unicaNotificacion.id}
              className="max-w-full truncate rounded-full bg-black/30 px-2.5 py-0.5 text-[11px] font-bold leading-tight text-white"
            >
              {unicaNotificacion.producto} · ${(unicaNotificacion.saldoActual ?? 0).toFixed(2)}
            </span>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Cerrar alerta de cuentas corrientes"
        onClick={(event) => {
          event.stopPropagation()
          toast.dismiss(toastId)
        }}
        className="absolute right-1 top-1 cursor-pointer text-white transition-colors hover:text-violet-200"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function showCuentaCorrienteAlert(notificaciones: Notificacion[]): void {
  if (notificaciones.length === 0) return

  toast.custom(
    (toastId) => (
      <CuentaCorrienteToast notificaciones={notificaciones} toastId={toastId} />
    ),
    {
      id: ID_ALERTA_CUENTA_CORRIENTE,
      toasterId: 'stock',
      position: 'top-center',
      duration: 7000,
    },
  )
}

export function dismissCuentaCorrienteAlert(): void {
  toast.dismiss(ID_ALERTA_CUENTA_CORRIENTE)
}
