import { Lock, ShieldCheck } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from './Button'

interface CajaCerradaOverlayProps {
  className?: string
  onAbrirCaja: () => void
  mostrarBoton?: boolean
}

export function CajaCerradaOverlay({
  className,
  onAbrirCaja,
  mostrarBoton = true,
}: CajaCerradaOverlayProps) {
  return (
    <div
      role="alertdialog"
      aria-label="La caja está cerrada"
      className={cn(
        'flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3 px-8 text-center',
        'bg-[#f4f6f8] dark:bg-[#0b0f17]',
        className,
      )}
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm dark:border-slate-700 dark:bg-[#111827] dark:text-slate-500">
        <Lock className="h-6 w-6 stroke-[1.5]" aria-hidden="true" />
      </span>

      <h3 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">
        La caja está cerrada
      </h3>

      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Para continuar, primero hay que abrir la caja del turno.
      </p>

      {mostrarBoton && (
        <Button
          variant="primary"
          onClick={onAbrirCaja}
          icon={<ShieldCheck size={18} aria-hidden="true" />}
        >
          Abrir caja
        </Button>
      )}
    </div>
  )
}
