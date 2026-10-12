import { Fragment, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { History, HandCoins, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { CajaCerradaOverlay } from '../../components/ui/CajaCerradaOverlay'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { AbrirCajaModal } from '../caja/AbrirCajaModal'
import { PaymentMethodSelector } from '../pos/PaymentMethodSelector'
import type { ClienteConSaldo, MovimientoCuentaCorriente } from '../../../electron/db/types'
import { cuentasCorrientesService } from '../../services/cuentas-corrientes.service'
import { useCajaStore } from '../../stores/caja.store'
import { useSettingsStore } from '../../stores/settings.store'
import { buildAssetUrl } from '../../lib/assets'
import { getProductPlaceholder } from '../../lib/productPlaceholder'
import { useSrcConFallback } from '../../hooks/useSrcConFallback'
import { formatearMoneda } from './cuentasQuery'
import { metodosHabilitados, metodoPagoARegistro, type MetodoPagoPOS } from '../pos/posQuery'

type FormValues = {
  monto: string
  nota: string
}

interface AbonoModalProps {
  isOpen: boolean
  onClose: () => void
  onCancelar: () => void
  onSuccess: () => void | Promise<void>
  cliente: ClienteConSaldo | null
  deuda: MovimientoCuentaCorriente | null
  esCobroDesdeTarjeta: boolean
  montoInicial?: number
  onVerOtrasDeudas: () => void
}

type MetodoPagoCobro = Exclude<MetodoPagoPOS, 'cuenta_corriente'>

function esMetodoPagoCobro(metodo: MetodoPagoPOS): metodo is MetodoPagoCobro {
  return metodo !== 'cuenta_corriente'
}

function ProductoDeuda({ item }: {
  item: NonNullable<MovimientoCuentaCorriente['items']>[number]
}) {
  const placeholder = getProductPlaceholder(item.productoId ?? item.id)
  const imagen = useSrcConFallback(buildAssetUrl(item.imgPath) ?? placeholder, placeholder)

  return (
    <div className="flex min-w-0 items-center gap-2.5 py-1.5 first:pt-0 last:pb-0">
      <img
        src={imagen.src}
        onError={imagen.onError}
        alt={item.descripcionItem}
        loading="lazy"
        draggable={false}
        className="h-9 w-9 shrink-0 rounded-md object-cover"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-300">
          {item.descripcionItem}
        </span>
        <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
          {item.cantidad} × {formatearMoneda(item.precioUnitario)}
        </span>
      </span>
      <span className="shrink-0 text-[13px] tabular-nums text-slate-700 dark:text-slate-300">
        {formatearMoneda(item.subtotal)}
      </span>
    </div>
  )
}

function formatearFechaHora(fechaHora: string): string {
  const fecha = new Date(fechaHora)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

export function AbonoModal({
  isOpen,
  onClose,
  onCancelar,
  onSuccess,
  cliente,
  deuda,
  esCobroDesdeTarjeta,
  montoInicial,
  onVerOtrasDeudas,
}: AbonoModalProps) {
  const caja = useCajaStore((estado) => estado.caja)
  const cajaCargada = useCajaStore((estado) => estado.cargado)
  const ventasPorCajas = useSettingsStore((estado) => estado.ventasPorCajas)
  const tarjetaHabilitada = useSettingsStore((estado) => estado.tarjetaHabilitada)
  const transferenciaHabilitada = useSettingsStore((estado) => estado.transferenciaHabilitada)
  const qrHabilitado = useSettingsStore((estado) => estado.qrHabilitado)
  const cuentaCorrienteHabilitada = useSettingsStore((estado) => estado.cuentaCorrienteHabilitada)
  const [metodoElegido, setMetodoElegido] = useState<MetodoPagoPOS>('efectivo')
  const [abrirCajaAbierto, setAbrirCajaAbierto] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { monto: '', nota: '' },
  })

  const saldo = cliente?.saldo ?? 0
  const deudaPendiente = deuda?.saldoPendiente ?? deuda?.monto ?? 0
  const montoMaximo = deuda ? Math.min(deudaPendiente, saldo) : saldo
  const cajaBloqueaCobro = ventasPorCajas && caja === null
  const mostrarCajaCerrada = cajaBloqueaCobro && cajaCargada

  /* El método elegido se deriva en render para reflejar cambios de ajustes en vivo. */
  const metodosDisponibles = useMemo(
    () => metodosHabilitados({
      tarjetaHabilitada,
      transferenciaHabilitada,
      qrHabilitado,
      cuentaCorrienteHabilitada,
    }).filter(esMetodoPagoCobro),
    [cuentaCorrienteHabilitada, qrHabilitado, tarjetaHabilitada, transferenciaHabilitada],
  )
  const metodo = metodosDisponibles.find((opcion) => opcion === metodoElegido)
    ?? metodosDisponibles[0]
    ?? null

  /* El importe sugerido corresponde a la deuda elegida y nunca supera el saldo vigente. */
  useEffect(() => {
    if (!isOpen || !cliente) return

    const montoSugerido = montoInicial === undefined
      ? cliente.saldo
      : Math.min(montoInicial, montoMaximo)
    reset({ monto: montoSugerido > 0 ? String(montoSugerido) : '', nota: '' })
  }, [isOpen, cliente, deuda, montoInicial, montoMaximo, reset])

  const onSubmit = async (data: FormValues) => {
    if (!cliente) return

    const monto = Number(data.monto)

    if (!metodo) {
      toast.error('No hay métodos de pago disponibles para registrar el cobro')
      return
    }

    if (ventasPorCajas && !caja) {
      toast.error('Abrí una caja para registrar el cobro')
      return
    }

    try {
      await cuentasCorrientesService.registrarAbono({
        clienteId: cliente.id,
        monto,
        metodo: metodoPagoARegistro(metodo),
        deudaId: deuda?.tipo === 'cargo' ? deuda.id : null,
        ventaId: deuda?.tipo === 'cargo' ? deuda.ventaId : null,
        cajaId: ventasPorCajas && metodo === 'efectivo' ? caja?.id ?? null : null,
        nota: data.nota.trim() || null,
      })
      toast.success(`Abono de ${formatearMoneda(monto)} registrado`)
      await onSuccess()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar el abono')
    }
  }

  return (
    <Fragment>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cobrar deuda"
      subtitle={cliente
        ? esCobroDesdeTarjeta
          ? `Deuda más reciente de ${cliente.nombre}`
          : `Deuda seleccionada de ${cliente.nombre}`
        : undefined}
      headerIcon={<HandCoins size={18} className="text-emerald-600 dark:text-emerald-400" />}
      maxWidth="lg"
      closeable={!isSubmitting}
      footer={
        <>
          {esCobroDesdeTarjeta && (
            <Button type="button" variant="ghost" icon={<History size={16} />} onClick={onVerOtrasDeudas} disabled={isSubmitting} className="mr-auto">
              Ver otras deudas
            </Button>
          )}
          {mostrarCajaCerrada ? (
            <>
              <Button type="button" variant="ghost" onClick={onCancelar} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => setAbrirCajaAbierto(true)}
                icon={<ShieldCheck size={16} aria-hidden="true" />}
                disabled={isSubmitting}
              >
                Abrir caja
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={onCancelar} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                type="submit"
                form="form-abono"
                loading={isSubmitting}
                disabled={montoMaximo <= 0 || metodo === null || cajaBloqueaCobro}
              >
                Cobrar deuda
              </Button>
            </>
          )}
        </>
      }
    >
      {mostrarCajaCerrada ? (
        <CajaCerradaOverlay
          className="min-h-[280px] rounded-xl"
          onAbrirCaja={() => setAbrirCajaAbierto(true)}
          mostrarBoton={false}
        />
      ) : (
      <form id="form-abono" noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {deuda && (
          <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  {esCobroDesdeTarjeta ? 'Última deuda' : 'Deuda seleccionada'}
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {deuda.ventaId ? `Venta #${deuda.ventaId}` : deuda.nota || 'Cargo registrado'}
                </p>
              </div>
              <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                {formatearFechaHora(deuda.fechaHora)}
              </span>
            </div>
            {deuda.items && deuda.items.length > 0 ? (
              <div className="custom-scrollbar mt-2.5 max-h-36 overflow-y-auto overscroll-contain border-t border-amber-200/80 px-2 pt-2.5 dark:border-amber-900/50">
                {deuda.items.map((item) => <ProductoDeuda key={item.id} item={item} />)}
              </div>
            ) : (
              <p className="mt-2.5 border-t border-amber-200/80 pt-2.5 text-xs text-slate-600 dark:border-amber-900/50 dark:text-slate-300">
                {deuda.nota || 'Esta deuda no tiene productos asociados.'}
              </p>
            )}
            <div className="mt-2 grid grid-cols-2 gap-3 border-t border-amber-200/80 pt-2 dark:border-amber-900/50">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Deuda original</span>
                <span className="font-display text-sm font-bold tabular-nums text-slate-700 dark:text-slate-200">
                  {formatearMoneda(deuda.monto)}
                </span>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Restante a abonar</span>
                <span className="font-display text-sm font-bold tabular-nums text-amber-800 dark:text-amber-300">
                  {formatearMoneda(deudaPendiente)}
                </span>
              </div>
            </div>
          </section>
        )}

        <Input
          label="Monto"
          type="number"
          step="0.01"
          min="0"
          max={montoMaximo}
          placeholder="0.00"
          inputMode="decimal"
          autoFocus
          disabled={isSubmitting || montoMaximo <= 0}
          error={errors.monto?.message}
          aria-invalid={Boolean(errors.monto)}
          {...register('monto', {
            validate: (valor) => {
              const monto = Number(valor)
              if (!valor.trim() || !Number.isFinite(monto) || monto <= 0) {
                return 'Ingresá un monto mayor a cero.'
              }
              if (monto > montoMaximo + 0.001) {
                return `El monto no puede superar ${formatearMoneda(montoMaximo)}.`
              }
              return true
            },
          })}
        />

        {metodo ? (
          <PaymentMethodSelector
            valor={metodo}
            onChange={setMetodoElegido}
            metodos={metodosDisponibles}
            className="border-0 bg-transparent px-0 py-0 dark:border-0 dark:bg-transparent"
          />
        ) : (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
            No hay métodos de pago disponibles. Revisá los métodos habilitados y la caja.
          </p>
        )}

        {ventasPorCajas && metodo === 'efectivo' && !caja && (
          <p className="-mt-2 text-xs text-amber-700 dark:text-amber-300">
            Abrí una caja para confirmar el cobro en efectivo.
          </p>
        )}

        <Input
          label="Nota"
          placeholder="Ej.: pago parcial o referencia del cobro"
          disabled={isSubmitting}
          {...register('nota')}
        />

        {ventasPorCajas && caja && metodo === 'efectivo' ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            El efectivo suma al arqueo de la caja #{caja.id}.
          </p>
        ) : null}
      </form>
      )}
    </Modal>
    <AbrirCajaModal
      isOpen={abrirCajaAbierto}
      onClose={() => setAbrirCajaAbierto(false)}
    />
    </Fragment>
  )
}
