import { Banknote, CreditCard, Landmark, QrCode } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useSettingsStore } from '../../stores/settings.store'
import type { MetodoPago } from '../../../electron/db/types'
import { SOMBRA_CARD } from './estilos'
import { formatearMoneda } from './reportsQuery'

type MetodosPagoResumenProps = {
  pagosPorMetodo: readonly { metodo: MetodoPago; monto: number }[]
}

const OPCIONES = [
  {
    clave: 'efectivo',
    etiqueta: 'Efectivo',
    icono: Banknote,
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    borde: 'border-emerald-200/80 dark:border-emerald-900/50',
  },
  {
    clave: 'transferencia',
    etiqueta: 'Transferencia',
    icono: Landmark,
    color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    borde: 'border-sky-200/80 dark:border-sky-900/50',
  },
  {
    clave: 'qr',
    etiqueta: 'QR',
    icono: QrCode,
    color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    borde: 'border-violet-200/80 dark:border-violet-900/50',
  },
  {
    clave: 'tarjeta',
    etiqueta: 'Tarjeta',
    icono: CreditCard,
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    borde: 'border-amber-200/80 dark:border-amber-900/50',
  },
] satisfies {
  clave: 'efectivo' | 'transferencia' | 'qr' | 'tarjeta'
  etiqueta: string
  icono: LucideIcon
  color: string
  borde: string
}[]

export function MetodosPagoResumen({ pagosPorMetodo }: MetodosPagoResumenProps) {
  const tarjetaHabilitada = useSettingsStore((state) => state.tarjetaHabilitada)
  const transferenciaHabilitada = useSettingsStore((state) => state.transferenciaHabilitada)
  const qrHabilitado = useSettingsStore((state) => state.qrHabilitado)

  const habilitados = {
    efectivo: true,
    transferencia: transferenciaHabilitada,
    qr: qrHabilitado,
    tarjeta: tarjetaHabilitada,
  }
  const importes = {
    efectivo: pagosPorMetodo
      .filter((fila) => fila.metodo === 'efectivo')
      .reduce((total, fila) => total + fila.monto, 0),
    transferencia: pagosPorMetodo
      .filter((fila) => fila.metodo === 'transferencia')
      .reduce((total, fila) => total + fila.monto, 0),
    qr: pagosPorMetodo
      .filter((fila) => fila.metodo === 'qr')
      .reduce((total, fila) => total + fila.monto, 0),
    tarjeta: pagosPorMetodo
      .filter((fila) => fila.metodo === 'debito' || fila.metodo === 'credito')
      .reduce((total, fila) => total + fila.monto, 0),
  }

  return (
    <section className={cn('rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-[#111827]', SOMBRA_CARD)}>
      <header className="mb-3">
        <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
          Cobros por método
        </h3>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Importes netos del período. Tarjeta agrupa débito y crédito.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {OPCIONES.map((opcion) => {
          const Icono = opcion.icono
          const activo = habilitados[opcion.clave]

          return (
            <li
              key={opcion.clave}
              className={cn(
                'flex min-w-0 items-start gap-3 rounded-xl border p-3',
                activo
                  ? cn('bg-white dark:bg-slate-900/40', opcion.borde)
                  : 'border-slate-200 bg-slate-50/70 opacity-70 dark:border-slate-800 dark:bg-slate-900/30',
              )}
            >
              <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', opcion.color)}>
                <Icono size={17} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {opcion.etiqueta}
                  </p>
                  <span className={cn(
                    'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                    activo
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                  )}>
                    {activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="mt-1 truncate font-display text-base font-bold tabular-nums text-slate-900 dark:text-white">
                  {formatearMoneda(importes[opcion.clave])}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
        Los métodos inactivos siguen mostrando operaciones registradas en el período.
      </p>
    </section>
  )
}
