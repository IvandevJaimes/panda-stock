import { useEffect, useState, type ReactNode } from 'react'
import { AlignLeft, Briefcase, Building2, DatabaseBackup, Image, ImagePlus, LogOut, Pencil, Printer, Ruler, Settings, Volume2, Wallet, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { Switch } from '../ui/Switch'
import { useSettingsStore } from '../../stores/settings.store'
import { useCajaStore } from '../../stores/caja.store'
import { useUIStore } from '../../stores/ui.store'
import { cn } from '../../lib/cn'
import { Tooltip } from '../ui/Tooltip'
import { ImageLightbox } from '../ui/ImageLightbox'
import { BusinessSetupModal } from '../../features/onboarding/BusinessSetupModal'
import { BusinessLogoPicker } from '../../features/onboarding/BusinessLogoPicker'
import { CopiasSeguridadModal } from '../../features/settings/CopiasSeguridadModal'
import { useNegocioStore } from '../../stores/negocio.store'
import packageInfo from '../../../package.json'

function formatearFecha(iso: string | null): string {
  if (!iso) return '—'
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })
}

function BasicSetting({ title, description, checked, onCheckedChange, icon }: {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  icon: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500">{icon}</span>
        <div className="min-w-0">
          <strong className="block text-sm font-semibold text-slate-900 dark:text-white">{title}</strong>
          <p className="mt-0.5 text-xs leading-snug text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} className="mt-1 shrink-0" />
    </div>
  )
}

function TicketPreview({ compact }: { compact: boolean }) {
  return (
    <div className="flex min-h-64 items-start justify-center rounded-xl bg-slate-100 p-3 dark:bg-slate-950/60">
      <div className={cn('w-full bg-white px-3 py-4 font-mono text-slate-800 shadow-md shadow-slate-900/10', compact ? 'max-w-36' : 'max-w-52 px-4')}>
        <div className="text-center">
          <p className={cn('font-sans font-extrabold tracking-tight text-slate-900', compact ? 'text-xs' : 'text-sm')}>PANDA STOCK</p>
          <p className="mt-1 text-[9px] text-slate-500">Comprobante de venta</p>
          <p className="mt-1 text-[8px] text-slate-500">11/10/2026 · 10:42</p>
        </div>
        <div className="my-3 border-t border-dashed border-slate-300" />
        <div className="space-y-2 text-[9px]">
          <div className="flex justify-between gap-2"><span className="truncate">2 × Crema facial</span><span>$ 8.400</span></div>
          <div className="flex justify-between gap-2"><span className="truncate">1 × Máscara pestañas</span><span>$ 3.200</span></div>
        </div>
        <div className="my-3 border-t border-dashed border-slate-300" />
        <div className="flex justify-between gap-2 text-[10px] font-bold"><span>TOTAL</span><span>$ 11.600</span></div>
        <p className="mt-3 text-center text-[8px] text-slate-500">¡Gracias por tu compra!</p>
      </div>
    </div>
  )
}

export function SettingsDrawer() {
  const isOpen = useUIStore((state) => state.isRightSidebarOpen)
  const closeRightSidebar = useUIStore((state) => state.closeRightSidebar)
  const openSettings = useUIStore((state) => state.openSettings)
  const cajaAbierta = useCajaStore((state) => state.caja)
  const ventasPorCajas = useSettingsStore((state) => state.ventasPorCajas)
  const setVentasPorCajas = useSettingsStore((state) => state.setVentasPorCajas)
  const calculadoraVuelto = useSettingsStore((state) => state.calculadoraVueltoHabilitada)
  const setCalculadoraVuelto = useSettingsStore((state) => state.setCalculadoraVueltoHabilitada)
  const sonidoAlertas = useSettingsStore((state) => state.sonidoAlertas)
  const setSonidoAlertas = useSettingsStore((state) => state.setSonidoAlertas)
  const negocioNombre = useNegocioStore((state) => state.nombre)
  const negocioLogoUrl = useNegocioStore((state) => state.logoUrl)
  const negocioCreadoEn = useNegocioStore((state) => state.creadoEn)
  const negocioActualizadoEn = useNegocioStore((state) => state.actualizadoEn)
  const setNegocio = useNegocioStore((state) => state.setNegocio)
  const [editarNegocioAbierto, setEditarNegocioAbierto] = useState(false)
  const [verLogoAbierto, setVerLogoAbierto] = useState(false)
  const [copiasAbiertas, setCopiasAbiertas] = useState(false)
  const [personalizacionTicketAbierta, setPersonalizacionTicketAbierta] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRightSidebar()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closeRightSidebar])

  function openBackupModal() {
    closeRightSidebar()
    setCopiasAbiertas(true)
  }

  function openAdvancedSettings() {
    closeRightSidebar()
    openSettings()
  }

  function toggleCashRegister(enabled: boolean) {
    setVentasPorCajas(enabled)
    if (!enabled && cajaAbierta !== null) {
      toast.warning('Se desactivó el control por caja; la caja abierta sigue activa hasta que la cierres.')
    }
  }

  async function exitApplication() {
    try {
      await window.electronAPI.app.salir()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cerrar Panda Stock')
    }
  }

  return (
    <>
      <ImageLightbox
        open={verLogoAbierto && negocioLogoUrl !== null}
        onClose={() => setVerLogoAbierto(false)}
        src={negocioLogoUrl ?? ''}
        alt="Logo del negocio"
      />
      <BusinessSetupModal
        isOpen={editarNegocioAbierto}
        closable
        onClose={() => setEditarNegocioAbierto(false)}
        initialNombre={negocioNombre}
        initialLogoUrl={negocioLogoUrl}
        onSuccess={(negocio) => {
          setNegocio(negocio)
          setEditarNegocioAbierto(false)
        }}
      />
      <CopiasSeguridadModal
        isOpen={copiasAbiertas}
        onClose={() => setCopiasAbiertas(false)}
      />
      <Modal
        isOpen={personalizacionTicketAbierta}
        onClose={() => setPersonalizacionTicketAbierta(false)}
        title="Personalizar ticket"
        subtitle="Vista previa de las opciones previstas"
        headerIcon={<Printer size={18} />}
        maxWidth="xl"
        footer={<Button type="button" variant="outline" onClick={() => setPersonalizacionTicketAbierta(false)}>Cerrar</Button>}
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/25">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"><Ruler size={16} /></span>
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Personalización en desarrollo</p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-800/80 dark:text-amber-300/80">Estas opciones son una vista previa. Todavía no se guardan ni modifican la impresión.</p>
            </div>
          </div>

          <fieldset disabled>
            <legend className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Elegí el ancho del papel</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="min-w-0 cursor-not-allowed rounded-xl border border-emerald-300 bg-emerald-50/50 p-2.5 dark:border-emerald-900/70 dark:bg-emerald-950/15">
                <TicketPreview compact />
                <span className="mt-2 flex items-center justify-between gap-2 px-1">
                  <span className="flex items-center gap-2">
                    <input type="radio" name="medida-ticket" checked readOnly className="accent-emerald-600" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">Compacto</span>
                  </span>
                  <span className="text-[11px] font-bold tabular-nums text-slate-500 dark:text-slate-400">58 mm</span>
                </span>
              </label>
              <label className="min-w-0 cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/40">
                <TicketPreview compact={false} />
                <span className="mt-2 flex items-center justify-between gap-2 px-1">
                  <span className="flex items-center gap-2">
                    <input type="radio" name="medida-ticket" className="accent-emerald-600" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">Estándar</span>
                  </span>
                  <span className="text-[11px] font-bold tabular-nums text-slate-500 dark:text-slate-400">80 mm</span>
                </span>
              </label>
            </div>
          </fieldset>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Otras opciones previstas</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400"><Image size={16} /><span>Mostrar logo del negocio</span></div>
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400"><AlignLeft size={16} /><span>Editar encabezado y pie</span></div>
            </div>
          </div>
        </div>
      </Modal>
      <div onClick={closeRightSidebar} aria-hidden className={cn('fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300', isOpen ? 'opacity-100' : 'pointer-events-none opacity-0')} />
      <aside aria-hidden={!isOpen} className={cn('fixed right-0 top-0 z-50 flex h-full w-[400px] max-w-[90vw] flex-col border-l border-slate-200 bg-slate-50 text-slate-900 shadow-2xl shadow-black/20 transition-transform duration-300 ease-out dark:border-slate-800 dark:bg-[#0B1120] dark:text-slate-200 dark:shadow-black/40', isOpen ? 'translate-x-0' : 'translate-x-full')}>
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#111827]">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Configuración</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Preferencias básicas</p>
          </div>
          <button type="button" onClick={closeRightSidebar} aria-label="Cerrar panel de configuración" className="grid h-9 w-9 cursor-pointer place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800"><X size={18} /></button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <Button type="button" variant="outline" className="w-full" icon={<DatabaseBackup size={17} />} onClick={openBackupModal}>Copias de seguridad</Button>
          <Button type="button" className="w-full" icon={<Settings size={17} />} onClick={openAdvancedSettings}>Configuración avanzada</Button>

          <Card title="Información del negocio" description="Datos y logo del punto de venta." className="space-y-3">
            <div className="flex items-center gap-3">
              <BusinessLogoPicker>
                {({ openFilePicker, isUploading }) => (
                  <Tooltip content={negocioLogoUrl ? 'Ver logo' : 'Agregar logo'} placement="top">
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => negocioLogoUrl ? setVerLogoAbierto(true) : openFilePicker()}
                      aria-label={negocioLogoUrl ? 'Ver logo del negocio' : 'Agregar logo del negocio'}
                      className="grid h-20 w-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl border border-slate-200 bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                    >
                      {negocioLogoUrl ? (
                        <img src={negocioLogoUrl} alt="Logo del negocio" className="h-full w-full object-cover" draggable={false} />
                      ) : (
                        <ImagePlus size={21} aria-hidden="true" />
                      )}
                    </button>
                  </Tooltip>
                )}
              </BusinessLogoPicker>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Nombre</p>
                <p className="truncate font-display text-sm font-semibold text-slate-900 dark:text-white">
                  {negocioNombre || 'Sin nombre configurado'}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="min-w-0">
                <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Creado</dt>
                <dd className="mt-0.5 truncate text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                  {formatearFecha(negocioCreadoEn)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Última actualización</dt>
                <dd className="mt-0.5 truncate text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                  {formatearFecha(negocioActualizadoEn)}
                </dd>
              </div>
            </dl>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              icon={negocioLogoUrl ? <Pencil size={15} /> : <Building2 size={15} />}
              onClick={() => setEditarNegocioAbierto(true)}
            >
              Editar información
            </Button>
          </Card>

          <Card title="Caja y cobro" description="Opciones para el uso diario del punto de venta." className="space-y-3">
            <BasicSetting icon={<Briefcase size={17} />} title="Ventas por cajas / turnos" description="Requiere abrir y cerrar caja por turno." checked={ventasPorCajas} onCheckedChange={toggleCashRegister} />
            <BasicSetting icon={<Wallet size={17} />} title="Calculadora de vuelto" description="Calcula el vuelto en pagos en efectivo." checked={calculadoraVuelto} onCheckedChange={setCalculadoraVuelto} />
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500"><Printer size={17} /></span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Impresión de tickets</p>
                    <p className="mt-0.5 text-xs leading-snug text-slate-500 dark:text-slate-400">Imprimí el comprobante al finalizar una venta.</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">Próximamente</span>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Activar impresión</span>
                <Switch checked={false} onCheckedChange={() => undefined} disabled aria-label="Activar impresión de tickets, próximamente" />
              </div>
              <fieldset disabled className="mt-3 space-y-2 opacity-60">
                <legend className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Al imprimir un ticket</legend>
                <label className="flex cursor-not-allowed items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                  <input type="radio" name="modo-impresion-ticket" checked readOnly className="mt-0.5 accent-emerald-600" />
                  <span>
                    <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">Preguntar siempre</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-slate-500 dark:text-slate-400">Confirmar antes de imprimir cada comprobante.</span>
                  </span>
                </label>
                <label className="flex cursor-not-allowed items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/40">
                  <input type="radio" name="modo-impresion-ticket" className="mt-0.5 accent-emerald-600" />
                  <span>
                    <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">No preguntar</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-slate-500 dark:text-slate-400">Imprimir automáticamente al finalizar la venta.</span>
                  </span>
                </label>
              </fieldset>
              <Button type="button" variant="outline" size="sm" className="mt-3 w-full" icon={<Ruler size={15} />} onClick={() => setPersonalizacionTicketAbierta(true)}>
                Personalizar ticket
              </Button>
            </div>
          </Card>

          <Card title="Notificaciones" description="Elegí si querés escuchar alertas." className="space-y-3">
            <BasicSetting icon={<Volume2 size={17} />} title="Sonido de alertas" description="Notificaciones y alertas de stock." checked={sonidoAlertas} onCheckedChange={setSonidoAlertas} />
          </Card>

          <Card title="Soporte técnico" description="Contactanos si necesitás ayuda.">
            <ul className="space-y-2 text-[13px]">
              <li className="flex justify-between gap-3"><span className="font-medium text-slate-700 dark:text-slate-200">Ivan Jaimes</span><span className="tabular-nums text-slate-500 dark:text-slate-400">3813415138</span></li>
              <li className="flex justify-between gap-3"><span className="font-medium text-slate-700 dark:text-slate-200">Christian Rios</span><span className="tabular-nums text-slate-500 dark:text-slate-400">3816609713</span></li>
            </ul>
          </Card>

          <Button
            type="button"
            variant="outline"
            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
            icon={<LogOut size={16} />}
            onClick={() => void exitApplication()}
          >
            Salir de la aplicación
          </Button>
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 text-center dark:border-slate-800 dark:bg-[#111827]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Versión {packageInfo.version}</p>
          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">© {new Date().getFullYear()} Panda Stock. Todos los derechos reservados.</p>
        </footer>
      </aside>
    </>
  )
}
