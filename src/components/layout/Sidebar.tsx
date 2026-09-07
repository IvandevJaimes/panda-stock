import { NavLink } from 'react-router-dom'
import {
  Banknote,
  BarChart3,
  Boxes,
  Package,
  Settings,
  ShoppingBag,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../../lib/cn'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { to: '/pos', label: 'Ventas', icon: ShoppingBag },
  { to: '/products', label: 'Productos', icon: Package },
  { to: '/inventory', label: 'Inventario', icon: Boxes },
  { to: '/customers', label: 'Clientes', icon: Users },
  { to: '/cash-register', label: 'Caja', icon: Banknote },
  { to: '/reports', label: 'Reportes', icon: BarChart3 },
  { to: '/settings', label: 'Configuración', icon: Settings },
]

export function Sidebar() {
  return (
    <aside
      className={cn(
        'flex h-full w-60 shrink-0 flex-col',
        'border-r border-[#e3e8ee] bg-[#f8fafc]',
        'dark:border-[#212b37] dark:bg-[#121821]',
      )}
    >
      {/* ── Marca ── */}
      <div
        className={cn(
          'flex items-center gap-3 border-b border-[#e3e8ee] px-5 py-4',
          'dark:border-[#212b37]',
        )}
      >
        <div
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
            'bg-gradient-to-br from-[#10b981] to-[#0d9488]',
            'shadow-[0_8px_30px_rgba(16,185,129,0.28)]',
          )}
        >
          <span className="text-xl leading-none">🐼</span>
        </div>

        <div className="flex flex-col leading-tight">
          <span className="font-display text-[17px] font-bold tracking-[-0.01em] text-[#16202c] dark:text-[#e8ecf2]">
            Panda Stock
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c99a9] dark:text-[#66707e]">
            Punto de venta
          </span>
        </div>
      </div>

      {/* ── Navegación ── */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 font-display text-sm font-medium',
                'transition-all duration-150 ease-out',
                isActive
                  ? [
                      'border-[rgba(5,150,105,0.30)] bg-[rgba(5,150,105,0.10)] font-semibold text-[#047857]',
                      'dark:border-[rgba(16,185,129,0.35)] dark:bg-[rgba(16,185,129,0.12)] dark:text-[#34d399]',
                    ]
                  : [
                      'border-transparent text-[#5a687a]',
                      'hover:bg-[#f1f4f7] hover:text-[#16202c]',
                      'dark:text-[#a6b0bf] dark:hover:bg-[#181f2a] dark:hover:text-[#e8ecf2]',
                    ],
              )
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ── Versión ── */}
      <div className="border-t border-[#e3e8ee] px-5 py-3 dark:border-[#212b37]">
        <span className="text-[11px] font-medium text-[#8c99a9] dark:text-[#66707e]">
          v0.1.0 — dev
        </span>
      </div>
    </aside>
  )
}