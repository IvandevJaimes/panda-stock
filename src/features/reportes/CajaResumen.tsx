import { Banknote, CreditCard, Landmark, QrCode, Wallet } from 'lucide-react'
import { cn } from '../../lib/cn'
import { SOMBRA_CARD } from './estilos'
import { formatearMoneda } from './reportsQuery'
import { useSettingsStore } from '../../stores/settings.store'
import type { CajaConResponsable, CajaSummary } from '../../../electron/db/types'

type CajaResumenProps = {
  caja: CajaConResponsable | null
  resumen: CajaSummary | null
}

/**
 * Estado de la caja activa.
 *
 * A diferencia del resto de la pantalla, este bloque NO respeta el filtro de
 * fechas: el backend corta por caja, no por período, y el monto es el del turno
 * abierto. Por eso el título lo dice de entrada, para que nadie compare este
 * total contra los KPIs del período y lea una diferencia inexistente.
 */
export function CajaResumen({ caja, resumen }: CajaResumenProps) {
  const ventasPorCajas = useSettingsStore((estado) => estado.ventasPorCajas)

  if (caja === null) {
    return (
      <section className={`w-full rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-[#111827] ${SOMBRA_CARD}`}>
        <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
          Caja activa
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {ventasPorCajas
            ? 'No hay ninguna caja abierta. Abrila desde el encabezado para poder cobrar ventas.'
            : 'Las ventas por caja están desactivadas en Configuración. Se cobra directamente desde el POS.'}
        </p>
      </section>
    )
  }

  const metodos = [
    {
      etiqueta: 'Efectivo neto',
      importe: resumen?.totalEfectivo ?? 0,
      detalle: resumen?.totalEgresosEfectivo
        ? `${formatearMoneda(resumen.totalEgresosEfectivo)} reintegrados`
        : 'Cobros netos',
      Icono: Banknote,
      tono: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    },
    {
      etiqueta: 'Transferencia',
      importe: resumen?.totalTransferencia ?? 0,
      detalle: 'Transferencias bancarias',
      Icono: Landmark,
      tono: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    },
    {
      etiqueta: 'QR',
      importe: resumen?.totalQr ?? 0,
      detalle: 'Pagos con QR',
      Icono: QrCode,
      tono: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400',
    },
    {
      etiqueta: 'Tarjeta',
      importe: resumen?.totalTarjeta ?? 0,
      detalle: 'Débito y crédito',
      Icono: CreditCard,
      tono: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
  ]

  return (
    <section className={`w-full rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-[#111827] ${SOMBRA_CARD}`}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Caja activa
          </h3>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
            Turno de {caja.empleadoNombre}. Esta caja no cambia con el filtro de fechas: es el
            total del turno abierto, no del período.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          Abierta
        </span>
      </header>

      <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3.5 dark:border-emerald-900/60 dark:from-emerald-950/30 dark:to-slate-900/70">
        <div className="flex items-center justify-between gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            <Wallet size={18} />
          </span>
          <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium tabular-nums text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
            {resumen?.cantidadVentas ?? 0} {(resumen?.cantidadVentas ?? 0) === 1 ? 'venta' : 'ventas'}
          </span>
        </div>
        <p className="mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">Total del turno</p>
        <p className="mt-0.5 truncate font-display text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
          {formatearMoneda(resumen?.totalVentas ?? 0)}
        </p>
      </div>

      <div className="mt-3 grid gap-2 2xl:grid-cols-2">
        {metodos.map(({ etiqueta, importe, detalle, Icono, tono }) => (
          <div key={etiqueta} className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-100 px-3 py-2.5 dark:border-slate-800/70">
            <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', tono)}>
              <Icono size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">{etiqueta}</p>
              <p className="truncate font-display text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                {formatearMoneda(importe)}
              </p>
              <p className="truncate text-[10px] text-slate-400 dark:text-slate-500">{detalle}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Efectivo esperado en gaveta:{' '}
        <span className="font-display font-semibold tabular-nums text-slate-900 dark:text-white">
          {formatearMoneda(resumen?.montoEsperado ?? caja.montoInicial)}
        </span>
        . Incluye el fondo inicial, cobros en efectivo y egresos por devoluciones; el arqueo lo confirma al cerrar el turno.
      </p>
    </section>
  )
}
