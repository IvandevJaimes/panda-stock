import { useMemo } from 'react'
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
import { useSettingsStore } from '../../stores/settings.store'
import { useUIStore } from '../../stores/ui.store'
import { SOMBRA_CARD } from './estilos'
import {
  agruparMetodosHabilitados,
  formatearMoneda,
  formatearMonedaCompacta,
  type FilaMetodo,
} from './reportsQuery'

/**
 * Paleta del pie. Va por prop y no con clases `dark:` porque Recharts escribe
 * `fill` como atributo SVG inline y las variantes de Tailwind no lo alcanzan:
 * el sector quedaría del mismo color en los dos temas.
 */
const COLORES: Record<FilaMetodo['metodo'], string> = {
  efectivo: '#10b981',
  transferencia: '#0ea5e9',
  qr: '#8b5cf6',
  debito: '#f59e0b',
  credito: '#ec4899',
  cuenta_corriente: '#64748b',
}
const CLASES_COLOR: Record<FilaMetodo['metodo'], string> = {
  efectivo: 'bg-emerald-500',
  transferencia: 'bg-sky-500',
  qr: 'bg-violet-500',
  debito: 'bg-amber-500',
  credito: 'bg-pink-500',
  cuenta_corriente: 'bg-slate-500',
}

type MetodosPagoChartProps = {
  pagosPorMetodo: readonly { metodo: FilaMetodo['metodo']; monto: number }[]
}

export function MetodosPagoChart({ pagosPorMetodo }: MetodosPagoChartProps) {
  const isDark = useUIStore((state) => state.theme === 'dark')
  const tarjetaHabilitada = useSettingsStore((state) => state.tarjetaHabilitada)
  const transferenciaHabilitada = useSettingsStore((state) => state.transferenciaHabilitada)
  const qrHabilitado = useSettingsStore((state) => state.qrHabilitado)
  const cuentaCorrienteHabilitada = useSettingsStore((state) => state.cuentaCorrienteHabilitada)
  const filas = useMemo(
    () => agruparMetodosHabilitados(pagosPorMetodo, {
      tarjetaHabilitada,
      transferenciaHabilitada,
      qrHabilitado,
      cuentaCorrienteHabilitada,
    }),
    [pagosPorMetodo, tarjetaHabilitada, transferenciaHabilitada, qrHabilitado, cuentaCorrienteHabilitada],
  )
  const total = filas.reduce((acc, fila) => acc + fila.monto, 0)

  return (
    <ChartCard
      title="Medios de pago"
      description="Distribución de cobros registrados con los métodos habilitados."
      icon={<CreditCard size={15} />}
      className={SOMBRA_CARD}
    >
      {filas.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <EmptyState
            title="Sin cobros con métodos habilitados"
            description="No hay pagos registrados con los métodos activos en este período."
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
                  {filas.map((fila) => (
                    <Cell key={fila.metodo} fill={COLORES[fila.metodo]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">Activos</span>
              <span className="max-w-full truncate font-display text-xs font-bold tabular-nums text-slate-900 dark:text-white">
                {formatearMonedaCompacta(total)}
              </span>
            </div>
          </div>

          <ul className="min-w-0 flex-1 space-y-1.5">
            {filas.map((fila) => (
              <li key={fila.metodo}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span
                      className={cn('h-2.5 w-2.5 shrink-0 rounded-full', CLASES_COLOR[fila.metodo])}
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

          </ul>
        </div>
      )}
    </ChartCard>
  )
}
