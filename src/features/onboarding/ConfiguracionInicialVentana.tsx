import { useEffect, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import {
  ArrowRight,
  ArrowRightLeft,
  BellRing,
  BookUser,
  Briefcase,
  Calculator,
  Check,
  CreditCard,
  Eye,
  EyeOff,
  ImagePlus,
  Lock,
  Moon,
  Percent,
  QrCode,
  ShoppingCart,
  Store,
  Sun,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import pandaStockLogo from '../../assets/panda-stock-logo.svg'
import { Button } from '../../components/ui/Button'
import { CapitalizedInput } from '../../components/ui/CapitalizedInput'
import { FieldError } from '../../components/ui/FieldError'
import { ImageDropzone } from '../../components/ui/ImageDropzone'
import { Input } from '../../components/ui/Input'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Switch } from '../../components/ui/Switch'
import { Tooltip } from '../../components/ui/Tooltip'
import { negocioService } from '../../services/negocio.service'
import { seguridadService } from '../../services/seguridad.service'
import { useSettingsStore } from '../../stores/settings.store'
import { useUIStore } from '../../stores/ui.store'
import { MIME_A_EXTENSION, businessSchema, type BusinessSetupValues } from './business.schema'

const CANTIDAD_PASOS = 6

const CHIPS_BIENVENIDA: { label: string; icon: ReactNode }[] = [
  { label: 'Contraseña', icon: <Lock size={16} /> },
  { label: 'Tu negocio', icon: <Store size={16} /> },
  { label: 'Logo', icon: <ImagePlus size={16} /> },
  { label: 'Ventas', icon: <ShoppingCart size={16} /> },
]

interface OpcionRowProps {
  titulo: string
  descripcion: string
  checked: boolean
  onCheckedChange?: (checked: boolean) => void
  icon?: ReactNode
}

function OpcionRow({ titulo, descripcion, checked, onCheckedChange, icon }: OpcionRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && (
          <span className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500">{icon}</span>
        )}
        <div className="min-w-0">
          <strong className="block font-display text-sm font-semibold text-slate-900 dark:text-white">
            {titulo}
          </strong>
          <p className="mt-0.5 text-[13px] leading-snug text-slate-500 dark:text-slate-400">
            {descripcion}
          </p>
        </div>
      </div>
      {onCheckedChange ? (
        <Switch checked={checked} onCheckedChange={onCheckedChange} className="mt-1 shrink-0" />
      ) : null}
    </div>
  )
}

interface GrupoConfiguracionProps {
  icon: ReactNode
  titulo: string
  descripcion: string
  children: ReactNode
}

function GrupoConfiguracion({ icon, titulo, descripcion, children }: GrupoConfiguracionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#111827]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          {icon}
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
            {titulo}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {descripcion}
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  )
}

function ajustarNumeroConfiguracion(
  valor: string,
  predeterminado: number,
  minimo: number,
  maximo: number,
) {
  if (valor.trim() === '') return predeterminado
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return predeterminado
  return Math.min(maximo, Math.max(minimo, numero))
}

export function ConfiguracionInicialVentana() {
  const theme = useUIStore((state) => state.theme)
  const toggleTheme = useUIStore((state) => state.toggleTheme)
  const [paso, setPaso] = useState(0)
  const [nueva, setNueva] = useState('')
  const [repetir, setRepetir] = useState('')
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [logo, setLogo] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const { register, getValues, formState, setError, clearErrors } = useForm<BusinessSetupValues>({
    defaultValues: { nombre: '', logo: null },
  })

  // Configuración de ventas: se aplica recién al aceptar, así un abandono del
  // wizard no cambia la configuración que quedó persistida.
  const [ventasPorCajas, setVentasPorCajas] = useState(
    () => useSettingsStore.getState().ventasPorCajas,
  )
  const [sonidoAlertas, setSonidoAlertas] = useState(
    () => useSettingsStore.getState().sonidoAlertas,
  )
  const [calculadoraVueltoHabilitada, setCalculadoraVueltoHabilitada] = useState(
    () => useSettingsStore.getState().calculadoraVueltoHabilitada,
  )
  const [tarjetaHabilitada, setTarjetaHabilitada] = useState(
    () => useSettingsStore.getState().tarjetaHabilitada,
  )
  const [qrHabilitado, setQrHabilitado] = useState(
    () => useSettingsStore.getState().qrHabilitado,
  )
  const [cuentaCorrienteHabilitada, setCuentaCorrienteHabilitada] = useState(
    () => useSettingsStore.getState().cuentaCorrienteHabilitada,
  )
  const [descuentoAutomatico, setDescuentoAutomatico] = useState(
    () => useSettingsStore.getState().descuentoAutomatico,
  )
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(
    () => String(useSettingsStore.getState().descuentoPorcentaje),
  )
  const [descuentoDesdeUnidades, setDescuentoDesdeUnidades] = useState(
    () => String(useSettingsStore.getState().descuentoDesdeUnidades),
  )
  const [recargoTarjetaCredito, setRecargoTarjetaCredito] = useState(
    () => {
      const valor = useSettingsStore.getState().recargoTarjetaCredito
      return valor > 0 ? String(valor) : ''
    },
  )

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
  }, [theme])

  const coincide = repetir.trim().length > 0 && nueva.trim() === repetir.trim()
  const contrasenaOmitida = nueva.trim().length === 0 && repetir.trim().length === 0
  const contrasenaValida = contrasenaOmitida || (nueva.trim().length > 0 && coincide)
  const esListo = paso === CANTIDAD_PASOS - 1
  const nombreRegister = register('nombre')

  const validarNombre = (): boolean => {
    clearErrors()
    const parsed = businessSchema.safeParse({ nombre: getValues('nombre'), logo: null })
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === 'nombre') setError('nombre', { message: issue.message })
      }
      return false
    }
    return true
  }

  const aceptar = async () => {
    if (guardando) return
    const parsed = businessSchema.safeParse({ nombre: getValues('nombre'), logo })
    if (!parsed.success) return

    setGuardando(true)
    try {
      useSettingsStore.setState({
        ventasPorCajas,
        sonidoAlertas,
        calculadoraVueltoHabilitada,
        tarjetaHabilitada,
        transferenciaHabilitada: true,
        qrHabilitado,
        cuentaCorrienteHabilitada,
        descuentoAutomatico,
        descuentoPorcentaje: ajustarNumeroConfiguracion(descuentoPorcentaje, 10, 0, 90),
        descuentoDesdeUnidades: ajustarNumeroConfiguracion(descuentoDesdeUnidades, 3, 2, 99),
        recargoTarjetaCredito: ajustarNumeroConfiguracion(recargoTarjetaCredito, 0, 0, 100),
      })

      await negocioService.setup({
        nombre: parsed.data.nombre.trim(),
        logo: logo
          ? {
              data: await logo.arrayBuffer(),
              extension: MIME_A_EXTENSION[logo.type] ?? 'png',
            }
          : null,
      })
      const creada = nueva.trim().length === 0 || (await seguridadService.crearContrasena(nueva))
      if (creada || (await seguridadService.tieneContrasena())) {
        await window.electronAPI.configuracion.completada()
      } else {
        toast.error('No se pudo crear la contraseña, intentá de nuevo')
      }
    } catch {
      toast.error('No se pudo guardar la configuración, intentá de nuevo')
    } finally {
      setGuardando(false)
    }
  }

  const avanzar = () => {
    if (paso === 2 && !validarNombre()) return
    if (esListo) {
      void aceptar()
      return
    }
    setPaso((actual) => Math.min(actual + 1, CANTIDAD_PASOS - 1))
  }

  const renderConTitulo = (titulo: string, subtitulo: string, children: ReactNode) => (
    <>
      <div className="mb-5">
        <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {titulo}
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {subtitulo}
        </p>
      </div>
      {children}
    </>
  )

  const renderPaso = () => {
    switch (paso) {
      case 0:
        return (
          <div className="flex flex-col items-center text-center">
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl bg-emerald-500">
              <img
                src={pandaStockLogo}
                alt="Logo de Panda Stock"
                className="h-15 w-15 object-cover"
                draggable={false}
              />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Bienvenido a Panda Stock
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              En los próximos pasos configuramos lo que tu punto de venta necesita para empezar a
              facturar.
            </p>
            <div className="mt-6 grid w-full max-w-xs grid-cols-2 gap-2">
              {CHIPS_BIENVENIDA.map(({ label, icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-700 dark:border-slate-800 dark:bg-[#0B1120] dark:text-slate-200"
                >
                  <span className="text-emerald-500">{icon}</span>
                  {label}
                </div>
              ))}
            </div>
          </div>
        )
      case 1:
        return renderConTitulo(
          'Seguridad opcional',
          'Podés crear una contraseña ahora o configurarla más adelante desde Ajustes. Si la olvidás, podés recuperarla con el PIN maestro de los desarrolladores.',
          <div className="flex flex-col gap-4">
            <Input
              autoFocus
              id="configuracion-inicial-contrasena"
              label="Nueva contraseña"
              type={mostrarContrasena ? 'text' : 'password'}
              placeholder="••••••••"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              leftIcon={<Lock size={16} />}
              rightAction={
                <button
                  type="button"
                  onClick={() => setMostrarContrasena((visible) => !visible)}
                  aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {mostrarContrasena ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
            <Input
              id="configuracion-inicial-repetir"
              label="Repetir contraseña"
              type={mostrarContrasena ? 'text' : 'password'}
              placeholder="••••••••"
              value={repetir}
              onChange={(e) => setRepetir(e.target.value)}
              error={
                repetir.length > 0 && !coincide ? 'Las contraseñas no coinciden' : undefined
              }
              leftIcon={<Lock size={16} />}
              rightAction={
                <button
                  type="button"
                  onClick={() => setMostrarContrasena((visible) => !visible)}
                  aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {mostrarContrasena ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Dejá ambos campos vacíos para continuar sin contraseña.
            </p>
          </div>,
        )
      case 2:
        return renderConTitulo(
          '¿Cómo se llama tu negocio?',
          'Este nombre identifica tu punto de venta en pantalla y en los tickets.',
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="configuracion-inicial-nombre"
              className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Nombre del negocio
            </label>
            <CapitalizedInput
              id="configuracion-inicial-nombre"
              placeholder="Ej: Almacén La Esquina"
              autoFocus
              {...nombreRegister}
              onChange={(e) => {
                nombreRegister.onChange(e)
                clearErrors('nombre')
              }}
              onClear={() => clearErrors('nombre')}
            />
            <FieldError error={formState.errors.nombre?.message} />
          </div>,
        )
      case 3:
        return renderConTitulo(
          'Agregá el logo',
          'Opcional: aparece en el encabezado y en los tickets. Podés cambiarlo más adelante.',
          <ImageDropzone value={logo} onChange={setLogo} />,
        )
      case 4:
        return renderConTitulo(
          'Ventas y alertas',
          'Organizá caja, descuentos, medios de pago y notificaciones. Podés cambiar estos ajustes más adelante.',
          <div className="space-y-4">
            <GrupoConfiguracion
              icon={<Briefcase size={19} />}
              titulo="Caja y operación"
              descripcion="Definí cómo se registran los turnos y el cobro en efectivo."
            >
              <OpcionRow
                icon={<Briefcase size={17} />}
                titulo="Control por caja y turnos"
                descripcion="Pide abrir una caja antes de vender y hacer el cierre al terminar el turno."
                checked={ventasPorCajas}
                onCheckedChange={setVentasPorCajas}
              />
              <OpcionRow
                icon={<Calculator size={17} />}
                titulo="Calculadora de vuelto"
                descripcion="Muestra el cálculo del vuelto al cobrar en efectivo."
                checked={calculadoraVueltoHabilitada}
                onCheckedChange={setCalculadoraVueltoHabilitada}
              />
            </GrupoConfiguracion>

            <GrupoConfiguracion
              icon={<Percent size={19} />}
              titulo="Descuento mayorista"
              descripcion="Aplicá un descuento automático cuando el cliente lleva varias unidades."
            >
              <OpcionRow
                icon={<Percent size={17} />}
                titulo="Aplicar descuento por cantidad"
                descripcion="El POS ajusta el precio automáticamente al alcanzar el mínimo."
                checked={descuentoAutomatico}
                onCheckedChange={setDescuentoAutomatico}
              />
              {descuentoAutomatico && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/70 dark:bg-emerald-950/20">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Descuento"
                      type="number"
                      min={0}
                      max={90}
                      value={descuentoPorcentaje}
                      placeholder="10"
                      onChange={(evento) => setDescuentoPorcentaje(evento.target.value)}
                      onWheel={(evento) => evento.currentTarget.blur()}
                      rightAction={<span className="pr-2 text-sm font-semibold text-slate-400">%</span>}
                    />
                    <Input
                      label="Desde unidades"
                      type="number"
                      min={2}
                      max={99}
                      value={descuentoDesdeUnidades}
                      placeholder="3"
                      onChange={(evento) => setDescuentoDesdeUnidades(evento.target.value)}
                      onWheel={(evento) => evento.currentTarget.blur()}
                    />
                  </div>
                  <p className="mt-2.5 flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                    <ShoppingCart size={14} />
                    {descuentoPorcentaje || '—'}% de descuento desde{' '}
                    {descuentoDesdeUnidades || '—'} unidades
                  </p>
                </div>
              )}
            </GrupoConfiguracion>

            <GrupoConfiguracion
              icon={<Wallet size={19} />}
              titulo="Medios de pago"
              descripcion="Elegí qué opciones aparecen al cobrar. El efectivo queda siempre disponible."
            >
              <OpcionRow
                icon={<ArrowRightLeft size={17} />}
                titulo="Transferencia"
                descripcion="Disponible junto con efectivo."
                checked
              />
              <OpcionRow
                icon={<QrCode size={17} />}
                titulo="QR"
                descripcion="Muestra el pago con QR como opción independiente al cobrar."
                checked={qrHabilitado}
                onCheckedChange={setQrHabilitado}
              />
              <OpcionRow
                icon={<CreditCard size={17} />}
                titulo="Tarjeta de débito y crédito"
                descripcion="Muestra tarjeta como opción de pago en el ticket."
                checked={tarjetaHabilitada}
                onCheckedChange={setTarjetaHabilitada}
              />
              {tarjetaHabilitada && (
                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <Input
                    label="Recargo en tarjeta de crédito"
                    type="number"
                    min={0}
                    max={100}
                    value={recargoTarjetaCredito}
                    placeholder="Sin recargo"
                    onChange={(evento) => setRecargoTarjetaCredito(evento.target.value)}
                    onWheel={(evento) => evento.currentTarget.blur()}
                    rightAction={<span className="pr-2 text-sm font-semibold text-slate-400">%</span>}
                  />
                </div>
              )}
            </GrupoConfiguracion>

            <GrupoConfiguracion
              icon={<BookUser size={19} />}
              titulo="Ventas a cuenta corriente"
              descripcion="Registrá ventas con saldo pendiente y hacé su seguimiento por cliente."
            >
              <OpcionRow
                icon={<BookUser size={17} />}
                titulo="Habilitar cuenta corriente"
                descripcion="Permite registrar ventas con saldo pendiente y habilita las cuentas corrientes."
                checked={cuentaCorrienteHabilitada}
                onCheckedChange={setCuentaCorrienteHabilitada}
              />
            </GrupoConfiguracion>

            <GrupoConfiguracion
              icon={<BellRing size={19} />}
              titulo="Sonidos de alerta"
              descripcion="Elegí si Panda Stock reproduce sonidos cuando llegan alertas y notificaciones."
            >
              <OpcionRow
                icon={<BellRing size={17} />}
                titulo="Reproducir sonidos"
                descripcion="Activa o silencia los sonidos de las alertas de la aplicación."
                checked={sonidoAlertas}
                onCheckedChange={setSonidoAlertas}
              />
            </GrupoConfiguracion>
          </div>,
        )
      default:
        return renderConTitulo(
          'Todo listo',
          'Aceptá y entrá a Panda Stock.',
          <div className="rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800/60">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                <Store size={15} className="text-emerald-500" />
                Negocio
              </span>
              <span className="truncate text-[13px] font-medium text-slate-500 dark:text-slate-400">
                {getValues('nombre')?.trim() || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800/60">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                <Lock size={15} className="text-emerald-500" />
                Contraseña
              </span>
              <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                {nueva.trim().length > 0 ? 'Configurada' : 'Sin contraseña'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800/60">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                <ShoppingCart size={15} className="text-emerald-500" />
                Caja por turnos
              </span>
              <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                {ventasPorCajas ? 'Activada' : 'Desactivada'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                <BellRing size={15} className="text-emerald-500" />
                Sonidos de alerta
              </span>
              <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                {sonidoAlertas ? 'Activados' : 'Desactivados'}
              </span>
            </div>
          </div>,
        )
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100">
      <header className="z-10 flex h-18 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 text-slate-900 shadow-md dark:border-slate-800 dark:bg-[#111827] dark:text-slate-200 md:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-emerald-500">
            <img
              src={pandaStockLogo}
              alt="Logo de Panda Stock"
              className="h-9 w-9 object-cover"
              draggable={false}
            />
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-display text-[14px] font-bold text-slate-900 dark:text-white sm:text-[15px]">
              PANDA STOCK
            </span>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Punto de venta
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {paso > 0 && paso < CANTIDAD_PASOS - 1 && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              Paso {paso} de {CANTIDAD_PASOS - 1}
            </span>
          )}
          <Tooltip content={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="grid cursor-pointer place-items-center rounded-full p-1 text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
            >
              {theme === 'dark' ? (
                <Sun className="h-6 w-6 text-amber-400" />
              ) : (
                <Moon className="h-6 w-6 text-blue-700" />
              )}
            </button>
          </Tooltip>
        </div>
      </header>

      <div className="shrink-0 px-5 pt-4">
        <ProgressBar value={((paso + 1) / CANTIDAD_PASOS) * 100} />
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto w-full max-w-2xl">
            <form id="configuracion-inicial-form" onSubmit={(e) => { e.preventDefault(); avanzar() }}>
              {renderPaso()}
            </form>
          </div>
        </main>

      <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800/80">
        {paso > 0 && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPaso((actual) => actual - 1)}
            disabled={guardando}
          >
            Volver
          </Button>
        )}
        {paso === 0 ? (
          <Button type="submit" form="configuracion-inicial-form" icon={<ArrowRight size={16} />}>
            Comenzar
          </Button>
        ) : esListo ? (
          <Button
            type="submit"
            form="configuracion-inicial-form"
            loading={guardando}
            icon={<Check size={16} />}
          >
            Aceptar
          </Button>
        ) : (
          <Button
            type="submit"
            form="configuracion-inicial-form"
            disabled={paso === 1 && !contrasenaValida}
            icon={<ArrowRight size={16} />}
          >
            Siguiente
          </Button>
        )}
      </footer>
    </div>
  )
}
