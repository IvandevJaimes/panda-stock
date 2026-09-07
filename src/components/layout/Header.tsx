import { NavLink } from "react-router-dom";
import {
  Bell,
  Moon,
  Package,
  Settings,
  ShoppingBag,
  Sun,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useSettingsStore } from "../../stores/settings.store";
import { useUIStore } from "../../stores/ui.store";
import { cn } from "../../lib/cn";
import { Tooltip } from "../ui/Tooltip";

interface MainNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const mainNavItems: MainNavItem[] = [
  { to: "/pos", label: "Ventas", icon: ShoppingBag },
  { to: "/inventory", label: "Inventario", icon: Package },
  { to: "/reports", label: "Reportes", icon: TrendingUp },
];

export function Header() {
  const storeName = useSettingsStore((state) => state.storeName);
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const toggleRightSidebar = useUIStore((state) => state.toggleRightSidebar);

  const isDark = theme === "dark";

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 text-slate-900 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-200 md:gap-4 md:px-6 lg:gap-6">
      {/* ── Marca ── */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-emerald-500">
          <img
            src="/panda-stock-logo.png"
            alt="Logo de Panda Stock"
            className="h-7 w-7 object-cover"
          />
        </div>
        <div className="hidden sm:flex min-w-0 flex-col leading-tight">
          <span className="truncate font-display text-[14px] font-bold text-slate-900 dark:text-white sm:text-[15px]">
            {storeName}
          </span>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Punto de venta
          </span>
        </div>
      </div>

      {/* ── Navegación principal (píldoras) ── */}
      <nav className="flex min-w-0 flex-1 items-center  gap-1 sm:gap-1.5">
        {mainNavItems.map(({ to, label, icon: Icon }) => (
          <Tooltip key={to} content={label}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center justify-center gap-2 rounded-full border px-2.5 py-2 sm:px-4",
                  "font-display text-sm font-medium transition-colors duration-150",
                  isActive
                    ? "border-emerald-500/30 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white",
                )
              }
            >
              <Icon size={17} className="shrink-0" />
              <span className="hidden md:inline">{label}</span>
            </NavLink>
          </Tooltip>
        ))}
      </nav>

      {/* ── Acciones ── */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Alternar tema */}
        <Tooltip
          content={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
          <button
            onClick={toggleTheme}
            aria-label={
              isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
            }
            className={cn(
              "p-1 cursor-pointer place-items-center rounded-full text-slate-600",
              "transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900",
              "dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white",
            )}
          >
            {isDark ? (
              <Sun className="h-5.5 w-5.5 text-amber-400" />
            ) : (
              <Moon className="h-5.5 w-5.5 text-slate-700" />
            )}
          </button>
        </Tooltip>

        {/* Notificaciones */}
        <Tooltip content="Notificaciones y alertas de stock">
          <button
            aria-label="Notificaciones"
            className={cn(
              "relative grid h-9 w-9 cursor-pointer place-items-center rounded-xl sm:h-10 sm:w-10",
              "border border-slate-200 bg-slate-100 text-slate-600",
              "transition-colors duration-150 hover:bg-slate-200 hover:text-slate-900",
              "dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300",
              "dark:hover:bg-slate-800/60 dark:hover:text-white",
            )}
          >
            <Bell size={18} />
            <span
              className={cn(
                "absolute -right-1.5 -top-1.5 grid h-4.5 min-w-4.5 place-items-center rounded-full",
                "border border-white bg-red-500 px-1 text-[10px] font-bold leading-none text-white",
                "dark:border-[#111827]",
              )}
            >
              6
            </span>
          </button>
        </Tooltip>

        {/* Configuración → abre el panel lateral derecho */}
        <Tooltip content="Configuración del sistema">
          <button
            onClick={toggleRightSidebar}
            aria-label="Abrir panel lateral"
            className={cn(
              "grid h-9 w-9 cursor-pointer place-items-center rounded-xl sm:h-10 sm:w-10",
              "border border-slate-200 bg-slate-100 text-slate-600",
              "transition-colors duration-150 hover:bg-slate-200 hover:text-slate-900",
              "dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300",
              "dark:hover:bg-slate-800/60 dark:hover:text-white",
            )}
          >
            <Settings size={18} />
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
