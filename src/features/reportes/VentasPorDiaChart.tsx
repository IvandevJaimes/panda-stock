import { useMemo } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
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

/**
 * Ingresos, costo de mercadería vendida y resultado, por día.
 *
 * Ingresos y costo van como áreas y el resultado como línea encima: leer tres
 * áreas superpuestas es peor que ilegible, y lo que el dueño mira primero es si
 * el resultado cruza cero.
 */
export function VentasPorDiaChart({ puntos }: VentasPorDiaChartProps) {
  const isDark = useUIStore((state) => state.theme === 'dark')

  const paso = pasoEje(puntos.length)
  const hayDatos = puntos.some((punto) => punto.total > 0)

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
      title="Ingresos y resultado por día"
      description="El costo es el que tenía la mercadería cuando se vendió, no el precio de compra de hoy."
      icon={<BarChart3 size={15} />}
      className={SOMBRA_CARD}
    >
      {hayDatos ? (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={puntos} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradCosto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
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
                      {punto.ventas} {punto.ventas === 1 ? 'venta' : 'ventas'} ·{' '}
                      {punto.unidades} unidades
                    </p>
                    <dl className="mt-1.5 space-y-0.5 text-[11px]">
                      <FilaTooltip etiqueta="Ingresos" valor={formatearMoneda(punto.total)} color="#10b981" />
                      <FilaTooltip etiqueta="Costo" valor={formatearMoneda(punto.costo)} color="#f59e0b" />
                      <FilaTooltip
                        etiqueta="Resultado"
                        valor={formatearMoneda(punto.resultado)}
                        color={punto.resultado < 0 ? '#ef4444' : '#0ea5e9'}
                      />
                    </dl>
                  </div>
                )
              }}
            />

            <Area
              type="monotone"
              dataKey="total"
              name="Ingresos"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#gradIngresos)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="costo"
              name="Costo"
              stroke="#f59e0b"
              strokeWidth={1.5}
              fill="url(#gradCosto)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="resultado"
              name="Resultado"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center">
          <EmptyState
            title="Sin ventas en el período"
            description="No hay nada que graficar todavía. Ampliá el rango de fechas o registrá una venta."
            icon={<BarChart3 size={22} />}
          />
        </div>
      )}
    </ChartCard>
  )
}

function FilaTooltip({ etiqueta, valor, color }: { etiqueta: string; valor: string; color: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
        {etiqueta}
      </dt>
      <dd className="font-display font-semibold tabular-nums text-slate-900 dark:text-white">
        {valor}
      </dd>
    </div>
  )
}