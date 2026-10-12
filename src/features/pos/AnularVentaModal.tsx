import { useState } from 'react'
import { Ban, Package, Receipt, AlertTriangle } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { CustomSelect } from '../../components/ui/CustomSelect'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { formatearMoneda } from './posQuery'
import { buildAssetUrl } from '../../lib/assets'
import { getProductPlaceholder } from '../../lib/productPlaceholder'
import { useSrcConFallback } from '../../hooks/useSrcConFallback'
import type { MetodoPago, VentaHistorial } from '../../../electron/db/types'

const MOTIVOS_PREDEFINIDOS = [
  'Error de cobro / equivocación de cajero',
  'Cliente canceló la compra',
  'Producto defectuoso o rechazado',
  'Cobro duplicado',
  'Otro motivo',
] as const

const OPCIONES_MOTIVO = MOTIVOS_PREDEFINIDOS.map((motivo) => ({ value: motivo, label: motivo }))

const ETIQUETAS_METODO: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  qr: 'QR',
  debito: 'Tarjeta',
  credito: 'Crédito',
  cuenta_corriente: 'Cuenta corriente',
}

function formatearMomento(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

function etiquetaMetodos(metodos: MetodoPago[]): string {
  if (metodos.length === 0) return '—'
  return metodos.map((metodo) => ETIQUETAS_METODO[metodo]).join(' + ')
}

function ItemMiniImagen({ item }: { item: VentaHistorial['items'][number] }) {
  const preview = getProductPlaceholder(item.productoId ?? item.id)
  const imagen = useSrcConFallback(buildAssetUrl(item.imgPath) ?? preview, preview)

  return (
    <img
      src={imagen.src}
      onError={imagen.onError}
      alt={item.descripcionItem}
      loading="lazy"
      draggable={false}
      className="h-8 w-8 shrink-0 rounded-md object-cover"
    />
  )
}

type AnularVentaModalProps = {
  venta: VentaHistorial | null
  isOpen: boolean
  requiereContrasena: boolean
  onClose: () => void
  onConfirmar: (motivo: string) => void
}

export function AnularVentaModal({
  venta,
  isOpen,
  requiereContrasena,
  onClose,
  onConfirmar,
}: AnularVentaModalProps) {
  const [motivoSeleccionado, setMotivoSeleccionado] = useState<string>('')
  const [motivoPersonalizado, setMotivoPersonalizado] = useState<string>('')
  const [confirmacionAbierta, setConfirmacionAbierta] = useState(false)
  const [ventaIdAnterior, setVentaIdAnterior] = useState<number | null>(venta?.id ?? null)

  if (ventaIdAnterior !== (venta?.id ?? null)) {
    setVentaIdAnterior(venta?.id ?? null)
    setConfirmacionAbierta(false)
    setMotivoSeleccionado('')
    setMotivoPersonalizado('')
  }

  if (!venta) return null

  const esOtro = motivoSeleccionado === 'Otro motivo'
  const motivoFinal = esOtro ? motivoPersonalizado.trim() : motivoSeleccionado
  const motivoValido = motivoFinal.length > 0

  const handleConfirmar = () => {
    if (!motivoValido) return
    if (requiereContrasena) {
      onConfirmar(motivoFinal)
      return
    }
    setConfirmacionAbierta(true)
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Anular venta #${venta.id}`}
        subtitle={`Registrada el ${formatearMomento(venta.fechaHora)}`}
        headerIcon={<Ban size={18} className="text-rose-600 dark:text-rose-400" aria-hidden="true" />}
        maxWidth="lg"
        footer={
          <>
            <Button variant="outline" onClick={onClose}>
              Volver
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmar}
              disabled={!motivoValido}
              icon={<Ban size={16} aria-hidden="true" />}
            >
              Continuar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
        {/* Banner informativo de impacto */}
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-300">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <div className="text-xs leading-relaxed">
            <p className="font-semibold">Esta acción anulará la venta de forma irreversible.</p>
            <p className="mt-0.5 opacity-90">
              Se cancelará la deuda de cuenta corriente y se registrarán los reintegros según los medios originales. Los pagos externos deben devolverse manualmente.
            </p>
          </div>
        </div>

        {/* Resumen de impacto: unidades y dinero */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Card: Cantidad a reponer */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-secondary/30">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
              <Package size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                A reponer en stock
              </span>
              <p className="font-display text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
                +{venta.unidades} {venta.unidades === 1 ? 'unidad' : 'unidades'}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                {venta.items.length} {venta.items.length === 1 ? 'producto' : 'productos'} en total
              </p>
            </div>
          </div>

          {/* Card: Dinero a restar */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-secondary/30">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <Receipt size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Importe de la operación
              </span>
              <p className="font-display text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400">
                -{formatearMoneda(venta.total)}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                Incluye reintegros y deuda · {etiquetaMetodos(venta.metodos)}
              </p>
            </div>
          </div>
        </div>

        {/* Lista compacta de artículos devueltos */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-secondary/15">
          <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            Artículos que vuelven al catálogo:
          </p>
          <div className="custom-scrollbar max-h-32 overflow-y-auto space-y-1.5 pr-1">
            {venta.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2.5 rounded-lg bg-white/70 px-2.5 py-1.5 text-xs dark:bg-secondary/40"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <ItemMiniImagen item={item} />
                  <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                    {item.descripcionItem}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-md bg-sky-500/10 px-1.5 py-0.5 font-bold tabular-nums text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
                    +{item.cantidad} u.
                  </span>
                  <span className="tabular-nums text-slate-500 dark:text-slate-400">
                    {formatearMoneda(item.subtotal)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selector de motivo */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Motivo de anulación <span className="text-rose-500">*</span>
          </label>
          <CustomSelect
            options={OPCIONES_MOTIVO}
            value={motivoSeleccionado}
            onChange={(valor) => setMotivoSeleccionado(String(valor))}
            placeholder="Seleccioná el motivo de anulación"
            placement="top"
          />

          {esOtro && (
            <div className="mt-1 animate-entry-fade">
              <Input
                placeholder="Escribí el motivo de anulación..."
                value={motivoPersonalizado}
                onChange={(e) => setMotivoPersonalizado(e.target.value)}
                autoFocus
              />
            </div>
          )}
        </div>
        </div>
      </Modal>
      <ConfirmModal
        isOpen={confirmacionAbierta}
        onClose={() => setConfirmacionAbierta(false)}
        onConfirm={() => onConfirmar(motivoFinal)}
        title={`¿Anular la venta #${venta.id}?`}
        description="La anulación es irreversible. Se reincorporarán los artículos, se cancelará la deuda y se registrarán los reintegros por sus medios originales."
        confirmText="Anular venta"
        cancelText="Volver"
      />
    </>
  )
}
