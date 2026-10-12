import { useEffect, useRef, useState } from 'react'
import { Ban, ChevronDown, History } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/LoadingState'
import { EmptyStateCompact } from '../../components/ui/EmptyStateCompact'
import { ventasService, HISTORIAL_MINIMO } from '../../services/ventas.service'
import { formatearMoneda } from './posQuery'
import { AnularVentaModal } from './AnularVentaModal'
import { VentaHistorialCard } from './VentaHistorialCard'
import { ETIQUETAS_METODO } from './ventaHistorialUtils'
import { ModalContrasena } from '../seguridad/ModalContrasena'
import { useSettingsStore } from '../../stores/settings.store'
import type { ResultadoAnulacion, VentaHistorial } from '../../../electron/db/types'

type HistorialVentasModalProps = {
  isOpen: boolean
  onClose: () => void
}

/**
 * Historial de las últimas ventas del mostrador.
 *
 * La consulta pasa por `ventasService` y no por un array que le pase `PosPage`:
 * la lista cambia con cada cobro, así que traerla siempre junto al catálogo
 * sería recargar todo el POS para mostrar un dato que el cajero pidió después.
 * Se pide al abrir y se tira al cerrar.
 */
export function HistorialVentasModal({ isOpen, onClose }: HistorialVentasModalProps) {
  const [ventas, setVentas] = useState<VentaHistorial[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recarga, setRecarga] = useState(0)
  const [ventaAAnular, setVentaAAnular] = useState<VentaHistorial | null>(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')
  const [pedirPin, setPedirPin] = useState(false)
  const requiereContrasenaAnular = useSettingsStore((state) => state.proteccionesSeguridad.anularVentas)
  const resultadoAnulacion = useRef<ResultadoAnulacion | null>(null)

  // Reset al reabrir: ajuste durante el render (mismo patrón que `InactivosModal`).
  // La lista anterior se descarta acá y no en el effect, para que el effect tenga
  // una sola responsabilidad — pedir — y no setState síncrono en su cuerpo.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen)
    setVentas(null)
    setError(null)
  }

  useEffect(() => {
    if (!isOpen) return

    let vigente = true

    ventasService
      .getRecientes(HISTORIAL_MINIMO)
      .then((resultado) => {
        if (vigente) setVentas(resultado)
      })
      .catch((fallo: unknown) => {
        if (vigente) setError(fallo instanceof Error ? fallo.message : 'No se pudo cargar el historial')
      })

    return () => {
      vigente = false
    }
  }, [isOpen, recarga])

  const cerrarAnulacion = () => {
    setPedirPin(false)
    setMotivoAnulacion('')
    setVentaAAnular(null)
  }

  const enviarAnulacion = async (pin: string, ventaId = ventaAAnular?.id, motivo = motivoAnulacion): Promise<boolean> => {
    if (!ventaId) return false
    if (requiereContrasenaAnular && !pin.trim()) return false
    const resultado = await ventasService.anular({
      ventaId,
      motivo,
      pin,
    })
    resultadoAnulacion.current = resultado
    return resultado !== null
  }

  const completarAnulacion = () => {
    const resultado = resultadoAnulacion.current
    resultadoAnulacion.current = null
    cerrarAnulacion()
    setRecarga((valor) => valor + 1)
    if (resultado) {
      const detalleReintegros = resultado.reintegros
        .map(({ metodo, monto }) => `${ETIQUETAS_METODO[metodo]} ${formatearMoneda(monto)}`)
        .join(' · ')
      toast.success(`Venta #${resultado.ventaId} anulada`, {
        description: `Reintegros registrados: ${detalleReintegros || 'ninguno'} · Deuda cancelada: ${formatearMoneda(resultado.deudaCancelada)} · ${resultado.unidadesRestituidas} ${resultado.unidadesRestituidas === 1 ? 'unidad' : 'unidades'} reintegradas`,
      })
    }
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Historial de ventas"
        subtitle={`Últimas ${HISTORIAL_MINIMO} ventas`}
        headerIcon={<History size={18} aria-hidden="true" />}
        maxWidth="2xl"
        height="h-[75vh]"
        footer={
          <>
            <span className="mr-auto text-xs tabular-nums text-slate-400 dark:text-slate-500">
              {ventas === null ? '' : `${ventas.length} ${ventas.length === 1 ? 'venta' : 'ventas'}`}
            </span>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </>
        }
      >
        {error !== null ? (
          <EmptyStateCompact
            icon={<History className="h-8 w-8 stroke-[1.5]" />}
            title="No se pudo cargar el historial"
            description={error}
            tone="danger"
          />
        ) : ventas === null ? (
          <LoadingState title="Cargando ventas..." />
        ) : ventas.length === 0 ? (
          <EmptyStateCompact
            icon={<History className="h-8 w-8 stroke-[1.5]" />}
            title="Todavía no hay ventas"
            description="Cuando cobres tu primera venta, vas a verla acá."
          />
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {ventas.map((venta) => (
                <li key={venta.id}>
                  <VentaHistorialCard venta={venta} onAnular={setVentaAAnular} />
                </li>
              ))}
            </ul>

            {/* Botón puramente visual por ahora: el paginado real viene en un
                cambio posterior. */}
            <div className="mt-1 flex justify-center">
              <Button variant="outline" icon={<ChevronDown className="h-4 w-4" aria-hidden="true" />}>
                Ver más
              </Button>
            </div>
          </>
        )}
      </Modal>

      <AnularVentaModal
        venta={ventaAAnular}
        isOpen={ventaAAnular !== null && !pedirPin}
        requiereContrasena={requiereContrasenaAnular}
        onClose={cerrarAnulacion}
        onConfirmar={(motivo) => {
          setMotivoAnulacion(motivo)
          const venta = ventaAAnular
          if (!venta) return
          if (requiereContrasenaAnular) {
            setPedirPin(true)
            return
          }
          setVentaAAnular(null)
          void enviarAnulacion('', venta.id, motivo).then((valida) => {
            if (valida) completarAnulacion()
            else toast.error('No se pudo anular la venta')
          }).catch((error: unknown) => {
            toast.error(error instanceof Error ? error.message : 'No se pudo anular la venta')
          })
        }}
      />

      {pedirPin && ventaAAnular && (
        <ModalContrasena
          titulo="Autorizar anulación"
          etiquetaCancelar="Cancelar"
          etiquetaConfirmar="Confirmar anulación"
          confirmarVariant="danger"
          confirmarIcon={<Ban size={16} aria-hidden="true" />}
          onSubmit={enviarAnulacion}
          onSuccess={completarAnulacion}
          onCancelar={() => setPedirPin(false)}
        />
      )}
    </>
  )
}
