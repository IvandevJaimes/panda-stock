import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { AlertTriangle, LockOpen, Timer } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { CapitalizedInput } from '../../components/ui/CapitalizedInput'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { cajasService } from '../../services/cajas.service'
import { useTiempoTranscurrido } from '../../hooks/useTiempoTranscurrido'
import { noSpinnersClass } from '../inventory/quick-actions/types'
import { formatearMoneda, resumenTicketsPendientes } from '../pos/posQuery'
import { formatearFechaHoraCorta } from './fechas'
import { useCajaStore } from '../../stores/caja.store'
import { usePosTicketsStore } from '../../stores/pos-tickets.store'
import type { CajaConResponsable, CajaSummary } from '../../../electron/db/types'

type CerrarCajaValues = {
  montoReal: string
  observaciones: string
}

const FORM_ID = 'form-cerrar-caja'

interface CerrarCajaModalProps {
  isOpen: boolean
  caja: CajaConResponsable
  onClose: () => void
  /**
   * Se dispara cuando el cierre arranca, antes que `onClose`. Existe para el
   * flujo de salida de la app: el main bloqueó el cierre porque había caja
   * abierta, así que recién cuando el arqueo terminó se le deja salir. Va
   * antes de `onClose` porque salir mata el renderer y un `onClose` posterior
   * ya no llegaría a ejecutarse.
   */
  alCerrar?: () => void
}

export function CerrarCajaModal({ isOpen, caja, onClose, alCerrar }: CerrarCajaModalProps) {
  const limpiarCaja = useCajaStore((state) => state.limpiar)
  const tickets = usePosTicketsStore((state) => state.tickets)
  const pendientes = resumenTicketsPendientes(tickets)

  const [resumen, setResumen] = useState<CajaSummary | null>(null)

  // El reloj corre solo con el modal abierto. Además, el componente no se monta
  // sin caja (`CajaControl` corta el render antes), así que no hay forma de que
  // el timer exista con la caja cerrada.
  const transcurrido = useTiempoTranscurrido(caja.fechaApertura, isOpen)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CerrarCajaValues>({ defaultValues: { montoReal: '', observaciones: '' } })

  // Se mira el campo mientras se escribe para mostrar la diferencia en vivo: es
  // el número que decide si hay que ir a buscar un billete antes de cerrar.
  const montoRealIngresado = useWatch({ control, name: 'montoReal' })

  useEffect(() => {
    if (!isOpen) return
    let activo = true
    void cajasService
      .getSummary(caja.id)
      .then((datos) => {
        if (activo) setResumen(datos)
      })
      .catch((error) => {
        if (!activo) return
        setResumen(null)
        toast.error(error instanceof Error ? error.message : 'No se pudo leer el resumen de caja')
      })
    return () => {
      activo = false
    }
  }, [isOpen, caja.id])

  const montoReal = Number(montoRealIngresado)
  const diferenciaPrevia =
    resumen && montoRealIngresado !== '' && !Number.isNaN(montoReal)
      ? montoReal - resumen.montoEsperado
      : null

  const onSubmit = async (data: CerrarCajaValues) => {
    try {
      const cerrada = await cajasService.close({
        cajaId: caja.id,
        montoReal: Number(data.montoReal),
        observaciones: data.observaciones,
      })
      limpiarCaja()
      const diferencia = cerrada.diferencia
      toast.success(
        diferencia === null || diferencia === 0
          ? 'Caja cerrada · sin diferencia'
          : `Caja cerrada · diferencia ${formatearDiferencia(diferencia)}`,
      )
      alCerrar?.()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cerrar la caja')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cerrar caja"
      subtitle={`Responsable: ${caja.empleadoNombre}`}
      headerIcon={<LockOpen size={18} />}
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            loading={isSubmitting}
            disabled={pendientes.tickets > 0}
            className="disabled:pointer-events-auto"
          >
            Cerrar caja
          </Button>
        </>
      }
    >
      {/*
        El botón queda deshabilitado y el submit corta igual: si el `disabled`
        fuera la única red, un Enter cerraría la caja con tickets cargados.
      */}
      <form
        id={FORM_ID}
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault()
          if (pendientes.tickets > 0) {
            toast.error('Hay tickets con productos cargados: cobralos o vacialos antes de cerrar la caja')
            return
          }
          void handleSubmit(onSubmit)(evento)
        }}
        className="space-y-4"
      >
        {pendientes.tickets > 0 && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-semibold">
                {pendientes.tickets}{' '}
                {pendientes.tickets === 1 ? 'ticket tiene' : 'tickets tienen'} productos cargados
              </p>
              <p className="mt-1 leading-relaxed">
                Cobralos o vacialos antes de cerrar la caja. Si los vaciás, la venta se pierde; si
                los cobrás, la venta queda imputada a esta caja.
              </p>
            </div>
          </div>
        )}

        {resumen ? (
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <ResumenFila termino="Fondo inicial" valor={formatearMoneda(caja.montoInicial)} />
              <ResumenFila termino="Ventas" valor={resumen.cantidadVentas.toString()} />
              <ResumenFila termino="Efectivo neto" valor={formatearMoneda(resumen.totalEfectivo)} />
              <ResumenFila
                termino="Egresos por devoluciones"
                valor={formatearMoneda(resumen.totalEgresosEfectivo)}
              />
              <ResumenFila
                termino="Tarjeta + transf."
                valor={formatearMoneda(resumen.totalTarjeta + resumen.totalTransferencia)}
              />
              <ResumenFila
                termino="Esperado en gaveta"
                valor={formatearMoneda(resumen.montoEsperado)}
                destacado
              />
              <ResumenFila termino="Abierta" valor={formatearFechaHoraCorta(caja.fechaApertura)} />
            </dl>

            {/*
              El reloj va aparte y a todo el ancho, no como una fila más del `dl`:
              es el único dato que cambia solo, y mezclarlo con las cifras fijas
              haría que el ojo lo lea como otro monto de la arqueo.
            */}
            {transcurrido !== null && (
              <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700/60">
                <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <Timer size={15} className="shrink-0" aria-hidden="true" />
                  Abierta hace
                </span>
                {/* `tabular-nums`: sin esto los dígitos cambian de ancho cada tick y el número se mueve. */}
                <span className="font-display text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {transcurrido}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Leyendo el resumen de la caja…</p>
        )}

        <Input
          id="montoReal"
          label="Efectivo contado en la gaveta"
          type="number"
          step="0.01"
          min="0"
          autoFocus
          disabled={isSubmitting || pendientes.tickets > 0}
          error={errors.montoReal?.message}
          className={noSpinnersClass}
          {...register('montoReal', {
            required: 'Contá el efectivo y cargá el monto',
            validate: {
              numeroValido: (valor) => !Number.isNaN(Number(valor)) || 'Debe ser un número válido',
              noNegativo: (valor) => Number(valor) >= 0 || 'No puede ser negativo',
            },
          })}
        />

        {diferenciaPrevia !== null && (
          <p
            className={cnDiferencia(diferenciaPrevia)}
          >
            {diferenciaPrevia === 0
              ? 'La caja cuadra exactamente'
              : `Diferencia: ${formatearDiferencia(diferenciaPrevia)}`}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="observacionesCierre"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Observaciones (opcional)
          </label>
          <CapitalizedInput
            id="observacionesCierre"
            placeholder="Ej: Falta un billete de 2.000"
            disabled={isSubmitting}
            {...register('observaciones')}
          />
        </div>
      </form>
    </Modal>
  )
}

function ResumenFila({
  termino,
  valor,
  destacado = false,
}: {
  termino: string
  valor: string
  destacado?: boolean
}) {
  return (
    <>
      <dt className="text-slate-500 dark:text-slate-400">{termino}</dt>
      <dd
        className={
          destacado
            ? 'text-right font-display font-semibold text-slate-900 dark:text-white'
            : 'text-right font-medium tabular-nums text-slate-700 dark:text-slate-200'
        }
      >
        {valor}
      </dd>
    </>
  )
}

/**
 * `formatearMoneda` devuelve `$-50.00` para un negativo. Acá la diferencia se
 * firma, así que el signo va adelante: "sobraron $50" tiene que leerse distinto de
 * "faltan $50".
 */
function formatearDiferencia(diferencia: number): string {
  const signo = diferencia > 0 ? '+' : '-'
  return `${signo}${formatearMoneda(Math.abs(diferencia))}`
}

function cnDiferencia(diferencia: number): string {
  if (diferencia === 0) return 'text-sm font-semibold text-emerald-600 dark:text-emerald-400'
  if (diferencia > 0) return 'text-sm font-semibold text-blue-600 dark:text-blue-400'
  return 'text-sm font-semibold text-red-600 dark:text-red-400'
}
