import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Boxes,
  Users,
  Banknote,
  BarChart3,
  Settings,
} from 'lucide-react'

const navItems = [
  { to: '/pos', label: 'Punto de venta', icon: LayoutDashboard },
  { to: '/products', label: 'Productos', icon: Package },
  { to: '/inventory', label: 'Inventario', icon: Boxes },
  { to: '/customers', label: 'Clientes', icon: Users },
  { to: '/cash-register', label: 'Caja', icon: Banknote },
  { to: '/reports', label: 'Reportes', icon: BarChart3 },
  { to: '/settings', label: 'Configuración', icon: Settings },
]

export function Navigation() {
  return (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto p-3">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5'
            }`
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
