import { useEffect, useState } from 'react'
import { DatabaseBackup, FolderOpen, HardDrive, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { Switch } from '../../components/ui/Switch'
import { copiasSeguridadService } from '../../services/copias-seguridad.service'
import { toErrorMessage } from '../../services/errors'
import type { ConfiguracionCopias } from '../../../electron/db/types'

const CONFIGURACION_INICIAL: ConfiguracionCopias = { carpeta: null, automatica: false }

export function CopiasSeguridadSection() {
  const [configuracion, setConfiguracion] = useState(CONFIGURACION_INICIAL)
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [archivoRestaurar, setArchivoRestaurar] = useState<string | null>(null)

  useEffect(() => {
    let activa = true
    void copiasSeguridadService.obtenerConfiguracion()
      .then((resultado) => { if (activa) setConfiguracion(resultado) })
      .catch((error: unknown) => { if (activa) toast.error(toErrorMessage(error)) })
      .finally(() => { if (activa) setCargando(false) })
    return () => { activa = false }
  }, [])

  async function guardar(siguiente: ConfiguracionCopias) {
    setOcupado(true)
    try {
      const guardada = await copiasSeguridadService.guardarConfiguracion(siguiente)
      setConfiguracion(guardada)
      return true
    } catch (error) {
      toast.error(toErrorMessage(error))
      return false
    } finally {
      setOcupado(false)
    }
  }

  async function elegirCarpeta() {
    try {
      const carpeta = await copiasSeguridadService.seleccionarCarpeta()
      if (!carpeta) return
      if (await guardar({ ...configuracion, carpeta })) {
        toast.success('Carpeta de copias configurada')
      }
    } catch (error) {
      toast.error(toErrorMessage(error))
    }
  }

  async function cambiarAutomatico(automatica: boolean) {
    if (await guardar({ ...configuracion, automatica })) {
      toast.success(automatica ? 'Copia automática activada' : 'Copia automática desactivada')
    }
  }

  async function crearCopia() {
    setOcupado(true)
    try {
      const ruta = await copiasSeguridadService.crear()
      toast.success(`Copia creada: ${ruta.split(/[\\/]/).pop() ?? ruta}`)
    } catch (error) {
      toast.error(toErrorMessage(error))
    } finally {
      setOcupado(false)
    }
  }

  async function elegirRestauracion() {
    setOcupado(true)
    try {
      const archivo = await copiasSeguridadService.seleccionarRestauracion()
      if (archivo) setArchivoRestaurar(archivo)
    } catch (error) {
      toast.error(toErrorMessage(error))
    } finally {
      setOcupado(false)
    }
  }

  async function restaurar() {
    if (!archivoRestaurar) return
    try {
      await copiasSeguridadService.restaurar(archivoRestaurar)
    } catch (error) {
      toast.error(toErrorMessage(error))
      throw error
    }
  }

  return (
    <>
      <Card title="Copias de seguridad" description="Guardá una copia en un pendrive y restaurala si necesitás recuperar los datos." className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex min-w-0 items-start gap-3">
            <HardDrive size={18} className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" />
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-slate-900 dark:text-white">Carpeta del pendrive</p>
              <p className="mt-0.5 truncate text-[13px] text-slate-500 dark:text-slate-400">{configuracion.carpeta ?? 'Sin configurar'}</p>
            </div>
          </div>
          <Button type="button" size="sm" variant="outline" icon={<FolderOpen size={15} />} disabled={cargando || ocupado} onClick={() => void elegirCarpeta()}>
            {configuracion.carpeta ? 'Cambiar carpeta' : 'Elegir carpeta'}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
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

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button type="button" variant="outline" icon={<RotateCcw size={15} />} disabled={cargando || ocupado} onClick={() => void elegirRestauracion()}>
            Restaurar copia
          </Button>
          <Button type="button" icon={<DatabaseBackup size={15} />} disabled={cargando || ocupado || !configuracion.carpeta} loading={ocupado} onClick={() => void crearCopia()}>
            Crear copia ahora
          </Button>
        </div>
      </Card>

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
    </>
  )
}
