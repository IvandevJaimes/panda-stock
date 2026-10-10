import { useEffect, useState, type ReactNode } from 'react'
import { Briefcase, Building2, ImagePlus, LogOut, Pencil, Settings, Volume2, Wallet, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Switch } from '../ui/Switch'
import { useSettingsStore } from '../../stores/settings.store'
import { useCajaStore } from '../../stores/caja.store'
import { useUIStore } from '../../stores/ui.store'
import { cn } from '../../lib/cn'
import { Tooltip } from '../ui/Tooltip'
import { ImageLightbox } from '../ui/ImageLightbox'
import { BusinessSetupModal } from '../../features/onboarding/BusinessSetupModal'
import { BusinessLogoPicker } from '../../features/onboarding/BusinessLogoPicker'
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

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRightSidebar()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closeRightSidebar])

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
