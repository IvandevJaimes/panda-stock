import { useEffect, useRef, useState, type DragEvent } from 'react'
import { z } from 'zod'
import { useForm, type Resolver, type ResolverResult } from 'react-hook-form'
import {
  Check,
  Clipboard,
  FileKey2,
  FolderOpen,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { Toaster, toast } from 'sonner'
import pandaStockLogo from '../../assets/panda-stock-logo.svg'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import { licenciaService } from '../../services/licencia.service'
import { toErrorMessage } from '../../services/errors'
import { useUIStore } from '../../stores/ui.store'
import type { EstadoLicencia } from '../../../electron/licencia/tipos'

const esquemaLicencia = z.object({
  contenido: z.string()
    .trim()
    .min(1, 'Pegá el contenido de la licencia o seleccioná un archivo.')
    .max(20_000, 'El archivo supera el tamaño permitido de 20 KB.')
    .refine((contenido) => {
      try {
        const documento: unknown = JSON.parse(contenido)
        return typeof documento === 'object' && documento !== null && !Array.isArray(documento)
      } catch {
        return false
      }
    }, 'El contenido debe ser un archivo JSON de licencia válido.'),
})

type FormularioLicencia = z.infer<typeof esquemaLicencia>

const resolverLicencia: Resolver<FormularioLicencia> = async (
  valores,
): Promise<ResolverResult<FormularioLicencia>> => {
  const resultado = esquemaLicencia.safeParse(valores)
  if (resultado.success) return { values: resultado.data, errors: {} }
  return {
    values: {},
    errors: {
      contenido: {
        type: 'zod',
        message: resultado.error.issues[0]?.message ?? 'Revisá el contenido de la licencia.',
      },
    },
  }
}

const MOTIVOS_LICENCIA: Record<string, string> = {
  FIRMA_INVALIDA: 'La firma no es válida. Pedí una licencia nueva a soporte.',
  EQUIPO_NO_COINCIDE: 'Esta licencia fue emitida para otro equipo.',
  VERSION_NO_SOPORTADA: 'La licencia necesita una versión más reciente de Panda Stock.',
  ESTRUCTURA_INVALIDA: 'El archivo no tiene un formato de licencia válido.',
  ALMACENAMIENTO: 'No se pudo guardar la licencia en este equipo.',
}

export function LicenciaVentana() {
  const theme = useUIStore((state) => state.theme)
  const [estado, setEstado] = useState<EstadoLicencia | null>(null)
  const [huella, setHuella] = useState('')
  const [cargando, setCargando] = useState(true)
  const [copiando, setCopiando] = useState(false)
  const [activando, setActivando] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const [nombreArchivo, setNombreArchivo] = useState('')
  const selectorArchivo = useRef<HTMLInputElement>(null)
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<FormularioLicencia>({
    defaultValues: { contenido: '' },
    resolver: resolverLicencia,
    mode: 'onChange',
  })
  const campoLicencia = register('contenido')

  useEffect(() => {
    let activa = true
    void Promise.all([licenciaService.obtenerHuella(), licenciaService.obtenerEstado()])
      .then(([idEquipo, estadoActual]) => {
        if (!activa) return
        setHuella(idEquipo)
        setEstado(estadoActual)
      })
      .catch((error: unknown) => {
        if (activa) toast.error(toErrorMessage(error))
      })
      .finally(() => {
        if (activa) setCargando(false)
      })
    return () => { activa = false }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
  }, [theme])

  async function copiarHuella() {
    if (!huella) return
    setCopiando(true)
    try {
      await navigator.clipboard.writeText(huella)
      toast.success('ID de equipo copiado')
    } catch (error) {
      toast.error(toErrorMessage(error))
    } finally {
      setCopiando(false)
    }
  }

  async function cargarArchivo(archivo: File | undefined) {
    if (!archivo) return
    if (archivo.size > 20_000) {
      setError('contenido', { type: 'validate', message: 'El archivo supera el tamaño permitido de 20 KB.' })
      return
    }
    try {
      const contenido = await archivo.text()
      setValue('contenido', contenido, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
      setNombreArchivo(archivo.name)
      await trigger('contenido')
    } catch {
      setError('contenido', { type: 'validate', message: 'No se pudo leer el archivo seleccionado.' })
    }
  }

  async function activar(valores: FormularioLicencia) {
    clearErrors('contenido')
    setActivando(true)
    try {
      const estadoActual = await licenciaService.activar(valores.contenido)
      setEstado(estadoActual)
      if (estadoActual.estado !== 'valida') {
        throw new Error('Panda Stock no pudo validar esta licencia.')
      }
      toast.success('Licencia activada para este equipo')
      await licenciaService.completar()
    } catch (error) {
      const mensaje = toErrorMessage(error)
      const codigo = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
        ? error.code
        : ''
      toast.error(MOTIVOS_LICENCIA[codigo] ?? mensaje)
    } finally {
      setActivando(false)
    }
  }

  function recibirArchivo(evento: DragEvent<HTMLElement>) {
    evento.preventDefault()
    setArrastrando(false)
    void cargarArchivo(evento.dataTransfer.files.item(0) ?? undefined)
  }

  const motivo = estado?.motivo ? MOTIVOS_LICENCIA[estado.motivo] : undefined
  const licenciaValida = estado?.estado === 'valida'

  return (
    <main className="h-screen overflow-hidden bg-slate-100 text-slate-800 dark:bg-[#0b0f17] dark:text-slate-100">
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden px-4 py-4 sm:px-8 sm:py-5">
        <header className="flex flex-col items-center gap-1.5">
          <img src={pandaStockLogo} alt="Logo de Panda Stock" className="h-20 w-20 object-contain" />
          <p className="font-display text-base font-bold text-secondary dark:text-white">Panda Stock</p>
        </header>

        <div className="flex min-h-0 flex-1 items-center overflow-y-auto py-3 sm:py-4">
          <section className="mx-auto w-full max-w-2xl space-y-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-secondary dark:text-white sm:text-3xl">
                {licenciaValida ? 'Licencia activada' : 'Activá Panda Stock'}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {licenciaValida
                  ? `Este equipo está habilitado${estado?.licenciado ? ` para ${estado.licenciado}` : ''}.`
                  : 'Enviá tu ID de equipo a soporte y luego cargá la licencia que recibas.'}
              </p>
            </div>

            <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#111827] sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-secondary dark:text-white">1. Enviá tu ID de equipo</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Soporte lo necesita para preparar tu licencia.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={<Clipboard size={15} />}
                  disabled={cargando || !huella || copiando}
                  loading={copiando}
                  onClick={() => void copiarHuella()}
                >
                  Copiar ID
                </Button>
              </div>
              <input
                id="id-equipo"
                aria-label="ID de equipo para copiar"
                readOnly
                value={cargando ? 'Generando ID…' : huella || 'No disponible'}
                onFocus={(evento) => evento.currentTarget.select()}
                onClick={(evento) => evento.currentTarget.select()}
                className="h-11 w-full select-text rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              {estado?.advertencia && <p className="mt-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">{estado.advertencia}</p>}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#111827] sm:p-5">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-secondary dark:text-white">2. Cargá la licencia</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Pegá el texto recibido o arrastrá el archivo aquí.
                </p>
              </div>

              {licenciaValida ? (
                <div role="status" className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck size={18} />
                  <span>La licencia ya está guardada en este equipo.</span>
                </div>
              ) : (
                <>
                  {motivo && (
                    <div role="alert" className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                      <TriangleAlert size={17} className="mt-0.5 shrink-0" />
                      <span>{motivo}</span>
                    </div>
                  )}

                  <form className="space-y-3" onSubmit={(evento) => void handleSubmit(activar)(evento)}>
                    <input
                      ref={selectorArchivo}
                      type="file"
                      accept=".lic,.json,.txt,application/json,text/plain"
                      className="sr-only"
                      onChange={(evento) => void cargarArchivo(evento.currentTarget.files?.item(0) ?? undefined)}
                      tabIndex={-1}
                    />

                    <div
                      onDragEnter={(evento) => { evento.preventDefault(); setArrastrando(true) }}
                      onDragOver={(evento) => { evento.preventDefault(); setArrastrando(true) }}
                      onDragLeave={(evento) => {
                        if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) setArrastrando(false)
                      }}
                      onDrop={recibirArchivo}
                      className={cn(
                        'rounded-lg border border-dashed p-3 transition-colors',
                        arrastrando
                          ? 'border-primary bg-emerald-50 dark:bg-emerald-950/30'
                          : 'border-slate-300 dark:border-slate-700',
                      )}
                    >
                      <label htmlFor="contenido-licencia" className="sr-only">Contenido de la licencia</label>
                      <textarea
                        id="contenido-licencia"
                        rows={7}
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="Pegá aquí el texto de la licencia con Ctrl+V"
                        aria-invalid={Boolean(errors.contenido)}
                        aria-describedby={errors.contenido ? 'error-licencia' : undefined}
                        {...campoLicencia}
                        onChange={(evento) => {
                          setNombreArchivo('')
                          void campoLicencia.onChange(evento)
                        }}
                        className="h-40 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2.5 font-mono text-xs leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-[#0b0f17] dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                      {nombreArchivo && <p className="mt-2 truncate text-xs text-slate-600 dark:text-slate-300">Archivo seleccionado: {nombreArchivo}</p>}
                      {errors.contenido && <p id="error-licencia" role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.contenido.message}</p>}
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        icon={<FolderOpen size={16} />}
                        onClick={() => selectorArchivo.current?.click()}
                        disabled={activando}
                      >
                        Seleccionar archivo
                      </Button>
                      <Button type="submit" icon={<FileKey2 size={16} />} loading={activando} disabled={cargando || activando}>
                        Activar licencia
                      </Button>
                    </div>
                  </form>
                </>
              )}

              {licenciaValida && (
                <div className="mt-4 flex justify-end">
                  <Button type="button" icon={<Check size={16} />} onClick={() => void licenciaService.completar()}>
                    Continuar
                  </Button>
                </div>
              )}
            </section>
          </section>
        </div>

      </div>
      <Toaster position="bottom-left" theme={theme} richColors />
    </main>
  )
}
