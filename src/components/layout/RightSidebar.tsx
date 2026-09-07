import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Box,
  DollarSign,
  Moon,
  Sliders,
  Sun,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useUIStore } from '../../stores/ui.store'
import { cn } from '../../lib/cn'

interface DrawerNavItem {
  to: string
  label: string
  icon: LucideIcon
}

const drawerNavItems: DrawerNavItem[] = [
  { to: '/cash-register', label: 'Caja & Turnos', icon: DollarSign },
  { to: '/products', label: 'Productos & Catálogo', icon: Box },
  { to: '/customers', label: 'Clientes', icon: Users },
  { to: '/settings', label: 'Configuración del Sistema', icon: Sliders },
]

export function RightSidebar() {
  const isOpen = useUIStore((state) => state.isRightSidebarOpen)
  const closeRightSidebar = useUIStore((state) => state.closeRightSidebar)
  const theme = useUIStore((state) => state.theme)
  const toggleTheme = useUIStore((state) => state.toggleTheme)

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRightSidebar()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closeRightSidebar])

  return (
    <>
      {/* ── Backdrop (cierra al hacer click afuera) ── */}
      <div
        onClick={closeRightSidebar}
        aria-hidden
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      {/* ── Drawer ── */}
      <aside
        aria-hidden={!isOpen}
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-80 max-w-[85vw] flex-col',
          'border-l border-slate-800 bg-[#111827] text-slate-200',
          'shadow-2xl shadow-black/40 transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Encabezado */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 px-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">
            Panel Lateral
          </h2>
          <button
            onClick={closeRightSidebar}
            aria-label="Cerrar panel lateral"
            className={cn(
              'grid h-9 w-9 place-items-center rounded-xl',
              'border border-slate-700/60 bg-slate-800/40 text-slate-300',
              'transition-colors duration-150 hover:bg-slate-800/60 hover:text-white',
            )}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navegación secundaria */}
        <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-4">
          {drawerNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeRightSidebar}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl border px-3.5 py-2.5 font-display text-sm font-medium',
                  'transition-colors duration-150',
                  isActive
                    ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400'
                    : 'border-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white',
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Pie: toggle de tema */}
        <div className="border-t border-slate-800 p-4">
          <button
            onClick={toggleTheme}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl',
              'border border-slate-700/60 bg-slate-800/40 px-4 py-2.5',
              'font-display text-sm font-medium text-slate-300',
              'transition-colors duration-150 hover:bg-slate-800/60 hover:text-white',
            )}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </button>
        </div>
      </aside>
    </>
  )
}