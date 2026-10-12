import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3 } from 'lucide-react'
import { ChartCard } from '../../components/ui/ChartCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { useUIStore } from '../../stores/ui.store'
import { SOMBRA_CARD } from './estilos'
import {
  etiquetaVisible,
  formatearMoneda,
  formatearMonedaCompacta,
  pasoEje,
  type PuntoDia,
} from './reportsQuery'

type VentasPorDiaChartProps = {
  puntos: PuntoDia[]
}

/** Dinero cobrado por día, con ventas y abonos recibidos en el detalle. */
export function VentasPorDiaChart({ puntos }: VentasPorDiaChartProps) {
  const isDark = useUIStore((state) => state.theme === 'dark')

  const paso = pasoEje(puntos.length)
  const hayDatos = puntos.some((punto) => punto.ventas > 0 || punto.abonos > 0 || punto.total !== 0)

  const ejes = useMemo(
    () => ({
      texto: isDark ? '#94a3b8' : '#64748b',
      grilla: isDark ? '#1e293b' : '#e2e8f0',
      pista: isDark ? '#334155' : '#cbd5e1',
      Tooltip: { bg: isDark ? '#0f172a' : '#ffffff', texto: isDark ? '#e2e8f0' : '#0f172a' },
    }),
    [isDark],
  )

  return (
    <ChartCard
      title="Ingresos cobrados por día"
      description="Pagos de ventas y abonos recibidos, menos devoluciones y reintegros."
      icon={<BarChart3 size={15} />}
      acciones={(
        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Cobros</span>
        </div>
      )}
      className={SOMBRA_CARD}
    >
      {hayDatos ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={puntos} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke={ejes.grilla} strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="etiqueta"
              stroke={ejes.texto}
              tick={{ fontSize: 10, fill: ejes.texto }}
              tickLine={false}
              axisLine={false}
              minTickGap={4}
              interval={0}
              tickFormatter={(valor: string, indice: number) =>
                etiquetaVisible(indice, puntos.length, paso) ? valor : ''
              }
            />
            <YAxis
              stroke={ejes.texto}
              tick={{ fontSize: 10, fill: ejes.texto }}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={formatearMonedaCompacta}
            />

            <RechartsTooltip
              cursor={{ stroke: ejes.pista, strokeDasharray: '3 3' }}
              isAnimationActive={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const punto = payload[0].payload as PuntoDia
                return (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-[#0f172a]">
                    <p className="mb-1 font-display text-xs font-bold text-slate-900 dark:text-white">
                      {label}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {punto.ventas} {punto.ventas === 1 ? 'venta' : 'ventas'} · {punto.unidades} unidades
                    </p>
                    {punto.abonos > 0 && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {punto.abonos} {punto.abonos === 1 ? 'abono recibido' : 'abonos recibidos'}
                      </p>
                    )}
                    <dl className="mt-1.5 space-y-0.5 text-[11px]">
                      <FilaTooltip etiqueta="Cobrado" valor={formatearMoneda(punto.total)} />
                    </dl>
                  </div>
                )
              }}
            />

            <Area
              type="monotone"
              dataKey="total"
              name="Cobros"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#gradIngresos)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center">
          <EmptyState
            title="Sin cobros en el período"
            description="No se registraron pagos ni abonos en este período."
            icon={<BarChart3 size={22} />}
          />
        </div>
      )}
    </ChartCard>
  )
}

function FilaTooltip({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
        {etiqueta}
      </dt>
      <dd className="font-display font-semibold tabular-nums text-slate-900 dark:text-white">
        {valor}
      </dd>
    </div>
  )
}
