import { Bell, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { buildAssetUrl } from '../../lib/assets'
import { getProductPlaceholder } from '../../lib/productPlaceholder'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/DropdownMenu'
import { Tooltip } from '../../components/ui/Tooltip'
import { useNotificaciones } from './useNotificaciones'
import type { Notificacion } from './notificacionesQuery'

const ANILLO_SEVERIDAD: Record<Notificacion['severidad'], string> = {
  critica: 'ring-2 ring-red-300 dark:ring-red-500/60',
  advertencia: 'ring-2 ring-amber-300 dark:ring-amber-500/60',
}

function FilaNotificacion({
  notificacion,
  onAbrir,
  onEliminar,
}: {
  notificacion: Notificacion
  onAbrir: () => void
  onEliminar: () => void
}) {
  const imagen =
    buildAssetUrl(notificacion.imgPath) ??
    getProductPlaceholder(notificacion.productoId)

  return (
    <div className="flex items-center gap-1">
      <DropdownMenuItem
        onClick={onAbrir}
        className="min-w-0 flex-1 items-center gap-3"
      >
        <img
          src={imagen}
          alt=""
          aria-hidden="true"
          className={cn(
            'h-10 w-10 shrink-0 rounded-lg object-cover',
            ANILLO_SEVERIDAD[notificacion.severidad],
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">
            {notificacion.producto}
          </span>
          <span className="block truncate font-normal text-slate-500 dark:text-slate-400">
            {notificacion.titulo}
            {notificacion.detalle ? ` · ${notificacion.detalle}` : ''}
          </span>
        </span>
      </DropdownMenuItem>
      <button
        type="button"
        aria-label={`Eliminar notificación de ${notificacion.producto}`}
        onClick={onEliminar}
        className={cn(
          'mr-1 grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-md',
          'bg-red-500 text-white shadow-xs transition-colors hover:bg-red-600',
          'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-400',
        )}
      >
        <X size={13} aria-hidden="true" />
      </button>
    </div>
  )
}

export function NotificacionesDropdown() {
  const { notificaciones, eliminar, limpiar } = useNotificaciones()
  const navegar = useNavigate()

  const total = notificaciones.length
  const abreviado = total > 99 ? '99+' : String(total)

  const abrirProducto = (notificacion: Notificacion) => {
    navegar({
      pathname: '/inventory',
      search: `?q=${encodeURIComponent(notificacion.termino)}`,
    })
  }

  return (
    <DropdownMenu placement="bottom-end">
      <Tooltip content="Notificaciones">
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={
              total > 0
                ? `Notificaciones (${total} pendiente${total === 1 ? '' : 's'})`
                : 'Notificaciones'
            }
            className={cn(
              'relative grid h-9 w-9 cursor-pointer place-items-center rounded-xl sm:h-10 sm:w-10',
              'border border-slate-200 bg-slate-100 text-slate-600',
              'transition-colors duration-150 hover:bg-slate-200 hover:text-slate-900',
              'dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300',
              'dark:hover:bg-slate-800/60 dark:hover:text-white',
            )}
          >
            <Bell size={18} aria-hidden="true" />
            {total > 0 && (
              <span className="absolute -right-1 -top-1 min-w-[16px] rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white shadow-xs">
                {abreviado}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
      </Tooltip>

      <DropdownMenuContent className="w-[26rem]">
        <div className="flex items-baseline justify-between px-2 pb-1 pt-1.5">
          <span className="font-display text-xs font-bold text-slate-900 dark:text-white">
            Notificaciones
          </span>
          {total > 0 && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {total} pendiente{total === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {total === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-3 py-6 text-center">
            <Bell
              size={22}
              className="text-slate-300 dark:text-slate-600"
              aria-hidden="true"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sin notificaciones
            </p>
          </div>
        ) : (
          <div className="flex max-h-[520px] flex-col gap-0.5 overflow-y-auto">
            {notificaciones.map((notificacion) => (
              <FilaNotificacion
                key={notificacion.id}
                notificacion={notificacion}
                onAbrir={() => abrirProducto(notificacion)}
                onEliminar={() => eliminar(notificacion.id)}
              />
            ))}
          </div>
        )}

        {total > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="danger"
              icon={<Trash2 size={14} />}
              onClick={limpiar}
            >
              Limpiar notificaciones
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
