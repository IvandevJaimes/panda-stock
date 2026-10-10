import { useEffect, useRef, useState } from 'react'
import { Ban, ChevronDown, History, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Tooltip } from '../../components/ui/Tooltip'
import { LoadingState } from '../../components/ui/LoadingState'
import { EmptyStateCompact } from '../../components/ui/EmptyStateCompact'
import { ventasService, HISTORIAL_MINIMO } from '../../services/ventas.service'
import { buildAssetUrl } from '../../lib/assets'
import { getProductPlaceholder } from '../../lib/productPlaceholder'
import { useSrcConFallback } from '../../hooks/useSrcConFallback'
import { formatearMoneda } from './posQuery'
import { AnularVentaModal } from './AnularVentaModal'
import { ModalContrasena } from '../seguridad/ModalContrasena'
import { useSettingsStore } from '../../stores/settings.store'
import type { MetodoPago, ResultadoAnulacion, VentaHistorial } from '../../../electron/db/types'

/**
 * `cantidad` es `real` en la base (el POS también vende por peso), así que un
 * flotante puede aparecer como `1.5000000001`. Se redondea y se limpian los ceros
 * sueltos: en un ticket el `2` tiene que leerse `2`, no `2.000`.
 */
function cantidadEnTexto(cantidad: number): string {
  return String(Number(cantidad.toFixed(3)))
}

/**
 * `debito` se rotula "Tarjeta" y no "Débito": es como el selector del ticket lo
 * nombra (`F4` rota Efectivo / Transferencia / Tarjeta) y como `processSale` lo
 * guarda. Ver la etiqueta de la base obligaría al cajero a traducir entre dos
 * nombres del mismo botón.
 */
const ETIQUETAS_METODO: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  qr: 'QR',
  debito: 'Tarjeta',
  credito: 'Crédito',
  cuenta_corriente: 'Cuenta corriente',
}

/**
 * Sale "—" y no una fecha inventada si el valor no parsea: preferible un hueco
 * visible a un "Invalid Date" colgando en el ticket.
 */
function formatearMomento(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

/**
 * Un pago mixto se lee como "Efectivo + Débito" y no como dos íconos: el cajero
 * necesita verificar el reparto leyendo, no reconociendo glifos.
 */
function etiquetaMetodos(metodos: MetodoPago[]): string {
  if (metodos.length === 0) return '—'
  return metodos.map((metodo) => ETIQUETAS_METODO[metodo]).join(' + ')
}

type HistorialVentasModalProps = {
  isOpen: boolean
  onClose: () => void
}

/**
 * Imagen del ítem dentro de una venta del historial. Vive en su propio
 * componente a propósito: la lista se arma con `.map`, y un hook no se puede
 * llamar dentro del callback. Cada fila necesita su propio estado de "el
 * archivo no cargó": si el hook viviera en el padre, caería el preview de una
 * fila y arrastraría a todas.
 */
function ItemHistorialImagen({ item }: { item: VentaHistorial['items'][number] }) {
  const preview = getProductPlaceholder(item.productoId ?? item.id)
  const imagen = useSrcConFallback(buildAssetUrl(item.imgPath) ?? preview, preview)

  return (
    <img
      src={imagen.src}
      onError={imagen.onError}
      alt={item.descripcionItem}
      loading="lazy"
      draggable={false}
      className="h-9 w-9 shrink-0 rounded-md object-cover"
    />
  )
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
      toast.success(`Venta #${resultado.ventaId} anulada`, {
        description: `${formatearMoneda(resultado.total)} · ${resultado.unidadesRestituidas} ${resultado.unidadesRestituidas === 1 ? 'unidad' : 'unidades'} reintegradas`,
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
                <li
                  key={venta.id}
                  className={[
                    'rounded-xl border px-4 py-3',
                    venta.estado === 'anulada'
                      ? 'border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/15'
                      : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-secondary/25',
                  ].join(' ')}
                >
                  {/* Cabecera del ticket: número de venta a la izquierda, momento y
                      acción a la derecha. La anulada cambia el número por un badge,
                      para que el cajero la distinga de un vistazo sin abrirla. */}
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-sm font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
                      N.º {venta.id}
                    </span>

                    <div className="flex items-center gap-2">
                      {venta.estado === 'anulada' ? (
                        <Tooltip content={venta.motivoAnulacion || 'Venta anulada'} placement="top">
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                            <Ban size={12} aria-hidden="true" />
                            Anulada
                          </span>
                        </Tooltip>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          icon={<Ban size={13} aria-hidden="true" />}
                          onClick={() => setVentaAAnular(venta)}
                          className="text-rose-600 hover:border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:hover:border-rose-800 dark:hover:bg-rose-950/30"
                        >
                          Anular
                        </Button>
                      )}
                      <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                        {formatearMomento(venta.fechaHora)}
                      </span>
                    </div>
                  </div>

                  <div
                    aria-hidden="true"
                    className="mt-2.5 border-t border-dashed border-slate-300 dark:border-slate-700"
                  />

                  {/* Los ítems van en su propia caja scrolleable con `max-h`: sin el
                      techo, una venta de 40 líneas convertiría la card en un muro y
                      empujaría las otras 19 ventas fuera de vista. Con el techo la
                      card queda acotada y el cajero ve el ticket entero de un
                      vistazo; si hay más, scrollea adentro. */}
                  <div className="custom-scrollbar px-1 mt-2 max-h-40 overflow-y-auto overscroll-contain">
                    {venta.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2.5 py-1.5  first:pt-0 last:pb-0"
                      >
                        <ItemHistorialImagen item={item} />

                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-300">
                            {item.descripcionItem}
                          </span>
                          <span className="text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                            {cantidadEnTexto(item.cantidad)} × {formatearMoneda(item.precioUnitario)}
                          </span>
                        </span>

                        <span className="shrink-0 text-[13px] tabular-nums text-slate-600 dark:text-slate-400">
                          {formatearMoneda(item.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div
                    aria-hidden="true"
                    className="mt-2.5 border-t border-dashed border-slate-300 dark:border-slate-700"
                  />

                  {/* Pie del ticket: el método de pago en texto y el total. La unidad
                      queda como dato secundario al lado del método y no como
                      protagonista: el cajero verifica cuánto entró, no cuántas cajas
                      salieron. */}
                  <div className="mt-2.5 flex items-end justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Receipt size={15} className="shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                      <span className="min-w-0 truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                        {etiquetaMetodos(venta.metodos)}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-slate-400 dark:text-slate-500">
                        · {cantidadEnTexto(venta.unidades)} u.
                      </span>
                    </div>

                    <span
                      className={[
                        'shrink-0 font-display text-base font-extrabold tabular-nums',
                        venta.estado === 'anulada'
                          ? 'text-slate-400 line-through decoration-rose-400/70 dark:text-slate-500'
                          : 'text-emerald-700 dark:text-emerald-400',
                      ].join(' ')}
                    >
                      {formatearMoneda(venta.total)}
                    </span>
                  </div>
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
