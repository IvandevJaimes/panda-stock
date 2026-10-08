import { useEffect, useState, type ReactNode } from "react";
import { Briefcase, Headset, Percent, Shield, Volume2, Wallet, X, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "../ui/Switch";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useSettingsStore } from "../../stores/settings.store";
import { useCajaStore } from "../../stores/caja.store";
import { useUIStore } from "../../stores/ui.store";
import { seguridadService } from "../../services/seguridad.service";
import { ModalContrasena } from "../../features/seguridad/ModalContrasena";
import { toErrorMessage } from "../../services/errors";
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

interface FormuarioContrasenaProps {
  modo: "crear" | "cambiar";
  onGuardar: (actual: string, nueva: string) => Promise<boolean>;
  onCambio: () => void;
  onCancelar: () => void;
}

function FormularioContrasena({ modo, onGuardar, onCambio, onCancelar }: FormuarioContrasenaProps) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [guardando, setGuardando] = useState(false);

  const coincide = repetir.length > 0 && nueva === repetir;
  const puedeGuardar =
    nueva.length > 0 &&
    coincide &&
    !guardando &&
    (modo === "crear" || actual.length > 0);

  async function manejarGuardar() {
    if (!puedeGuardar) return;
    setGuardando(true);
    try {
      const cambio = await onGuardar(actual, nueva);
      if (cambio) {
        toast.success(
          modo === "crear"
            ? "Contraseña creada. Ya se pide al abrir reportes, cuentas y anulaciones."
            : "Contraseña actualizada",
        );
        setActual("");
        setNueva("");
        setRepetir("");
        onCambio();
      } else {
        toast.error(
          modo === "crear"
            ? "No se pudo crear la contraseña"
            : "La contraseña actual es incorrecta",
        );
        setRepetir("");
      }
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
      <p className="mb-3 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
        {modo === "crear" ? "Crear contraseña" : "Cambiar contraseña"}
      </p>
      <div className="space-y-2.5">
        {modo === "cambiar" && (
          <Input
            label="Contraseña actual"
            type="password"
            placeholder="••••••••"
            value={actual}
            onChange={(evento) => setActual(evento.target.value)}
          />
        )}
        <Input
          label="Nueva contraseña"
          type="password"
          placeholder="••••••••"
          value={nueva}
          onChange={(evento) => setNueva(evento.target.value)}
        />
        <Input
          label="Repetir nueva contraseña"
          type="password"
          placeholder="••••••••"
          value={repetir}
          onChange={(evento) => setRepetir(evento.target.value)}
          error={repetir.length > 0 && !coincide ? "Las contraseñas no coinciden" : undefined}
        />
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="flex-1"
          onClick={onCancelar}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1"
          loading={guardando}
          disabled={!puedeGuardar}
          onClick={manejarGuardar}
        >
          {modo === "crear" ? "Crear contraseña" : "Cambiar contraseña"}
        </Button>
      </div>
    </div>
  );
}

export function SettingsDrawer() {
  const isOpen = useUIStore((state) => state.isRightSidebarOpen);
  const closeRightSidebar = useUIStore((state) => state.closeRightSidebar);
  const ventasPorCajas = useSettingsStore((state) => state.ventasPorCajas);
  const setVentasPorCajas = useSettingsStore(
    (state) => state.setVentasPorCajas,
  );
  const sonidoAlertas = useSettingsStore((state) => state.sonidoAlertas);
  const setSonidoAlertas = useSettingsStore((state) => state.setSonidoAlertas);
  const tarjetaHabilitada = useSettingsStore((state) => state.tarjetaHabilitada);
  const setTarjetaHabilitada = useSettingsStore(
    (state) => state.setTarjetaHabilitada,
  );
  const recargoTarjetaCredito = useSettingsStore(
    (state) => state.recargoTarjetaCredito,
  );
  const setRecargoTarjetaCredito = useSettingsStore(
    (state) => state.setRecargoTarjetaCredito,
  );
  const cuentaCorrienteHabilitada = useSettingsStore(
    (state) => state.cuentaCorrienteHabilitada,
  );
  const setCuentaCorrienteHabilitada = useSettingsStore(
    (state) => state.setCuentaCorrienteHabilitada,
  );
  const descuentoAutomatico = useSettingsStore(
    (state) => state.descuentoAutomatico,
  );
  const setDescuentoAutomatico = useSettingsStore(
    (state) => state.setDescuentoAutomatico,
  );
  const descuentoPorcentaje = useSettingsStore(
    (state) => state.descuentoPorcentaje,
  );
  const setDescuentoPorcentaje = useSettingsStore(
    (state) => state.setDescuentoPorcentaje,
  );
  const descuentoDesdeUnidades = useSettingsStore(
    (state) => state.descuentoDesdeUnidades,
  );
  const setDescuentoDesdeUnidades = useSettingsStore(
    (state) => state.setDescuentoDesdeUnidades,
  );
  const pedidoContrasenaHabilitado = useSettingsStore(
    (state) => state.pedidoContrasenaHabilitado,
  );
  const setPedidoContrasenaHabilitado = useSettingsStore(
    (state) => state.setPedidoContrasenaHabilitado,
  );

  const cajaAbierta = useCajaStore((state) => state.caja);

  const [existeContrasena, setExisteContrasena] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [verificandoApagado, setVerificandoApagado] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let vigente = true;
    seguridadService
      .tieneContrasena()
      .then((existe) => {
        if (vigente) setExisteContrasena(existe);
      })
      .catch(() => {
        /* Sin contraseña detectable se muestra el form de crear. */
      });
    return () => {
      vigente = false;
    };
  }, [isOpen]);

  // Apagar el control con una caja ya abierta no la cierra: el turno sigue
  // vivo hasta que se rinda, y el botón de caja permanece en el encabezado.
  const alternarVentasPorCajas = (activado: boolean) => {
    setVentasPorCajas(activado);
    if (!activado && cajaAbierta !== null) {
      toast.warning(
        "Se desactivó el control por caja; la caja abierta sigue activa hasta que la cierres.",
      );
    }
  };

  const alternarPedidoContrasena = (activado: boolean) => {
    if (activado) {
      setPedidoContrasenaHabilitado(true);
      return;
    }

    if (existeContrasena) {
      setVerificandoApagado(true);
      return;
    }
    setPedidoContrasenaHabilitado(false);
    setMostrarFormulario(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRightSidebar();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeRightSidebar]);

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
          <DrawerSection title="Caja y ventas" icon={Briefcase}>
            <SettingRow
              title="Ventas por cajas / turnos"
              description="Exige abrir caja antes de cobrar y cerrarla al final de la jornada. Desactivado, se cobra sin apertura ni rendición de caja."
              checked={ventasPorCajas}
              onCheckedChange={alternarVentasPorCajas}
            />
          </DrawerSection>

          <DrawerSection title="Descuentos" icon={Percent}>
            <div className="space-y-4">
              <SettingRow
                title="Descuento automático por cantidad"
                description="Aplica el mayoreo en el ticket al alcanzar la cantidad indicada. Desactivado, cada unidad se cobra a precio de lista."
                checked={descuentoAutomatico}
                onCheckedChange={setDescuentoAutomatico}
              />
              {descuentoAutomatico && (
                <div className="grid grid-cols-2 items-end gap-3">
                  <Input
                    label="Descuento (%)"
                    type="number"
                    min={0}
                    max={90}
                    value={descuentoPorcentaje}
                    onChange={(evento) => {
                      const valor = evento.target.valueAsNumber;
                      if (!Number.isNaN(valor)) setDescuentoPorcentaje(valor);
                    }}
                  />
                  <Input
                    label="Cantidad mínima"
                    type="number"
                    min={2}
                    max={99}
                    value={descuentoDesdeUnidades}
                    onChange={(evento) => {
                      const valor = evento.target.valueAsNumber;
                      if (!Number.isNaN(valor)) setDescuentoDesdeUnidades(valor);
                    }}
                  />
                </div>
              )}
            </div>
          </DrawerSection>

          <DrawerSection title="Medios de pago" icon={Wallet}>
            <div className="space-y-5">
              <SettingRow
                title="Tarjeta"
                description="Muestra los botones de tarjeta de débito y de crédito entre los métodos de pago del ticket."
                checked={tarjetaHabilitada}
                onCheckedChange={setTarjetaHabilitada}
              />
              {tarjetaHabilitada && (
                <Input
                  label="Recargo tarjeta de crédito (%)"
                  type="number"
                  min={0}
                  max={100}
                  value={recargoTarjetaCredito}
                  onChange={(evento) => {
                    const valor = evento.target.valueAsNumber;
                    if (!Number.isNaN(valor)) setRecargoTarjetaCredito(valor);
                  }}
                />
              )}
              <SettingRow
                title="Cuenta corriente"
                description="Permite fiar ventas desde el ticket y habilita la pestaña de cuentas corrientes."
                checked={cuentaCorrienteHabilitada}
                onCheckedChange={setCuentaCorrienteHabilitada}
              />
            </div>
          </DrawerSection>

          <DrawerSection title="Seguridad" icon={Shield}>
            <div className="space-y-3">
              <SettingRow
                title="Pedir contraseña"
                description="Pide la contraseña al abrir reportes, cuentas corrientes y al anular una venta. Sin contraseña creada, esas pantallas abren sin pedir nada."
                checked={pedidoContrasenaHabilitado}
                onCheckedChange={alternarPedidoContrasena}
              />
              {pedidoContrasenaHabilitado && (
                mostrarFormulario ? (
                  existeContrasena ? (
                    <FormularioContrasena
                      modo="cambiar"
                      onGuardar={(actual, nueva) => seguridadService.changePin(actual, nueva)}
                      onCambio={() => setMostrarFormulario(false)}
                      onCancelar={() => setMostrarFormulario(false)}
                    />
                  ) : (
                    <FormularioContrasena
                      modo="crear"
                      onGuardar={(_, nueva) => seguridadService.crearContrasena(nueva)}
                      onCambio={() => {
                        setExisteContrasena(true);
                        setMostrarFormulario(false);
                      }}
                      onCancelar={() => setMostrarFormulario(false)}
                    />
                  )
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    onClick={() => setMostrarFormulario(true)}
                  >
                    {existeContrasena ? "Cambiar contraseña" : "Crear contraseña"}
                  </Button>
                )
              )}
            </div>
          </DrawerSection>

          <DrawerSection title="Notificaciones" icon={Volume2}>
            <SettingRow
              title="Sonido de alertas"
              description="Reproduce un sonido breve cuando llega una notificación nueva."
              checked={sonidoAlertas}
              onCheckedChange={setSonidoAlertas}
            />
          </DrawerSection>

          <DrawerSection title="Soporte técnico" icon={Headset}>
            <ul className="space-y-2.5">
              <li className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                  Ivan Jaimes
                </span>
                <span className="text-[13px] tabular-nums text-slate-500 dark:text-slate-400">
                  3813415138
                </span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                  Christian Rios
                </span>
                <span className="text-[13px] tabular-nums text-slate-500 dark:text-slate-400">
                  3816609713
                </span>
              </li>
            </ul>
          </DrawerSection>
        </div>
      </aside>

      {verificandoApagado && (
        <ModalContrasena
          titulo="Desactivar pedido de contraseña"
          subtitulo="Ingresá tu contraseña (o la maestra) para confirmar."
          etiquetaCancelar="Cancelar"
          onSubmit={async (contrasena) => {
            const valida = await seguridadService.verifyPin(contrasena);
            if (valida) {
              setPedidoContrasenaHabilitado(false);
              setMostrarFormulario(false);
              setVerificandoApagado(false);
            }
            return valida;
          }}
          onCancelar={() => setVerificandoApagado(false)}
        />
      )}
    </>
  );
}
