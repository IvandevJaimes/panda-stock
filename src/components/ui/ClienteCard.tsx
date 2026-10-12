import type { MouseEvent } from 'react'
import { Banknote, MoreVertical, Pencil, Phone, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { Button } from './Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './DropdownMenu'
import { Tooltip } from './Tooltip'

export interface ClienteCardProps {
  nombre: string
  telefono: string | null
  saldoPendiente: string
  conDeuda: boolean
  archivado?: boolean
  onOpen: () => void
  onContextMenu?: (event: MouseEvent<HTMLElement>) => void
  onCobrar?: () => void
  onEditar: () => void
  onEliminar?: () => void
}

export function ClienteCard({
  nombre,
  telefono,
  saldoPendiente,
  conDeuda,
  archivado = false,
  onOpen,
  onContextMenu,
  onCobrar,
  onEditar,
  onEliminar,
}: ClienteCardProps) {
  const esEscritorio = useMediaQuery('(min-width: 768px)')
  const iniciales = nombre.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0] ?? '').join('').toUpperCase()

  return (
    <article
      aria-label={`Cliente ${nombre}`}
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest('button')) return
        onOpen()
      }}
      onContextMenu={(event) => {
        if (!onContextMenu) return
        event.preventDefault()
        onContextMenu(event)
      }}
      className={cn(
        'grid h-16 w-full min-w-0 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-stretch gap-2.5 overflow-hidden rounded-2xl border shadow-xs transition-colors duration-150 animate-entry-up sm:gap-4',
        conDeuda
          ? 'border-amber-300/80 bg-transparent hover:border-amber-400 dark:border-amber-800/70 dark:bg-transparent dark:hover:border-amber-700'
          : 'border-slate-300 bg-transparent hover:border-slate-400 dark:border-slate-700 dark:bg-transparent dark:hover:border-slate-600',
      )}
    >
      <div className={cn(
        'flex h-full w-12 shrink-0 items-center justify-center border-r font-display text-sm font-bold sm:w-14 sm:text-base',
        archivado
          ? 'border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300'
          : conDeuda
            ? 'border-amber-200/80 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300'
            : 'border-emerald-200/80 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-300',
      )}>
        {iniciales || 'CL'}
      </div>
      <div className="flex min-w-0 flex-col justify-center">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="min-w-0 truncate font-display text-xs font-bold text-slate-900 sm:text-sm dark:text-white">
            {nombre}
          </h3>
          <span className={cn(
            'shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold sm:text-[10px]',
            conDeuda
              ? 'bg-amber-100/80 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
              : 'bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
          )}>
            {conDeuda ? 'Con deuda' : 'Al día'}
          </span>
          {archivado && (
            <span className="hidden shrink-0 rounded-md bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 sm:inline-flex dark:bg-slate-800 dark:text-slate-300">
              Archivado
            </span>
          )}
        </div>
        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] text-slate-600 sm:text-xs dark:text-slate-300">
          <Phone size={12} className="shrink-0" />
          <span className="truncate">{telefono || 'Sin teléfono registrado'}</span>
        </p>
      </div>
      <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 pr-2 sm:gap-4 sm:pr-3">
        <div className="flex shrink-0 flex-col items-end justify-center gap-0.5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-600 sm:text-[10px] dark:text-slate-300">
            Pendiente
          </p>
          <p className={cn(
            'font-display text-xs font-bold tabular-nums sm:text-sm',
            conDeuda ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300',
          )}>
            {saldoPendiente}
          </p>
        </div>
        {conDeuda && onCobrar && (
          <Tooltip content="Cobrar" placement="top" disabled={esEscritorio}>
            <Button
              size="sm"
              variant="ghost"
              icon={<Banknote className="h-5 w-5 md:h-3.5 md:w-3.5" aria-hidden />}
              aria-label={`Cobrar a ${nombre}`}
              onClick={onCobrar}
              className="h-8 shrink-0 gap-0 rounded-xl bg-emerald-600 px-1.5 py-0 text-white shadow-xs hover:bg-emerald-500 focus-visible:ring-emerald-500/30 md:gap-2 md:px-3 md:text-xs dark:text-white dark:hover:bg-emerald-500"
            >
              <span className="hidden md:inline-flex md:items-center md:leading-none">Cobrar</span>
            </Button>
          </Tooltip>
        )}
        <div className="flex shrink-0 items-center gap-1 border-l border-slate-200/70 pl-2 dark:border-slate-800/80">
          <div className="hidden items-center md:flex">
            <Tooltip content="Editar" placement="top">
              <button
                type="button"
                aria-label={`Editar a ${nombre}`}
                onClick={onEditar}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-black/5 hover:text-slate-800 sm:h-8 sm:w-8 sm:rounded-xl dark:hover:bg-white/5 dark:hover:text-slate-100"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            {onEliminar && (
              <Tooltip content="Eliminar cliente" placement="top">
                <button
                  type="button"
                  aria-label={`Eliminar cliente ${nombre}`}
                  onClick={onEliminar}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 sm:h-8 sm:w-8 sm:rounded-xl dark:hover:bg-red-950/40 dark:hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            )}
          </div>
          <div className="md:hidden">
            <DropdownMenu placement="bottom-end">
              <Tooltip content="Ver acciones">
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Más opciones para ${nombre}`}
                    className="cursor-pointer rounded-lg border border-transparent p-1.5 text-slate-400 transition-all hover:border-slate-300/60 hover:bg-slate-200/60 dark:hover:border-slate-700/60 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
              </Tooltip>
              <DropdownMenuContent className="w-48">
                <DropdownMenuItem icon={<Pencil className="h-3.5 w-3.5" />} onClick={onEditar}>
                  Editar cliente
                </DropdownMenuItem>
                {onEliminar && (
                  <DropdownMenuItem variant="danger" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={onEliminar}>
                    Eliminar cliente
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </article>
  )
}
