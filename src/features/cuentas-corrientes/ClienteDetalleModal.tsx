import { useEffect, useState, type ReactNode } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleUserRound,
  FileText,
  HandCoins,
  History,
  Info,
  Loader2,
  NotebookPen,
  Pencil,
  RotateCcw,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { EmptyStateCompact } from '../../components/ui/EmptyStateCompact'
import { Button } from '../../components/ui/Button'
import { Tooltip } from '../../components/ui/Tooltip'
import { TabsModal, type TabsModalTab } from '../../components/ui/TabsModal'
import { cuentasCorrientesService } from '../../services/cuentas-corrientes.service'
import { cn } from '../../lib/cn'
import { buildAssetUrl } from '../../lib/assets'
import { getProductPlaceholder } from '../../lib/productPlaceholder'
import { useSrcConFallback } from '../../hooks/useSrcConFallback'
import type {
  ClienteConSaldo,
  MetodoPago,
  MovimientoCuentaCorriente,
  MovimientoCuentaCorrienteItem,
} from '../../../electron/db/types'
import { formatearMoneda } from './cuentasQuery'
import { ToggleActivoCliente } from './ToggleActivoCliente'

interface ClienteDetalleModalProps {
  cliente: ClienteConSaldo
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onClienteChanged: () => void
  onCobrar: (deuda: MovimientoCuentaCorriente) => void
  pestanaInicial?: 'informacion' | 'deudas' | 'movimientos'
}

const ETIQUETAS_METODO: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  qr: 'QR',
  debito: 'Débito',
  credito: 'Crédito',
  cuenta_corriente: 'Cuenta corriente',
}

function formatearFechaHora(fechaHora: string | null): string {
  if (!fechaHora) return '—'
  const fecha = new Date(fechaHora)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

function Dato({ etiqueta, children, className }: {
  etiqueta: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <dt className="text-xs font-medium text-slate-400 dark:text-slate-500">{etiqueta}</dt>
      <dd className="break-words text-sm font-semibold text-slate-800 dark:text-slate-100">
        {children}
      </dd>
    </div>
  )
}

function TituloSeccion({ icon: Icono, children }: {
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      <Icono className="h-4 w-4" strokeWidth={2} aria-hidden />
      {children}
    </h4>
  )
}

function tituloMovimiento(movimiento: MovimientoCuentaCorriente): string {
  if (movimiento.tipo === 'cargo') {
    return movimiento.ventaId ? `Venta #${movimiento.ventaId}` : movimiento.nota || 'Deuda registrada'
  }
  if (movimiento.tipo === 'reintegro') return 'Reintegro de devolución'
  if (movimiento.tipo === 'devolucion') return 'Devolución aplicada'
  return movimiento.nota || 'Abono registrado'
}

function formatearCantidad(cantidad: number): string {
  return String(Number(cantidad.toFixed(3)))
}

function ImagenProductoDeuda({ item }: { item: MovimientoCuentaCorrienteItem }) {
  const placeholder = getProductPlaceholder(item.productoId ?? item.id)
  const imagen = useSrcConFallback(buildAssetUrl(item.imgPath) ?? placeholder, placeholder)

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

function ListaDeudas({
  movimientos,
  saldoCliente,
  onCobrar,
}: {
  movimientos: MovimientoCuentaCorriente[]
  saldoCliente: number
  onCobrar: (deuda: MovimientoCuentaCorriente) => void
}) {
  const deudas = movimientos
    .filter((movimiento) =>
      !movimiento.ventaAnulada
      && (movimiento.tipo === 'cargo' || movimiento.tipo === 'reintegro'),
    )
    .reduce<Array<{ movimiento: MovimientoCuentaCorriente; pendiente: number }>>((grupos, movimiento) => {
      const pendiente = movimiento.saldoPendiente ?? movimiento.monto
      if (movimiento.tipo === 'cargo' && movimiento.ventaId !== null) {
        const grupo = grupos.find((fila) =>
          fila.movimiento.tipo === 'cargo' && fila.movimiento.ventaId === movimiento.ventaId,
        )
        if (grupo) {
          grupo.movimiento = { ...grupo.movimiento, monto: grupo.movimiento.monto + movimiento.monto }
          grupo.pendiente = Math.round((grupo.pendiente + pendiente) * 100) / 100
          grupo.movimiento.saldoPendiente = grupo.pendiente
        } else {
          grupos.push({
            movimiento: { ...movimiento, saldoPendiente: pendiente },
            pendiente,
          })
        }
      } else {
        grupos.push({ movimiento, pendiente })
      }
      return grupos
    }, [])
    .filter((deuda) => deuda.pendiente > 0.001)

  if (deudas.length === 0) {
    return (
      <EmptyStateCompact
        icon={<NotebookPen size={22} />}
        title="Sin deudas registradas"
        description="Las ventas fiadas y cargos aparecerán acá."
      />
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {deudas.map(({ movimiento, pendiente }) => {
        const items = movimiento.items ?? []
        return (
          <li
            key={movimiento.id}
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-secondary/25"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-display text-sm font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
                {movimiento.ventaId ? `Venta #${movimiento.ventaId}` : tituloMovimiento(movimiento)}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {formatearFechaHora(movimiento.fechaHora)}
              </span>
            </div>

            <div aria-hidden="true" className="mt-2.5 border-t border-dashed border-slate-300 dark:border-slate-700" />

            <div className="custom-scrollbar mt-2 max-h-40 overflow-y-auto overscroll-contain px-1">
              {items.length > 0 ? (
                items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2.5 py-1.5 first:pt-0 last:pb-0">
                    <ImagenProductoDeuda item={item} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-300">
                        {item.descripcionItem}
                      </span>
                      <span className="text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                        {formatearCantidad(item.cantidad)} × {formatearMoneda(item.precioUnitario)}
                      </span>
                    </span>
                    <span className="shrink-0 text-[13px] tabular-nums text-slate-600 dark:text-slate-400">
                      {formatearMoneda(item.subtotal)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-2 text-xs text-slate-500 dark:text-slate-400">
                  {movimiento.nota || 'Este cargo no tiene productos asociados.'}
                </p>
              )}
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-3 border-t border-slate-200 pt-2.5 dark:border-slate-700">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Deuda original
                </span>
                <span className="text-sm font-bold tabular-nums text-slate-700 dark:text-slate-200">
                  {formatearMoneda(movimiento.monto)}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {items.length} {items.length === 1 ? 'producto' : 'productos'}
                </span>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Restante a abonar
                </span>
                <span className="text-sm font-bold tabular-nums text-amber-700 dark:text-amber-300">
                  {formatearMoneda(pendiente)}
                </span>
              </div>
              <Tooltip
                content="El cliente no tiene saldo pendiente para cobrar."
                disabled={saldoCliente > 0}
              >
                <span className="inline-flex" tabIndex={saldoCliente <= 0 ? 0 : undefined}>
                  <Button
                    size="sm"
                    icon={<HandCoins className="h-4 w-4" aria-hidden />}
                    onClick={() => onCobrar(movimiento)}
                disabled={pendiente <= 0 || saldoCliente <= 0}
                  >
                    Cobrar deuda
                  </Button>
                </span>
              </Tooltip>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function ListaMovimientos({ movimientos }: {
  movimientos: MovimientoCuentaCorriente[]
}) {
  if (movimientos.length === 0) {
    return (
      <EmptyStateCompact
        icon={<History size={22} />}
        title="Sin movimientos registrados"
        description="Los cargos, pagos y devoluciones aparecerán acá."
      />
    )
  }

  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {movimientos.map((movimiento) => {
        const esCargo = movimiento.tipo === 'cargo'
        const esReintegro = movimiento.tipo === 'reintegro'
        const Icono = movimiento.tipo === 'cargo'
          ? NotebookPen
          : movimiento.tipo === 'reintegro'
            ? ArrowUpRight
            : movimiento.tipo === 'devolucion'
              ? RotateCcw
              : ArrowDownLeft

        return (
          <li key={movimiento.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-xl',
              esCargo
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            )}>
              <Icono size={17} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {tituloMovimiento(movimiento)}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{formatearFechaHora(movimiento.fechaHora)}</span>
                {movimiento.tipo === 'abono' && movimiento.metodo && (
                  <span>{ETIQUETAS_METODO[movimiento.metodo]}</span>
                )}
                {movimiento.ventaTotal !== null && movimiento.tipo === 'cargo' && (
                  <span>Venta: {formatearMoneda(movimiento.ventaTotal)}</span>
                )}
              </p>
            </div>
            <span className={cn(
              'shrink-0 text-sm font-bold tabular-nums',
              esCargo
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-emerald-700 dark:text-emerald-300',
            )}>
              {esCargo
                ? `Debe ${formatearMoneda(movimiento.monto)}`
                : esReintegro
                  ? `Devuelto ${formatearMoneda(movimiento.monto)}`
                  : `−${formatearMoneda(movimiento.monto)}`}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function ClienteDetalleModal({
  cliente,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onClienteChanged,
  onCobrar,
  pestanaInicial = 'informacion',
}: ClienteDetalleModalProps) {
  const [movimientos, setMovimientos] = useState<MovimientoCuentaCorriente[] | null>(null)

  useEffect(() => {
    if (!isOpen) return
    let activo = true

    void cuentasCorrientesService.getMovimientos({ clienteId: cliente.id })
      .then((lista) => {
        if (activo) setMovimientos(lista)
      })
      .catch((error: unknown) => {
        if (!activo) return
        setMovimientos([])
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los movimientos')
      })

    return () => {
      activo = false
    }
  }, [cliente.id, isOpen])

  const iniciales = cliente.nombre.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0] ?? '').join('').toUpperCase()
  const deudas = movimientos?.filter((movimiento) => movimiento.tipo === 'cargo' || movimiento.tipo === 'reintegro') ?? []
  const deudaMasReciente = deudas.find((movimiento) =>
    !movimiento.ventaAnulada
    && movimiento.tipo === 'cargo'
    && (movimiento.saldoPendiente ?? movimiento.monto) > 0.001,
  ) ?? null

  const pestanas: TabsModalTab[] = [
    {
      id: 'informacion',
      label: 'Info general',
      icon: Info,
      content: (
        <div className="flex min-h-full flex-col divide-y divide-slate-200 dark:divide-slate-800">
          <div className="flex items-center gap-4 pb-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 font-display text-xl font-bold text-emerald-700 dark:text-emerald-300">
              {iniciales || <CircleUserRound size={24} />}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-slate-900 dark:text-slate-100 md:text-lg">{cliente.nombre}</h3>
              <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{cliente.telefono || 'Sin teléfono registrado'}</p>
            </div>
            <span className={cn(
              'ml-auto shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold',
              cliente.saldo > 0
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
            )}>
              {cliente.saldo > 0 ? 'Con deuda' : 'Al día'}
            </span>
          </div>

          <section className="flex flex-1 flex-col py-4">
            <TituloSeccion icon={CircleUserRound}>Datos del cliente</TituloSeccion>
            <dl className="grid flex-1 grid-cols-2 content-between gap-x-6 gap-y-3">
              <Dato className="justify-center" etiqueta="Nombre">{cliente.nombre}</Dato>
              <Dato className="justify-center" etiqueta="Teléfono">{cliente.telefono || 'Sin teléfono registrado'}</Dato>
              <Dato className="justify-center" etiqueta="Cliente desde">{formatearFechaHora(cliente.creadoEn)}</Dato>
            </dl>
          </section>

          <section className="flex flex-1 flex-col py-4">
            <TituloSeccion icon={HandCoins}>Cuenta corriente</TituloSeccion>
            <dl className="grid flex-1 grid-cols-2 content-between gap-x-6 gap-y-3 sm:grid-cols-3">
              <Dato className="justify-center" etiqueta="Saldo pendiente"><span className={cliente.saldo > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}>{formatearMoneda(cliente.saldo)}</span></Dato>
              <Dato className="justify-center" etiqueta="Total cargos">{formatearMoneda(cliente.totalCargos)}</Dato>
              <Dato className="justify-center" etiqueta="Total abonos">{formatearMoneda(cliente.totalAbonos)}</Dato>
            </dl>
          </section>

          <section className="py-4">
            <TituloSeccion icon={HandCoins}>Cobro de deuda</TituloSeccion>
            <div className={cn(
              'flex items-center justify-between gap-3 rounded-xl border p-4',
              deudaMasReciente
                ? 'border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20'
                : 'border-dashed border-slate-200 bg-slate-50/40 dark:border-slate-700/60 dark:bg-slate-900/20',
            )}>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {deudaMasReciente ? 'Deuda más reciente' : 'Estado de cobro'}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {deudaMasReciente
                    ? deudaMasReciente.ventaId
                      ? `Venta #${deudaMasReciente.ventaId}`
                      : tituloMovimiento(deudaMasReciente)
                    : movimientos === null
                      ? 'Cargando deudas...'
                      : cliente.saldo > 0
                        ? 'No hay deudas disponibles para cobrar'
                        : 'Cuenta al día'}
                </p>
                {deudaMasReciente && (
                  <p className="mt-0.5 text-xs tabular-nums text-amber-800 dark:text-amber-300">
                    Restante {formatearMoneda(deudaMasReciente.saldoPendiente ?? deudaMasReciente.monto)}
                  </p>
                )}
              </div>
              {deudaMasReciente && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<HandCoins className="h-4 w-4" aria-hidden />}
                  onClick={() => onCobrar(deudaMasReciente)}
                  className="shrink-0"
                >
                  Cobrar deuda
                </Button>
              )}
            </div>
          </section>

          <section className="flex flex-1 flex-col py-4">
            <TituloSeccion icon={History}>Actividad</TituloSeccion>
            <dl className="grid flex-1 grid-cols-2 content-between gap-x-6 gap-y-3">
              <Dato className="justify-center" etiqueta="Movimientos">{cliente.cantidadMovimientos}</Dato>
              <Dato className="justify-center" etiqueta="Último movimiento">{formatearFechaHora(cliente.ultimoMovimiento)}</Dato>
            </dl>
          </section>

          {cliente.notas && (
            <section className="py-4">
              <TituloSeccion icon={FileText}>Notas</TituloSeccion>
              <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{cliente.notas}</p>
            </section>
          )}
        </div>
      ),
    },
    {
      id: 'deudas',
      label: 'Deudas',
      icon: NotebookPen,
      content: movimientos === null
        ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><Loader2 size={17} className="animate-spin" />Cargando deudas...</div>
        : <ListaDeudas movimientos={deudas} saldoCliente={cliente.saldo} onCobrar={onCobrar} />,
    },
    {
      id: 'movimientos',
      label: 'Movimientos',
      icon: HandCoins,
      content: movimientos === null
        ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><Loader2 size={17} className="animate-spin" />Cargando movimientos...</div>
        : <ListaMovimientos movimientos={movimientos} />,
    },
  ]

  return (
    <TabsModal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalle del cliente"
      headerIcon={<CircleUserRound className="h-4 w-4" />}
      headerExtra={(
        <ToggleActivoCliente
          cliente={cliente}
          onChanged={onClienteChanged}
          onDesactivado={onClose}
        />
      )}
      subheader={(
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="truncate font-medium text-slate-600 dark:text-slate-300">{cliente.nombre}</span>
          <span className={cn('shrink-0 font-semibold tabular-nums', cliente.saldo > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300')}>
            {cliente.saldo > 0 ? `Debe ${formatearMoneda(cliente.saldo)}` : 'Cuenta al día'}
          </span>
        </div>
      )}
      tabs={pestanas}
      defaultTabId={pestanaInicial}
      maxWidth="max-w-2xl"
      footer={(
        <>
          <div className="flex items-center gap-2">
            <Button variant="outline" icon={<Pencil className="h-4 w-4" />} onClick={onEdit}>
              Editar
            </Button>
            <Tooltip
              content={cliente.saldo > 0 ? 'No se puede eliminar porque tiene deuda pendiente.' : 'Eliminar cliente'}
              disabled={cliente.saldo <= 0}
            >
              <span
                className="inline-flex"
                tabIndex={cliente.saldo > 0 ? 0 : undefined}
                aria-label={cliente.saldo > 0 ? 'Eliminar deshabilitado: el cliente tiene deuda pendiente' : undefined}
              >
                <Button
                  variant="ghost"
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={onDelete}
                  disabled={cliente.saldo > 0}
                  className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-500"
                >
                  Eliminar
                </Button>
              </span>
            </Tooltip>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </>
      )}
    />
  )
}
