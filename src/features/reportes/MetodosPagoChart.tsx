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
  const filasPositivas = filas.filter((fila) => fila.monto > 0)
  const totalPositivo = filasPositivas.reduce((acc, fila) => acc + fila.monto, 0)
  const hayReintegrosNetos = filas.some((fila) => fila.monto < 0)

  return (
    <ChartCard
      title="Medios de pago"
      description={hayReintegrosNetos
        ? 'Hay reintegros netos; se omite la distribución porcentual para no mostrar una composición parcial.'
        : 'Distribución de los cobros registrados con los métodos habilitados.'}
      icon={<CreditCard size={15} />}
      className={SOMBRA_CARD}
      contenidoClassName="overflow-visible"
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
                  allowEscapeViewBox={{ x: true, y: true }}
                  wrapperStyle={{ zIndex: 30, pointerEvents: 'none' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const punto = payload[0].payload as FilaMetodo
                    return (
                      <div className="pointer-events-none min-w-40 rounded-xl border border-slate-200/90 bg-white/95 p-3 shadow-xl ring-1 ring-black/5 backdrop-blur-sm dark:border-slate-700 dark:bg-[#0f172a]/95">
                        <div className="mb-2 flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: COLORES[punto.metodo] }}
                            aria-hidden="true"
                          />
                          <p className="font-display text-sm font-bold text-slate-900 dark:text-white">
                            {punto.etiqueta}
                          </p>
                        </div>
                        <div className="flex items-end justify-between gap-4 border-t border-slate-100 pt-2 dark:border-slate-700/80">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Cobrado
                            </p>
                            <p className="mt-0.5 whitespace-nowrap font-display text-base font-bold tabular-nums text-slate-900 dark:text-white">
                              {formatearMoneda(punto.monto)}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {punto.porcentaje?.toFixed(1) ?? '—'}%
                          </span>
                        </div>
                      </div>
                    )
                  }}
                />
                {!hayReintegrosNetos && (
                  <Pie
                    data={filasPositivas}
                    dataKey="monto"
                    nameKey="etiqueta"
                    innerRadius="55%"
                    outerRadius="82%"
                    paddingAngle={2}
                    stroke={isDark ? '#111827' : '#ffffff'}
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {filasPositivas.map((fila) => (
                      <Cell key={fila.metodo} fill={COLORES[fila.metodo]} />
                    ))}
                  </Pie>
                )}
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-center text-[9px] font-medium leading-tight text-slate-400 dark:text-slate-500">
                {hayReintegrosNetos
                  ? 'Neto con reintegros'
                  : filasPositivas.length > 0 ? 'Cobros positivos' : 'Sin cobros positivos'}
              </span>
              <span className="max-w-full truncate font-display text-xs font-bold tabular-nums text-slate-900 dark:text-white">
                {formatearMonedaCompacta(hayReintegrosNetos
                  ? filas.reduce((total, fila) => total + fila.monto, 0)
                  : totalPositivo)}
              </span>
            </div>
          </div>

          <ul className="min-w-0 flex-1 space-y-1.5">
            {hayReintegrosNetos && (
              <li className="pb-1 text-[10px] leading-snug text-amber-700 dark:text-amber-300">
                Los porcentajes y el gráfico se ocultan mientras haya un medio con reintegro neto. Los importes listados conservan su signo.
              </li>
            )}
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
                  <span className="shrink-0 text-right tabular-nums text-slate-500 dark:text-slate-400">
                    <span className="block">{formatearMoneda(fila.monto)}</span>
                    <span className="block text-[10px]">
                      {fila.porcentaje === null
                        ? fila.monto < 0 ? 'Reintegro neto' : 'Distribución omitida'
                        : `${fila.porcentaje.toFixed(1)}%`}
                    </span>
                  </span>
                </div>
                {fila.porcentaje !== null && (
                  <ProgressBar value={fila.porcentaje} className="mt-1 h-1" />
                )}
              </li>
            ))}

          </ul>
        </div>
      )}
    </ChartCard>
  )
}
