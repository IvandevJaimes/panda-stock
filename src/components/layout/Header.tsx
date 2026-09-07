import { NavLink } from 'react-router-dom'
import { Bell, Package, Settings, ShoppingBag, TrendingUp, type LucideIcon } from 'lucide-react'
import { useSettingsStore } from '../../stores/settings.store'
import { useUIStore } from '../../stores/ui.store'
import { cn } from '../../lib/cn'

interface MainNavItem {
  to: string
  label: string
  icon: LucideIcon
}

const mainNavItems: MainNavItem[] = [
  { to: '/pos', label: 'Ventas', icon: ShoppingBag },
  { to: '/inventory', label: 'Inventario', icon: Package },
  { to: '/reports', label: 'Reportes', icon: TrendingUp },
]

export function Header() {
  const storeName = useSettingsStore((state) => state.storeName)
  const toggleRightSidebar = useUIStore((state) => state.toggleRightSidebar)

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-800 bg-[#111827] px-4 text-slate-200 md:gap-6 md:px-6">
      {/* ── Marca ── */}
      <div className="flex shrink-0 items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500 text-[#0b0f17]">
          <span className="text-xl leading-none">🐼</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-display text-[15px] font-bold text-white">{storeName}</span>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Punto de venta
          </span>
        </div>
      </div>

      {/* ── Navegación principal (píldoras) ── */}
      <nav className="flex flex-1 items-center justify-center gap-1.5">
        {mainNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'inline-flex items-center gap-2 rounded-full border px-4 py-2',
                'font-display text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400'
                  : 'border-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white',
              )
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ── Acciones ── */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Notificaciones */}
        <button
          aria-label="Notificaciones"
          className={cn(
            'relative grid h-10 w-10 place-items-center rounded-xl',
            'border border-slate-700/60 bg-slate-800/40 text-slate-300',
            'transition-colors duration-150 hover:bg-slate-800/60 hover:text-white',
          )}
        >
          <Bell size={18} />
          <span
            className={cn(
              'absolute -right-1.5 -top-1.5 grid h-4.5 min-w-4.5 place-items-center rounded-full',
              'border border-[#111827] bg-red-500 px-1 text-[10px] font-bold leading-none text-white',
            )}
          >
            6
          </span>
        </button>

        {/* Configuración → abre el panel lateral derecho */}
        <button
          onClick={toggleRightSidebar}
          aria-label="Abrir panel lateral"
          className={cn(
            'grid h-10 w-10 place-items-center rounded-xl',
            'border border-slate-700/60 bg-slate-800/40 text-slate-300',
            'transition-colors duration-150 hover:bg-slate-800/60 hover:text-white',
          )}
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  )
}