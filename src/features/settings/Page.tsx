import { useEffect, useState, type ReactNode } from 'react'
import {
  ArrowRightLeft,
  BookUser,
  CreditCard,
  KeyRound,
  Percent,
  QrCode,
  Save,
  Settings,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { Switch } from '../../components/ui/Switch'
import { Modal } from '../../components/ui/Modal'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { ModalContrasena } from '../seguridad/ModalContrasena'
import { ModalRecuperarContrasena } from '../seguridad/ModalRecuperarContrasena'
import { seguridadService } from '../../services/seguridad.service'
import { toErrorMessage } from '../../services/errors'
import { useSettingsStore } from '../../stores/settings.store'
import { useUIStore } from '../../stores/ui.store'
import {
  CLAVES_PROTECCION,
  type ClaveProteccion,
  type ProteccionesSeguridad,
} from '../../types/security'
import { cn } from '../../lib/cn'

const OPCIONES_PROTECCION: {
  key: ClaveProteccion
  title: string
  description: string
}[] = [
  { key: 'reportes', title: 'Reportes', description: 'Información de ventas y caja.' },
  { key: 'cuentasCorrientes', title: 'Cuentas corrientes', description: 'Saldos y movimientos.' },
  { key: 'anularVentas', title: 'Anular ventas', description: 'Autorizar cada anulación.' },
  { key: 'eliminarProductos', title: 'Eliminar productos', description: 'Productos y sus lotes.' },
  { key: 'eliminarLotes', title: 'Eliminar lotes', description: 'Lotes e historial de stock.' },
  { key: 'eliminarCategorias', title: 'Eliminar categorías', description: 'Organización del catálogo.' },
  { key: 'eliminarMarcas', title: 'Eliminar marcas', description: 'Marcas del catálogo.' },
]

interface SettingRowProps {
  title: string
  description: string
  checked: boolean
  onCheckedChange?: (checked: boolean) => void
  icon?: ReactNode
  disabled?: boolean
}

function SettingRow({ title, description, checked, onCheckedChange, icon, disabled }: SettingRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex min-w-0 items-start gap-3">
        {icon && <span className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500">{icon}</span>}
        <div className="min-w-0">
          <strong className="block font-display text-sm font-semibold text-slate-900 dark:text-white">{title}</strong>
          <p className="mt-0.5 text-[13px] leading-snug text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      {onCheckedChange && (
        <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} className="mt-1 shrink-0" />
      )}
    </div>
  )
}

function SettingsSection({ title, description, children }: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card title={title} description={description} className="space-y-3">
      {children}
    </Card>
  )
}

function PasswordForm({ mode, onSave, onChange, onCancel, onForgot }: {
  mode: 'create' | 'change'
  onSave: (current: string, next: string) => Promise<boolean>
  onChange: () => void
  onCancel: () => void
  onForgot?: () => void
}) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [saving, setSaving] = useState(false)
  const matches = repeat.trim().length > 0 && next.trim() === repeat.trim()
  const canSave = next.trim().length > 0 && matches && !saving && (mode === 'create' || current.trim().length > 0)

  async function save() {
    if (!canSave) return
    setSaving(true)
    try {
      const changed = await onSave(current, next)
      if (changed) {
        toast.success(mode === 'create' ? 'Contraseña creada' : 'Contraseña actualizada')
        onChange()
      } else {
        toast.error(mode === 'create' ? 'No se pudo crear la contraseña' : 'La contraseña actual es incorrecta')
        setRepeat('')
      }
    } catch (error) {
      toast.error(toErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title={mode === 'create' ? 'Crear contraseña' : 'Cambiar contraseña'}
      subtitle="Protegé el acceso a las funciones que elijas"
      headerIcon={<KeyRound size={18} />}
      maxWidth="md"
      footer={<>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="button" loading={saving} disabled={!canSave} onClick={() => void save()}>{mode === 'create' ? 'Crear contraseña' : 'Guardar contraseña'}</Button>
      </>}
    >
      <div className="space-y-4">
        {mode === 'change' && <PasswordInput label="Contraseña actual" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} />}
        {mode === 'change' && onForgot && <button type="button" onClick={onForgot} className="-mt-3 self-start cursor-pointer text-sm font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300">Olvidé mi contraseña</button>}
        <PasswordInput label="Nueva contraseña" autoComplete="new-password" value={next} onChange={(event) => setNext(event.target.value)} />
        <PasswordInput label="Repetir nueva contraseña" autoComplete="new-password" value={repeat} onChange={(event) => setRepeat(event.target.value)} error={repeat.length > 0 && !matches ? 'Las contraseñas no coinciden' : undefined} />
      </div>
    </Modal>
  )
}

function PasswordRecoveryInfo({ onCancel, onSuccess }: {
  onCancel: () => void
  onSuccess: (pinNuevo: string) => void
}) {
  return <ModalRecuperarContrasena onCancel={onCancel} onSuccess={onSuccess} />
}

export function SecuritySettingsPanel({
  protecciones,
  onChange,
}: {
  protecciones: ProteccionesSeguridad
  onChange: (protecciones: ProteccionesSeguridad) => void
}) {
  const [hasPassword, setHasPassword] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showRecoveryForm, setShowRecoveryForm] = useState(false)

  useEffect(() => {
    let active = true
    void seguridadService.tieneContrasena().then((exists) => { if (active) setHasPassword(exists) }).catch(() => undefined)
    return () => { active = false }
  }, [])

  return (
    <>
      <SettingsSection title="Seguridad y autorizaciones" description="La contraseña es opcional. Al configurarla, elegí qué información o acciones deben pedirla.">
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-sm font-bold text-slate-900 dark:text-white">Contraseña del negocio</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{hasPassword ? 'Configurada. Podés elegir qué proteger.' : 'Sin contraseña. Las protecciones permanecen inactivas.'}</p>
              </div>
              <span className={cn('rounded-full px-3 py-1 text-xs font-bold', hasPassword ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>{hasPassword ? 'Configurada' : 'Opcional'}</span>
            </div>
            {showPasswordForm ? <div className="mt-4"><PasswordForm mode={hasPassword ? 'change' : 'create'} onSave={(current, next) => hasPassword ? seguridadService.changePin(current, next) : seguridadService.crearContrasena(next)} onChange={() => { if (!hasPassword) { setHasPassword(true); useSettingsStore.getState().setContrasenaConfigurada(true) } setShowPasswordForm(false) }} onCancel={() => setShowPasswordForm(false)} onForgot={() => { setShowPasswordForm(false); setShowRecoveryForm(true) }} /></div> : <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => { setShowRecoveryForm(false); setShowPasswordForm(true) }}>{hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'}</Button>
            </div>}
            {showRecoveryForm && <PasswordRecoveryInfo onCancel={() => setShowRecoveryForm(false)} onSuccess={() => {
              setHasPassword(true)
              useSettingsStore.getState().setContrasenaConfigurada(true)
              setShowRecoveryForm(false)
            }} />}
            <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Si olvidás la contraseña, soporte puede emitir una clave vinculada a esta instalación.</p>
          </div>
          <div className="space-y-3">
            {OPCIONES_PROTECCION.map(({ key, title, description }) => <SettingRow key={key} title={title} description={description} checked={protecciones[key]} onCheckedChange={(enabled) => onChange({ ...protecciones, [key]: enabled })} disabled={!hasPassword} />)}
          </div>
        </div>
      </SettingsSection>
    </>
  )
}

type AjustesDraft = {
  descuentoAutomatico: boolean
  descuentoPorcentaje: number
  descuentoDesdeUnidades: number
  qrHabilitado: boolean
  tarjetaHabilitada: boolean
  recargoTarjetaCredito: number
  cuentaCorrienteHabilitada: boolean
  proteccionesSeguridad: ProteccionesSeguridad
}

export function SettingsPage() {
  const isSettingsOpen = useUIStore((state) => state.isSettingsOpen)
  const closeSettings = useUIStore((state) => state.closeSettings)
  const tarjetaHabilitada = useSettingsStore((state) => state.tarjetaHabilitada)
  const qrHabilitado = useSettingsStore((state) => state.qrHabilitado)
  const cuentaCorrienteHabilitada = useSettingsStore((state) => state.cuentaCorrienteHabilitada)
  const recargoTarjetaCredito = useSettingsStore((state) => state.recargoTarjetaCredito)
  const descuentoAutomatico = useSettingsStore((state) => state.descuentoAutomatico)
  const descuentoPorcentaje = useSettingsStore((state) => state.descuentoPorcentaje)
  const descuentoDesdeUnidades = useSettingsStore((state) => state.descuentoDesdeUnidades)
  const proteccionesSeguridad = useSettingsStore((state) => state.proteccionesSeguridad)
  const contrasenaConfigurada = useSettingsStore((state) => state.contrasenaConfigurada)

  // Borrador local: los cambios no tocan el store hasta "Guardar cambios".
  const [draft, setDraft] = useState<AjustesDraft>(() => ({
    descuentoAutomatico,
    descuentoPorcentaje,
    descuentoDesdeUnidades,
    qrHabilitado,
    tarjetaHabilitada,
    recargoTarjetaCredito,
    cuentaCorrienteHabilitada,
    proteccionesSeguridad: { ...proteccionesSeguridad },
  }))

  // Los inputs numéricos editan texto y recién al salir del campo se vuelcan al
  // borrador: un valor a medio escribir no marca "hay cambios" en el guardado.
  const [discountInput, setDiscountInput] = useState(String(descuentoPorcentaje))
  const [minimumInput, setMinimumInput] = useState(String(descuentoDesdeUnidades))
  const [cardSurchargeInput, setCardSurchargeInput] = useState(recargoTarjetaCredito > 0 ? String(recargoTarjetaCredito) : '')

  const [mostrarPin, setMostrarPin] = useState(false)
  const [confirmarSalida, setConfirmarSalida] = useState(false)

  const proteccionesCambiadas = CLAVES_PROTECCION.some(
    (clave) => draft.proteccionesSeguridad[clave] !== proteccionesSeguridad[clave],
  )

  const hayCambios =
    draft.descuentoAutomatico !== descuentoAutomatico ||
    draft.descuentoPorcentaje !== descuentoPorcentaje ||
    draft.descuentoDesdeUnidades !== descuentoDesdeUnidades ||
    draft.qrHabilitado !== qrHabilitado ||
    draft.tarjetaHabilitada !== tarjetaHabilitada ||
    draft.recargoTarjetaCredito !== recargoTarjetaCredito ||
    draft.cuentaCorrienteHabilitada !== cuentaCorrienteHabilitada ||
    proteccionesCambiadas

  function actualizar<K extends keyof AjustesDraft>(clave: K, valor: AjustesDraft[K]) {
    setDraft((actual) => ({ ...actual, [clave]: valor }))
  }

  function cerrarDeVerdad() {
    // Al ser overlay (no ruta) alcanza con apagar el flag: la página de atrás
    // nunca se desmontó, así que no hay adónde "volver".
    closeSettings()
  }

  // Cerrar con cambios pendientes pide confirmación para no perderlos.
  function intentarCerrar() {
    if (hayCambios) {
      setConfirmarSalida(true)
      return
    }
    cerrarDeVerdad()
  }

  async function aplicarCambios(pin?: string) {
    const store = useSettingsStore.getState()
    if (proteccionesCambiadas) {
      const proteccionesGuardadas = await seguridadService.setProtecciones(draft.proteccionesSeguridad, pin)
      store.setProteccionesSeguridad(proteccionesGuardadas)
    }
    store.setDescuentoAutomatico(draft.descuentoAutomatico)
    store.setDescuentoPorcentaje(draft.descuentoPorcentaje)
    store.setDescuentoDesdeUnidades(draft.descuentoDesdeUnidades)
    store.setQrHabilitado(draft.qrHabilitado)
    store.setTarjetaHabilitada(draft.tarjetaHabilitada)
    store.setRecargoTarjetaCredito(draft.recargoTarjetaCredito)
    store.setCuentaCorrienteHabilitada(draft.cuentaCorrienteHabilitada)

    // Re-sincroniza borrador e inputs con los valores ya normalizados por los
    // setters (clamp de rangos), para que "guardar" vuelva a deshabilitarse.
    const siguiente = useSettingsStore.getState()
    setDraft({
      descuentoAutomatico: siguiente.descuentoAutomatico,
      descuentoPorcentaje: siguiente.descuentoPorcentaje,
      descuentoDesdeUnidades: siguiente.descuentoDesdeUnidades,
      qrHabilitado: siguiente.qrHabilitado,
      tarjetaHabilitada: siguiente.tarjetaHabilitada,
      recargoTarjetaCredito: siguiente.recargoTarjetaCredito,
      cuentaCorrienteHabilitada: siguiente.cuentaCorrienteHabilitada,
      proteccionesSeguridad: { ...siguiente.proteccionesSeguridad },
    })
    setDiscountInput(String(siguiente.descuentoPorcentaje))
    setMinimumInput(String(siguiente.descuentoDesdeUnidades))
    setCardSurchargeInput(siguiente.recargoTarjetaCredito > 0 ? String(siguiente.recargoTarjetaCredito) : '')
    setMostrarPin(false)
    toast.success('Configuración guardada')
    closeSettings()
  }

  async function guardar() {
    if (!hayCambios) return
    // Solo los ajustes de seguridad exigen confirmar la contraseña al guardar.
    if (proteccionesCambiadas && contrasenaConfigurada) {
      setMostrarPin(true)
      return
    }
    try {
      await aplicarCambios()
    } catch (error) {
      toast.error(toErrorMessage(error))
    }
  }

  return (
    <>
      <Modal
        isOpen={isSettingsOpen}
        onClose={intentarCerrar}
        title="Configuración avanzada"
        subtitle="Ventas, medios de pago, cuentas corrientes y seguridad"
        headerIcon={<Settings size={18} />}
        maxWidth="2xl"
        height="h-[82vh]"
        footer={<>
          <Button type="button" variant="outline" onClick={intentarCerrar}>Listo</Button>
          <Button type="button" icon={<Save size={16} />} disabled={!hayCambios} onClick={() => void guardar()}>Guardar cambios</Button>
        </>}
      >
        <div className="space-y-5">
          <SettingsSection title="Descuento mayorista" description="Definí cuándo se aplica el descuento por cantidad.">
            <SettingRow title="Descuento automático por cantidad" description="Se aplica al alcanzar el mínimo de unidades configurado." checked={draft.descuentoAutomatico} onCheckedChange={(activo) => actualizar('descuentoAutomatico', activo)} icon={<Percent size={17} />} />
            {draft.descuentoAutomatico && <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Descuento (%)" type="number" min={0} max={90} value={discountInput} placeholder="10" className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" onChange={(event) => setDiscountInput(event.target.value)} onBlur={(event) => { const value = event.target.value; if (value !== '' && Number.isFinite(Number(value))) actualizar('descuentoPorcentaje', Number(value)) }} onWheel={(event) => event.currentTarget.blur()} />
              <Input label="Cantidad mínima" type="number" min={2} max={99} value={minimumInput} placeholder="3" className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" onChange={(event) => setMinimumInput(event.target.value)} onBlur={(event) => { const value = event.target.value; if (value !== '' && Number.isFinite(Number(value))) actualizar('descuentoDesdeUnidades', Number(value)) }} onWheel={(event) => event.currentTarget.blur()} />
            </div>}
          </SettingsSection>

          <SettingsSection title="Medios de pago" description="Elegí qué opciones ofrecer al cobrar.">
            <SettingRow icon={<Wallet size={17} />} title="Efectivo" description="Disponible en todas las ventas." checked />
            <SettingRow icon={<ArrowRightLeft size={17} />} title="Transferencia" description="Disponible en todas las ventas." checked />
            <SettingRow icon={<QrCode size={17} />} title="QR" description="Muestra QR como método de pago." checked={draft.qrHabilitado} onCheckedChange={(activo) => actualizar('qrHabilitado', activo)} />
            <SettingRow icon={<CreditCard size={17} />} title="Tarjeta" description="Muestra débito y crédito." checked={draft.tarjetaHabilitada} onCheckedChange={(activo) => actualizar('tarjetaHabilitada', activo)} />
            {draft.tarjetaHabilitada && <Input label="Recargo de tarjeta de crédito (%)" type="number" min={0} max={100} value={cardSurchargeInput} placeholder="Sin recargo" className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" onChange={(event) => setCardSurchargeInput(event.target.value)} onBlur={(event) => { const value = event.target.value; actualizar('recargoTarjetaCredito', value !== '' && Number.isFinite(Number(value)) ? Number(value) : 0) }} onWheel={(event) => event.currentTarget.blur()} />}
          </SettingsSection>

          <SettingsSection title="Ventas con saldo pendiente" description="Administrá las ventas registradas en cuenta corriente.">
            <SettingRow icon={<BookUser size={17} />} title="Cuenta corriente" description="Permite registrar ventas con saldo pendiente y administrar los saldos por cliente." checked={draft.cuentaCorrienteHabilitada} onCheckedChange={(activo) => actualizar('cuentaCorrienteHabilitada', activo)} />
          </SettingsSection>

          <SecuritySettingsPanel protecciones={draft.proteccionesSeguridad} onChange={(protecciones) => actualizar('proteccionesSeguridad', protecciones)} />
        </div>
      </Modal>

      {mostrarPin && (
        <ModalContrasena
          titulo="Confirmar cambios de seguridad"
          subtitulo="Ingresá tu contraseña para guardar los cambios en las protecciones."
          etiquetaCancelar="Cancelar"
          etiquetaConfirmar="Guardar cambios"
          onSubmit={(contrasena) => seguridadService.verifyPin(contrasena)}
          onSuccess={(contrasena) => aplicarCambios(contrasena)}
          onCancelar={() => setMostrarPin(false)}
        />
      )}

      <ConfirmModal
        isOpen={confirmarSalida}
        onClose={() => setConfirmarSalida(false)}
        onConfirm={cerrarDeVerdad}
        title="Descartar cambios"
        description="Hay cambios sin guardar. Si salís ahora, se perderán."
        confirmText="Descartar y salir"
        cancelText="Seguir editando"
      />
    </>
  )
}
