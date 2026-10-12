import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, HandCoins, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { buildAssetUrl } from '../../lib/assets'
import { getProductPlaceholder } from '../../lib/productPlaceholder'
import { onAlertCreated } from '../../stores/stockAlertHistoryStore'
import { Badge } from '../../components/ui/Badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../components/ui/DropdownMenu'
import { Tooltip } from '../../components/ui/Tooltip'
import { useNotificaciones } from './useNotificaciones'
import type { Notificacion } from './notificacionesQuery'

const ESTILOS_CARD: Record<Notificacion['tipo'], string> = {
  vencido:
    'border-red-200/90 border-l-4 border-l-red-500 bg-red-50/70 hover:bg-red-100/70 hover:border-y-red-300 hover:border-r-red-300 hover:border-l-red-500 dark:border-red-900/40 dark:border-l-red-500 dark:bg-red-950/25 dark:hover:bg-red-950/40 dark:hover:border-y-red-800/60 dark:hover:border-r-red-800/60 dark:hover:border-l-red-500',
  stock_agotado:
    'border-red-200/90 border-l-4 border-l-red-500 bg-red-50/70 hover:bg-red-100/70 hover:border-y-red-300 hover:border-r-red-300 hover:border-l-red-500 dark:border-red-900/40 dark:border-l-red-500 dark:bg-red-950/25 dark:hover:bg-red-950/40 dark:hover:border-y-red-800/60 dark:hover:border-r-red-800/60 dark:hover:border-l-red-500',
  por_vencer:
    'border-amber-200/90 border-l-4 border-l-amber-500 bg-amber-50/70 hover:bg-amber-100/70 hover:border-y-amber-300 hover:border-r-amber-300 hover:border-l-amber-500 dark:border-amber-900/40 dark:border-l-amber-500 dark:bg-amber-950/25 dark:hover:bg-amber-950/40 dark:hover:border-y-amber-800/60 dark:hover:border-r-amber-800/60 dark:hover:border-l-amber-500',
  stock_bajo:
    'border-amber-200/90 border-l-4 border-l-amber-500 bg-amber-50/70 hover:bg-amber-100/70 hover:border-y-amber-300 hover:border-r-amber-300 hover:border-l-amber-500 dark:border-amber-900/40 dark:border-l-amber-500 dark:bg-amber-950/25 dark:hover:bg-amber-950/40 dark:hover:border-y-amber-800/60 dark:hover:border-r-amber-800/60 dark:hover:border-l-amber-500',
  cuenta_corriente:
    'border-violet-200/90 border-l-4 border-l-violet-500 bg-violet-50/70 hover:bg-violet-100/70 hover:border-y-violet-300 hover:border-r-violet-300 hover:border-l-violet-500 dark:border-violet-900/40 dark:border-l-violet-500 dark:bg-violet-950/25 dark:hover:bg-violet-950/40 dark:hover:border-y-violet-800/60 dark:hover:border-r-violet-800/60 dark:hover:border-l-violet-500',
}

const ESTILOS_BORDE_IMG: Record<Notificacion['severidad'], string> = {
  critica: 'border-red-200 dark:border-red-900/60',
  advertencia: 'border-amber-200 dark:border-amber-900/60',
  cuenta: 'border-violet-200 dark:border-violet-900/60',
}

const CONFIG_BADGE: Record<
  Notificacion['tipo'],
  { label: string; variant: 'expired' | 'warning' | 'default'; className?: string }
> = {
  vencido: { label: 'Vencido', variant: 'expired' },
  stock_agotado: { label: 'Sin stock', variant: 'expired' },
  por_vencer: { label: 'Por vencer', variant: 'warning' },
  stock_bajo: { label: 'Stock bajo', variant: 'warning' },
  cuenta_corriente: {
    label: 'Cuenta corriente',
    variant: 'default',
    className: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  },
}

type FiltroNotificacion = 'todas' | 'stock' | Notificacion['tipo']

const FILTROS: { id: FiltroNotificacion; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'stock', label: 'Stock' },
  { id: 'stock_bajo', label: 'Stock bajo' },
  { id: 'stock_agotado', label: 'Sin stock' },
  { id: 'por_vencer', label: 'Por vencer' },
  { id: 'vencido', label: 'Vencidos' },
  { id: 'cuenta_corriente', label: 'Cuentas corrientes' },
]

const EXIT_MS = 200

function FilaNotificacion({
  notificacion,
  saliendoTodo,
  onAbrir,
  onEliminar,
}: {
  notificacion: Notificacion
  saliendoTodo?: boolean
  onAbrir: () => void
  onEliminar: () => void
}) {
  const [saliendo, setSaliendo] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  const handleEliminar = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (saliendo || saliendoTodo) return
    setSaliendo(true)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      onEliminar()
    }, EXIT_MS)
  }

  const enSalida = saliendo || saliendoTodo
  const esCuentaCorriente = notificacion.tipo === 'cuenta_corriente'
  const imagen = esCuentaCorriente
    ? null
    : buildAssetUrl(notificacion.imgPath) ??
      (notificacion.productoId !== undefined
        ? getProductPlaceholder(notificacion.productoId)
        : null)
  const badge = CONFIG_BADGE[notificacion.tipo]

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onAbrir}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onAbrir()
        }
      }}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl border p-2.5 pr-8 transition-all cursor-pointer select-none',
        'shadow-2xs hover:shadow-xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
        ESTILOS_CARD[notificacion.tipo],
        enSalida && 'animate-card-exit pointer-events-none',
      )}
    >
      {imagen ? (
        <img
          src={imagen}
          alt=""
          aria-hidden="true"
          className={cn(
            'h-10 w-10 shrink-0 self-center rounded-lg object-cover border bg-white dark:bg-slate-800 shadow-2xs',
            ESTILOS_BORDE_IMG[notificacion.severidad],
          )}
        />
      ) : (
        <span className="grid h-10 w-10 shrink-0 self-center place-items-center rounded-lg border border-violet-200 bg-violet-100 text-violet-700 shadow-2xs dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300">
          <HandCoins size={18} aria-hidden="true" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="truncate text-xs font-bold text-slate-900 dark:text-white leading-tight">
            {notificacion.producto}
          </p>
          <Badge
            variant={badge.variant}
            className={cn(
              'shrink-0 text-[10px] px-1.5 py-0 font-semibold leading-normal',
              badge.className,
            )}
          >
            {badge.label}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
          {notificacion.titulo}
          {notificacion.detalle ? ` · ${notificacion.detalle}` : ''}
        </p>
      </div>

      <Tooltip content="Descartar" placement="left">
        <button
          type="button"
          aria-label={`Descartar notificación de ${notificacion.producto}`}
          onClick={handleEliminar}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 right-2 grid h-6 w-6 place-items-center rounded-lg cursor-pointer',
            'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
            'hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all',
            'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-400',
          )}
        >
          <X size={13} aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  )
}

export function NotificacionesDropdown() {
  const { notificaciones, eliminar, limpiar } = useNotificaciones()
  const navegar = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const [animando, setAnimando] = useState(false)
  const [limpiandoTodo, setLimpiandoTodo] = useState(false)
  const [filtro, setFiltro] = useState<FiltroNotificacion>('todas')
  const timeoutAnimacionRef = useRef<number | null>(null)
  const timerLimpiarRef = useRef<number | null>(null)

  const total = notificaciones.length
  const notificacionesFiltradas = notificaciones.filter((notificacion) => {
    if (filtro === 'todas') return true
    if (filtro === 'stock') {
      return notificacion.tipo === 'stock_bajo' || notificacion.tipo === 'stock_agotado'
    }
    return notificacion.tipo === filtro
  })
  const abreviado = total > 99 ? '99+' : String(total)

  const dispararAnimacion = useCallback(() => {
    setAnimando(false)
    requestAnimationFrame(() => {
      setAnimando(true)
      if (timeoutAnimacionRef.current !== null) {
        window.clearTimeout(timeoutAnimacionRef.current)
      }
      timeoutAnimacionRef.current = window.setTimeout(() => {
        setAnimando(false)
        timeoutAnimacionRef.current = null
      }, 1100)
    })
  }, [])

  useEffect(() => {
    return () => {
      if (timerLimpiarRef.current !== null) {
        window.clearTimeout(timerLimpiarRef.current)
      }
    }
  }, [])

  const handleLimpiarTodo = () => {
    if (limpiandoTodo || total === 0) return
    setLimpiandoTodo(true)
    timerLimpiarRef.current = window.setTimeout(() => {
      timerLimpiarRef.current = null
      limpiar()
      setLimpiandoTodo(false)
    }, EXIT_MS)
  }

  useEffect(() => {
    const desuscribirAlerta = onAlertCreated(() => {
      dispararAnimacion()
    })

    const alHaberNuevas = () => {
      dispararAnimacion()
    }

    const alAbrirNotificaciones = () => {
      setAbierto(true)
    }

    window.addEventListener('nuevas-notificaciones', alHaberNuevas)
    window.addEventListener('open-notifications', alAbrirNotificaciones)

    return () => {
      desuscribirAlerta()
      window.removeEventListener('nuevas-notificaciones', alHaberNuevas)
      window.removeEventListener('open-notifications', alAbrirNotificaciones)
      if (timeoutAnimacionRef.current !== null) {
        window.clearTimeout(timeoutAnimacionRef.current)
      }
    }
  }, [dispararAnimacion])

  const abrirProducto = (notificacion: Notificacion) => {
    setAbierto(false)
    if (notificacion.tipo === 'cuenta_corriente') {
      navegar(`/accounts?q=${encodeURIComponent(notificacion.producto)}`)
      return
    }
    navegar({
      pathname: '/inventory',
      search: `?q=${encodeURIComponent(notificacion.termino)}`,
    })
  }

  return (
    <DropdownMenu placement="bottom-end" open={abierto} onOpenChange={setAbierto}>
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
            <Bell
              size={18}
              aria-hidden="true"
              className={cn(
                'transition-transform',
                animando && 'animate-bell-ring origin-top text-red-500 dark:text-red-400',
              )}
            />
            {total > 0 && (
              <span
                className={cn(
                  'absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white shadow-xs',
                  animando && 'animate-badge-pop',
                )}
              >
                {animando && (
                  <span
                    className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-red-500 opacity-75"
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10">{abreviado}</span>
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
      </Tooltip>

      <DropdownMenuContent className="flex flex-col h-[400px] max-h-[calc(100vh-5rem)] w-[24rem] sm:w-[27rem] p-0 overflow-hidden rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="shrink-0 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 px-3.5 py-3 bg-slate-50/70 dark:bg-slate-900/50">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <Bell size={15} />
          </div>
          <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
            Notificaciones
          </span>
          {total > 0 && (
            <span className="rounded-full bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              {total}
            </span>
          )}
        </div>

        {total > 0 && (
          <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-slate-100 px-3 py-2 dark:border-slate-800/80">
            {FILTROS.map((opcion) => {
              const activo = filtro === opcion.id
              const cuentaActiva = activo && opcion.id === 'cuenta_corriente'
              return (
                <button
                  key={opcion.id}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setFiltro(opcion.id)}
                  className={cn(
                    'cursor-pointer rounded-full border px-2 py-1 text-[10px] font-semibold transition-colors',
                    activo && !cuentaActiva && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                    cuentaActiva && 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
                    !activo && 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800',
                  )}
                >
                  {opcion.label}
                </button>
              )
            })}
          </div>
        )}

        {total === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 px-4 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mb-2.5">
              <Bell size={22} />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Sin notificaciones pendientes
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              El inventario y las cuentas están al día
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col gap-2 p-2.5 overflow-y-auto overscroll-contain">
            {notificacionesFiltradas.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                No hay notificaciones en este filtro.
              </p>
            ) : (
              notificacionesFiltradas.map((notificacion) => (
                <FilaNotificacion
                  key={notificacion.id}
                  notificacion={notificacion}
                  saliendoTodo={limpiandoTodo}
                  onAbrir={() => abrirProducto(notificacion)}
                  onEliminar={() => eliminar(notificacion.id)}
                />
              ))
            )}
          </div>
        )}

        {total > 0 && (
          <div className="shrink-0 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 px-3.5 py-2 bg-slate-50/70 dark:bg-slate-900/50">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Clic en una alerta para abrir su sección
            </span>
            <button
              type="button"
              aria-label="Limpiar todas las notificaciones"
              onClick={handleLimpiarTodo}
              disabled={limpiandoTodo}
              className={cn(
                'inline-flex h-7 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors cursor-pointer',
                'text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/30',
                'disabled:pointer-events-none disabled:opacity-50',
              )}
            >
              <Trash2 size={14} className="shrink-0" aria-hidden="true" />
              <span className="leading-none">Limpiar todo</span>
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
