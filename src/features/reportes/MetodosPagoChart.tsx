import { CreditCard } from 'lucide-react'
import { cn } from '../../lib/cn'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { ChartCard } from '../../components/ui/ChartCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { useUIStore } from '../../stores/ui.store'
import { SOMBRA_CARD } from './estilos'
import { formatearMoneda, formatearMonedaCompacta, type FilaMetodo } from './reportsQuery'

/**
 * Paleta del pie. Va por prop y no con clases `dark:` porque Recharts escribe
 * `fill` como atributo SVG inline y las variantes de Tailwind no lo alcanzan:
 * el sector quedaría del mismo color en los dos temas.
 */
const COLORES = ['#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b', '#64748b']
const CLASES_COLOR = ['bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-amber-500', 'bg-slate-500']

type MetodosPagoChartProps = {
  filas: FilaMetodo[]
  /** Total registrado con tarjeta de crédito o en cuenta corriente. */
  totalTarjetaCuentaCorriente: number
}

export function MetodosPagoChart({ filas, totalTarjetaCuentaCorriente }: MetodosPagoChartProps) {
  const isDark = useUIStore((state) => state.theme === 'dark')
  const total = filas.reduce((acc, fila) => acc + fila.monto, 0)

  return (
    <ChartCard
      title="Medios de pago"
      description="Importes registrados por medio de pago, incluida la cuenta corriente."
      icon={<CreditCard size={15} />}
      className={SOMBRA_CARD}
    >
      {filas.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <EmptyState
            title="Sin cobros en el período"
            description="Todavía no hay pagos registrados."
            icon={<CreditCard size={22} />}
          />
        </div>
      ) : (
        <div className="flex h-full min-w-0 flex-row items-center gap-2">
          <div className="relative h-full w-[40%] min-w-24 max-w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <RechartsTooltip
                  isAnimationActive={false}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const punto = payload[0].payload as FilaMetodo
                    return (
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-[#0f172a]">
                        <p className="font-display text-xs font-bold text-slate-900 dark:text-white">
                          {punto.etiqueta}
                        </p>
                        <p className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                          {formatearMoneda(punto.monto)} · {punto.porcentaje.toFixed(1)}%
                        </p>
                      </div>
                    )
                  }}
                />
                <Pie
                  data={filas}
                  dataKey="monto"
                  nameKey="etiqueta"
                  innerRadius="55%"
                  outerRadius="82%"
                  paddingAngle={2}
                  stroke={isDark ? '#111827' : '#ffffff'}
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {filas.map((fila, indice) => (
                    <Cell key={fila.metodo} fill={COLORES[indice % COLORES.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">Registrado</span>
              <span className="max-w-full truncate font-display text-xs font-bold tabular-nums text-slate-900 dark:text-white">
                {formatearMonedaCompacta(total)}
              </span>
            </div>
          </div>

          <ul className="min-w-0 flex-1 space-y-1.5">
            {filas.map((fila, indice) => (
              <li key={fila.metodo}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span
                      className={cn('h-2.5 w-2.5 shrink-0 rounded-full', CLASES_COLOR[indice % CLASES_COLOR.length])}
                      aria-hidden="true"
                    />
                    <span className="truncate">{fila.etiqueta}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
                    {fila.porcentaje.toFixed(1)}%
                  </span>
                </div>
                <ProgressBar value={fila.porcentaje} className="mt-1 h-1" />
              </li>
            ))}

            {/*
              Este número es plata cobrada sin tenerla en mano, no deuda: la deuda
              por persona vive en cuentas corrientes. El texto lo aclara para que
              nadie lea el total como una cuenta por cobrar.
            */}
            <li className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 dark:border-amber-900/60 dark:bg-amber-950/20">
              <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
                Tarjeta y cuenta corriente
              </p>
              <p className="mt-0.5 font-display text-base font-bold tabular-nums text-slate-900 dark:text-white">
                {formatearMoneda(totalTarjetaCuentaCorriente)}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                {total > 0
                  ? `${((totalTarjetaCuentaCorriente / total) * 100).toFixed(1)}% del total registrado en el período.`
                  : 'Sin operaciones en estos medios durante el período.'}
              </p>
            </li>
          </ul>
        </div>
      )}
    </ChartCard>
  )
}
