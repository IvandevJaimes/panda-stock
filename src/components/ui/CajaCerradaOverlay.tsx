import { Lock } from 'lucide-react'
import { EmptyState } from './EmptyState'
import { cn } from '../../lib/cn'

interface CajaCerradaOverlayProps {
  className?: string
}

export function CajaCerradaOverlay({ className }: CajaCerradaOverlayProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col justify-center", className)}>
      <EmptyState
        icon={<Lock className="h-12 w-12 stroke-[1.5] text-slate-400 dark:text-slate-500/70" />}
        title="La caja está cerrada"
        description="Por favor, abrí la caja para empezar a vender."
      />
    </div>
  )
}
