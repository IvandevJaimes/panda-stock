import { useEffect, useState } from 'react'
import { DatabaseBackup, FolderOpen, HardDrive, RotateCcw, TriangleAlert, Usb } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { Modal } from '../../components/ui/Modal'
import { Switch } from '../../components/ui/Switch'
import { CajaAbiertaModal } from '../caja/AvisoCajaAbierta'
import { copiasSeguridadService } from '../../services/copias-seguridad.service'
import { toErrorMessage } from '../../services/errors'
import { cn } from '../../lib/cn'
import { useCajaStore } from '../../stores/caja.store'
import { usePosTicketsStore } from '../../stores/pos-tickets.store'
import type { ConfiguracionCopias, EstadoDestinoCopias, TipoDestinoCopias } from '../../../electron/db/types'

const CONFIGURACION_INICIAL: ConfiguracionCopias = {
  carpeta: null,
  carpetas: { pc: null, extraible: null },
  automatica: false,
  tipoDestino: 'pc',
}
const TIPOS_DESTINO: readonly TipoDestinoCopias[] = ['pc', 'extraible']
const ETIQUETAS_DESTINO: Record<TipoDestinoCopias, string> = {
  pc: 'Esta PC',
  extraible: 'Unidad extraíble',
}

async function verificarTodosLosDestinos(): Promise<Record<TipoDestinoCopias, EstadoDestinoCopias>> {
  const [pc, extraible] = await Promise.all([
    copiasSeguridadService.verificarDestino('pc'),
    copiasSeguridadService.verificarDestino('extraible'),
  ])
  return { pc, extraible }
}

export function CopiasSeguridadModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [configuracion, setConfiguracion] = useState(CONFIGURACION_INICIAL)
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [archivoRestaurar, setArchivoRestaurar] = useState<string | null>(null)
  const [estadosDestinos, setEstadosDestinos] = useState<Record<TipoDestinoCopias, EstadoDestinoCopias> | null>(null)
  const [avisoCajaAbierta, setAvisoCajaAbierta] = useState(false)
  const cajaAbierta = useCajaStore((state) => state.caja)

  useEffect(() => {
    if (!isOpen) return
    let activa = true
    void copiasSeguridadService.obtenerConfiguracion()
      .then(async (resultado) => {
        if (!activa) return
        setConfiguracion(resultado)
        const estados = await verificarTodosLosDestinos()
        if (activa) setEstadosDestinos(estados)
      })
      .catch((error: unknown) => { if (activa) toast.error(toErrorMessage(error)) })
      .finally(() => { if (activa) setCargando(false) })
    return () => { activa = false }
  }, [isOpen])

  async function verificarDisponibilidad(tipoDestino = configuracion.tipoDestino): Promise<EstadoDestinoCopias> {
    const estados = await verificarTodosLosDestinos()
    setEstadosDestinos(estados)
    return estados[tipoDestino]
  }

  async function guardar(siguiente: ConfiguracionCopias) {
    setOcupado(true)
    try {
      const guardada = await copiasSeguridadService.guardarConfiguracion(siguiente)
      setConfiguracion(guardada)
      setEstadosDestinos(await verificarTodosLosDestinos())
      return true
    } catch (error) {
      toast.error(toErrorMessage(error))
      setEstadosDestinos(await verificarTodosLosDestinos())
      return false
    } finally {
      setOcupado(false)
    }
  }

  async function elegirCarpeta() {
    try {
      const carpeta = await copiasSeguridadService.seleccionarCarpeta(configuracion.tipoDestino)
      if (!carpeta) return
      if (await guardar({
        ...configuracion,
        carpeta,
        carpetas: { ...configuracion.carpetas, [configuracion.tipoDestino]: carpeta },
      })) {
        toast.success('Carpeta de copias configurada')
      }
    } catch (error) {
      toast.error(toErrorMessage(error))
    }
  }

  async function cambiarTipoDestino(tipoDestino: TipoDestinoCopias) {
    if (tipoDestino === configuracion.tipoDestino) return
    await guardar({
      ...configuracion,
      carpeta: configuracion.carpetas[tipoDestino],
      tipoDestino,
    })
  }

  async function cambiarAutomatico(automatica: boolean) {
    if (await guardar({ ...configuracion, automatica })) {
      toast.success(automatica ? 'Copia automática activada' : 'Copia automática desactivada')
    }
  }

  async function crearCopia() {
    setOcupado(true)
    try {
      const estado = await verificarDisponibilidad()
      if (!estado.disponible) {
        toast.error(estado.mensaje ?? 'La carpeta de copias no está disponible.')
        return
      }
      const ruta = await copiasSeguridadService.crear()
      toast.success(`Copia creada: ${ruta.split(/[\\/]/).pop() ?? ruta}`)
    } catch (error) {
      toast.error(toErrorMessage(error))
    } finally {
      setOcupado(false)
    }
  }

  async function elegirRestauracion() {
    if (cajaAbierta) {
      setAvisoCajaAbierta(true)
      return
    }
    setOcupado(true)
    try {
      const estado = await verificarDisponibilidad()
      if (!estado.disponible) {
        toast.error(estado.mensaje ?? 'La carpeta de copias no está disponible.')
        return
      }
      const archivo = await copiasSeguridadService.seleccionarRestauracion(configuracion.tipoDestino)
      if (archivo) setArchivoRestaurar(archivo)
    } catch (error) {
      toast.error(toErrorMessage(error))
    } finally {
      setOcupado(false)
    }
  }

  async function restaurar() {
    if (!archivoRestaurar) return
    if (cajaAbierta) {
      setArchivoRestaurar(null)
      setAvisoCajaAbierta(true)
      return
    }
    const storeTickets = usePosTicketsStore.getState()
    const ticketsAnteriores = {
      tickets: storeTickets.tickets,
      activeTicketId: storeTickets.activeTicketId,
    }
    let ticketsVaciados = false
    try {
      const estado = await verificarDisponibilidad()
      if (!estado.disponible) {
        throw new Error(estado.mensaje ?? 'La carpeta de copias no está disponible.')
      }
      storeTickets.vaciarPersistencia()
      ticketsVaciados = true
      await copiasSeguridadService.restaurar(archivoRestaurar, configuracion.tipoDestino)
    } catch (error) {
      if (ticketsVaciados) usePosTicketsStore.setState(ticketsAnteriores)
      if (error instanceof Error && error.message.includes('Cerrá la caja antes de restaurar')) {
        setArchivoRestaurar(null)
        setAvisoCajaAbierta(true)
        return
      }
      toast.error(toErrorMessage(error))
      throw error
    }
  }

  const destinosNoDisponibles = estadosDestinos
    ? TIPOS_DESTINO.filter((tipo) => !estadosDestinos[tipo].disponible)
    : []

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        closeable={archivoRestaurar === null}
        title="Copias de seguridad"
        subtitle="Elegí dónde guardar, crear o restaurar las copias del negocio."
        headerIcon={<DatabaseBackup size={18} />}
        maxWidth="lg"
        footer={
          <>
            <Button type="button" variant="outline" icon={<RotateCcw size={15} />} disabled={cargando || ocupado || !configuracion.carpeta} onClick={() => void elegirRestauracion()}>
              Restaurar copia
            </Button>
            <Button type="button" icon={<DatabaseBackup size={15} />} disabled={cargando || ocupado || !configuracion.carpeta} loading={ocupado} onClick={() => void crearCopia()}>
              Crear copia ahora
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="grid gap-2 sm:grid-cols-2" aria-label="Ubicación de las copias">
              {([
                { tipo: 'extraible', etiqueta: 'Unidad extraíble', icono: <Usb size={16} /> },
                { tipo: 'pc', etiqueta: 'Esta PC', icono: <HardDrive size={16} /> },
              ] as const).map(({ tipo, etiqueta, icono }) => (
                <button
                  key={tipo}
                  type="button"
                  aria-pressed={configuracion.tipoDestino === tipo}
                  disabled={cargando || ocupado}
                  onClick={() => void cambiarTipoDestino(tipo)}
                  className={cn(
                    'flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                    configuracion.tipoDestino === tipo
                      ? 'border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800',
                  )}
                >
                  {icono}{etiqueta}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <HardDrive size={18} className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" />
                <div className="min-w-0">
                  <p className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                    {configuracion.tipoDestino === 'extraible' ? 'Carpeta de la unidad extraíble' : 'Carpeta de esta PC'}
                  </p>
                  <p className="mt-1 break-all text-[13px] text-slate-500 dark:text-slate-400">
                    {cargando ? 'Cargando…' : configuracion.carpeta ?? 'Sin configurar'}
                  </p>
                </div>
              </div>
              <Button type="button" size="sm" variant="outline" icon={<FolderOpen size={15} />} disabled={cargando || ocupado} onClick={() => void elegirCarpeta()}>
                {configuracion.carpeta ? 'Cambiar carpeta' : 'Elegir carpeta'}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex min-w-0 items-start gap-3">
                <DatabaseBackup size={18} className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" />
                <div>
                  <p className="font-display text-sm font-semibold text-slate-900 dark:text-white">Copia automática al cerrar</p>
                  <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
                    {configuracion.automatica ? 'Se guardará una copia cada vez que cierres Panda Stock.' : 'No se crearán copias al cerrar la aplicación.'}
                  </p>
                </div>
              </div>
              <Switch
                checked={configuracion.automatica}
                onCheckedChange={(automatica) => void cambiarAutomatico(automatica)}
                disabled={cargando || ocupado || !configuracion.carpeta}
              />
            </div>
          </div>

          {estadosDestinos && (
            <div className={`rounded-xl border px-3 py-2.5 text-sm ${destinosNoDisponibles.length ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  {destinosNoDisponibles.length > 0 && <TriangleAlert size={17} className="mt-0.5 shrink-0" />}
                  <div>
                    <p className="font-semibold">
                      {destinosNoDisponibles.length === 0
                        ? 'Las dos ubicaciones de copias están disponibles.'
                        : destinosNoDisponibles.length === 2
                          ? 'Ninguna de las dos ubicaciones de copias está disponible.'
                          : `${ETIQUETAS_DESTINO[destinosNoDisponibles[0]]} no está disponible.`}
                    </p>
                    {destinosNoDisponibles.length > 0 && (
                      <ul className="mt-1 list-inside list-disc space-y-0.5 text-[13px]">
                        {destinosNoDisponibles.map((tipo) => (
                          <li key={tipo}>
                            {ETIQUETAS_DESTINO[tipo]}: {!configuracion.carpetas[tipo]
                              ? 'tenés que elegir una carpeta para configurarla.'
                              : `${estadosDestinos[tipo].mensaje ?? 'No se encuentra disponible.'} Revisá la unidad o configurá nuevamente la carpeta.`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmModal
        isOpen={archivoRestaurar !== null}
        onClose={() => setArchivoRestaurar(null)}
        onConfirm={restaurar}
        title="Restaurar copia de seguridad"
        description="Se reemplazarán los datos actuales por los de la copia seleccionada y Panda Stock se reiniciará. Esta acción no se puede deshacer."
        headerIcon={<RotateCcw size={18} />}
        confirmText="Restaurar y reiniciar"
        cancelText="Cancelar"
      />
      <CajaAbiertaModal
        isOpen={avisoCajaAbierta}
        onClose={() => setAvisoCajaAbierta(false)}
        contexto="restauracion"
      />
    </>
  )
}
