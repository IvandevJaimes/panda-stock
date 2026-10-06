import { Banknote, CreditCard, Landmark, Wallet } from 'lucide-react'
import { KpiCard } from '../../components/ui/KpiCard'
import { SOMBRA_CARD } from './estilos'
import { formatearMoneda } from './reportsQuery'
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
  if (caja === null) {
    return (
      <section className={`w-full rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-[#111827] ${SOMBRA_CARD}`}>
        <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
          Caja activa
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          No hay ninguna caja abierta. Abrila desde la sección Caja para poder cobrar ventas.
        </p>
      </section>
    )
  }

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

      {/*
        El breakpoint baja a 2 columnas en `xl` a propósito. Este bloque vive en
        la columna lateral (1/3 del ancho): a 4 columnas cada card queda de unos
        200px y el monto se corta contra el ícono. Arriba de `xl` la caja ocupa
        el ancho completo, así que ahí sí rinde 4.
      */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-2">
        <KpiCard
          icon={<Wallet size={17} />}
          iconBgClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
          title="Total del turno"
          value={formatearMoneda(resumen?.totalVentas ?? 0)}
          subtitle={`${resumen?.cantidadVentas ?? 0} ${resumen?.cantidadVentas === 1 ? 'venta' : 'ventas'}`}
          className={SOMBRA_CARD}
        />
        <KpiCard
          icon={<Banknote size={17} />}
          iconBgClass="bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400"
          title="Efectivo"
          value={formatearMoneda(resumen?.totalEfectivo ?? 0)}
          subtitle="Cobrado en el mostrador"
          className={SOMBRA_CARD}
        />
        <KpiCard
          icon={<Landmark size={17} />}
          iconBgClass="bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400"
          title="Transferencia"
          value={formatearMoneda(resumen?.totalTransferencia ?? 0)}
          subtitle="Transferencias bancarias"
          className={SOMBRA_CARD}
        />
        <KpiCard
          icon={<CreditCard size={17} />}
          iconBgClass="bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
          title="Tarjeta"
          value={formatearMoneda(resumen?.totalTarjeta ?? 0)}
          subtitle="Débito y crédito"
          className={SOMBRA_CARD}
        />
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Efectivo esperado en gaveta:{' '}
        <span className="font-display font-semibold tabular-nums text-slate-900 dark:text-white">
          {formatearMoneda(resumen?.montoEsperado ?? caja.montoInicial)}
        </span>
        . Es el fondo inicial más el efectivo cobrado; el arqueo lo confirma al cerrar el turno.
      </p>
    </section>
  )
}