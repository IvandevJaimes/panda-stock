import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Bell,
  Eye,
  Moon,
  Package,
  Pencil,
  Settings,
  ShoppingBag,
  Store,
  Sun,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useSettingsStore } from "../../stores/settings.store";
import { useNegocioStore } from "../../stores/negocio.store";
import { useUIStore } from "../../stores/ui.store";
import { cn } from "../../lib/cn";
import { Tooltip } from "../ui/Tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/DropdownMenu";
import { BusinessSetupModal } from "../../features/onboarding/BusinessSetupModal";
import { ImageLightbox } from "../ui/ImageLightbox";
import pandaStockLogo from "../../assets/panda-stock-logo.svg";
import { toast } from "sonner";

interface MainNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  bloqueado?: boolean;
}

const mainNavItems: MainNavItem[] = [
  { to: "/pos", label: "Ventas", icon: ShoppingBag },
  { to: "/inventory", label: "Inventario", icon: Package },
  { to: "/reports", label: "Reportes", icon: TrendingUp, bloqueado: true },
];

export function Header() {
  const storeName = useSettingsStore((state) => state.storeName);
  const negocioNombre = useNegocioStore((state) => state.nombre);
  const negocioLogoUrl = useNegocioStore((state) => state.logoUrl);
  const setNegocio = useNegocioStore((state) => state.setNegocio);
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const toggleRightSidebar = useUIStore((state) => state.toggleRightSidebar);
  const [logoFallidoUrl, setLogoFallidoUrl] = useState<string | null>(null);
  const [verLogoAbierto, setVerLogoAbierto] = useState(false);
  const [editarNegocioAbierto, setEditarNegocioAbierto] = useState(false);

  const isDark = theme === "dark";
  const hayNegocio = negocioNombre.length > 0 || negocioLogoUrl !== null;
  const logoCaido = negocioLogoUrl !== null && logoFallidoUrl === negocioLogoUrl;

  return (
    <header className="flex h-18 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 text-slate-900 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-200 md:gap-4 md:px-6 lg:gap-6">
      {/* ── Marca ── */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-emerald-500">
          <img
            src={pandaStockLogo}
            alt="Logo de Panda Stock"
            className="h-9 w-9 object-cover"
            draggable={false}
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
        {mainNavItems.map(({ to, label, icon: Icon, bloqueado }) =>
          bloqueado ? (
            <Tooltip key={to} content="Próximamente">
              <span
                aria-disabled="true"
                className={cn(
                  "inline-flex cursor-not-allowed select-none items-center justify-center gap-2 rounded-full border border-transparent px-2.5 py-2 sm:px-4",
                  "font-display text-sm font-medium text-slate-400",
                  "dark:text-slate-600",
                )}
              >
                <Icon size={17} className="shrink-0" />
                <span className="hidden md:inline">{label}</span>
              </span>
            </Tooltip>
          ) : (
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
          ),
        )}
      </nav>

      {/* ── Acciones ── */}
      <div className="flex shrink-0 items-center gap-2">
 

        <ImageLightbox
          open={verLogoAbierto && negocioLogoUrl !== null}
          onClose={() => setVerLogoAbierto(false)}
          src={negocioLogoUrl ?? ""}
          alt="Logo del negocio"
        />

        <BusinessSetupModal
          isOpen={editarNegocioAbierto}
          closable
          onClose={() => setEditarNegocioAbierto(false)}
          initialNombre={negocioNombre}
          initialLogoUrl={negocioLogoUrl}
          onSuccess={(negocio) => {
            setNegocio(negocio);
            setEditarNegocioAbierto(false);
          }}
        />

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
              <Sun className="h-6 w-6 text-amber-400" />
            ) : (
              <Moon className="h-6 w-6 text-blue-700" />
            )}
          </button>
        </Tooltip>

        {/* Notificaciones — bloqueado (función no desarrollada) */}
        <Tooltip content="Próximamente">
          <span
            aria-disabled="true"
            className={cn(
              "relative grid h-9 w-9 cursor-not-allowed select-none place-items-center rounded-xl sm:h-10 sm:w-10",
              "border border-slate-200 bg-slate-100 text-slate-400",
              "dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-600",
            )}
          >
            <Bell size={18} />
          </span>
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
           <div
              aria-hidden="true"
              className=" h-8 w-px shrink-0 bg-slate-200 dark:bg-slate-700/60 "
            />
               {/* Información del negocio */}
        {hayNegocio && (
          <>
            <DropdownMenu placement="bottom-end">
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Opciones del negocio"
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl px-1 py-1 transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                >
                  {negocioLogoUrl && !logoCaido ? (
                    <img
                      key={negocioLogoUrl}
                      src={negocioLogoUrl}
                      alt="Logo del negocio"
                      onError={() => setLogoFallidoUrl(negocioLogoUrl)}
                      draggable={false}
                      className="h-15.5 w-15.5 shrink-0 rounded-full border border-slate-200 object-cover object-center dark:border-slate-700"
                    />
                  ) : (
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Store size={26} aria-hidden="true" />
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  icon={<Eye size={16} />}
                  onClick={() => {
                    if (negocioLogoUrl) {
                      setVerLogoAbierto(true);
                    } else {
                      toast.info("El negocio todavía no tiene un logo cargado");
                    }
                  }}
                >
                  Ver logo
                </DropdownMenuItem>
                <DropdownMenuItem
                  icon={<Pencil size={16} />}
                  onClick={() => setEditarNegocioAbierto(true)}
                >
                  Editar información
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

           
          </>
        )}
      </div>
    </header>
  );
}
