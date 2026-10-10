import { PackageOpen, PackagePlus } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from '../../components/ui/Button'

interface PosSinProductosOverlayProps {
  className?: string
  onNuevoProducto: () => void
}

export function PosSinProductosOverlay({
  className,
  onNuevoProducto,
}: PosSinProductosOverlayProps) {
  return (
    <div
      role="alertdialog"
      aria-label="No hay productos cargados"
      className={cn(
        'flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3 px-8 text-center',
        'bg-[#f4f6f8] dark:bg-[#0b0f17]',
        className,
      )}
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm dark:border-slate-700 dark:bg-[#111827] dark:text-slate-500">
        <PackageOpen className="h-6 w-6 stroke-[1.5]" aria-hidden="true" />
      </span>

      <h3 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">
        No hay productos cargados
      </h3>

      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Cargá tu primer producto desde Inventario para empezar a vender.
      </p>

      <Button
        variant="primary"
        onClick={onNuevoProducto}
        icon={<PackagePlus size={18} aria-hidden="true" />}
      >
        Nuevo producto
      </Button>
    </div>
  )
}
