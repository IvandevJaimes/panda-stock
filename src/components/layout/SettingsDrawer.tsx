import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Sun,
  TrendingUp,
  Volume2,
  X,
  type LucideIcon,
} from "lucide-react";
import { Switch } from "../ui/Switch";
import { useSettingsStore } from "../../stores/settings.store";
import { useUIStore } from "../../stores/ui.store";
import { cn } from "../../lib/cn";

interface SettingRowProps {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function SettingRow({
  title,
  description,
  checked,
  onCheckedChange,
}: SettingRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <strong className="block font-display text-sm font-semibold text-slate-900 dark:text-white">
          {title}
        </strong>
        <p className="mt-0.5 text-[13px] leading-snug text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-1 shrink-0"
      />
    </div>
  );
}

interface DrawerSectionProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}

function DrawerSection({ title, icon: Icon, children }: DrawerSectionProps) {
  return (
    <section className="px-5 py-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Icon size={15} />
        </span>
        <h3 className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

export function SettingsDrawer() {
  const navigate = useNavigate();
  const isOpen = useUIStore((state) => state.isRightSidebarOpen);
  const closeRightSidebar = useUIStore((state) => state.closeRightSidebar);
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const ventasPorCajas = useSettingsStore((state) => state.ventasPorCajas);
  const setVentasPorCajas = useSettingsStore(
    (state) => state.setVentasPorCajas,
  );
  const sonidoAlertas = useSettingsStore((state) => state.sonidoAlertas);
  const setSonidoAlertas = useSettingsStore((state) => state.setSonidoAlertas);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRightSidebar();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeRightSidebar]);

  const handleVerReportes = () => {
    closeRightSidebar();
    navigate("/reports");
  };

  return (
    <>
      {/* ── Backdrop (cierra al hacer click afuera) ── */}
      <div
        onClick={closeRightSidebar}
        aria-hidden
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* ── Drawer ── */}
      <aside
        aria-hidden={!isOpen}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-[340px] max-w-[90vw] flex-col",
          "border-l border-slate-200 bg-white text-slate-900",
          "dark:border-slate-800/80 dark:bg-[#0f172a] dark:text-slate-200",
          "shadow-2xl shadow-black/20 dark:shadow-black/40 transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800/80">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Configuración
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Personalizá Panda Stock
            </p>
          </div>
          <button
            onClick={closeRightSidebar}
            aria-label="Cerrar panel de configuración"
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center cursor-pointer rounded-xl",
              "border border-slate-200 bg-slate-100 text-slate-600",
              "transition-colors duration-150 hover:bg-slate-200 hover:text-slate-900",
              "dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300",
              "dark:hover:bg-slate-800/60 dark:hover:text-white",
            )}
          >
            <X size={18} />
          </button>
        </div>

        {/* Secciones */}
        <div className="flex-1 divide-y divide-slate-200 overflow-y-auto dark:divide-slate-800/60">
          <DrawerSection title="Apariencia" icon={Sun}>
            <SettingRow
              title="Tema oscuro"
              description="Activa o desactiva el modo oscuro de toda la aplicación."
              checked={theme === "dark"}
              onCheckedChange={() => toggleTheme()}
            />
          </DrawerSection>

          <DrawerSection title="Caja y ventas" icon={Briefcase}>
            <SettingRow
              title="Ventas por cajas / turnos"
              description="Obliga a abrir una caja y registrar el turno antes de cobrar."
              checked={ventasPorCajas}
              onCheckedChange={setVentasPorCajas}
            />
          </DrawerSection>

          <DrawerSection title="Notificaciones" icon={Volume2}>
            <SettingRow
              title="Sonido de alertas"
              description="Emite un sonido cuando llega una alerta roja o naranja."
              checked={sonidoAlertas}
              onCheckedChange={setSonidoAlertas}
            />
          </DrawerSection>
        </div>

        {/* Acción principal */}
        <div className="border-t border-slate-200 p-5 dark:border-slate-800/80">
          <button
            type="button"
            onClick={handleVerReportes}
            className={cn(
              "flex h-11 w-full items-center justify-center gap-2 rounded-xl",
              "bg-emerald-500 font-display text-sm font-bold text-slate-950",
              "transition-colors duration-150 hover:bg-emerald-400",
            )}
          >
            <TrendingUp size={18} />
            Ver reportes
          </button>
        </div>
      </aside>
    </>
  );
}
