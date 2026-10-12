import { ArrowDownRight, ArrowUpRight, CircleDollarSign, Minus } from 'lucide-react'
import { cn } from '../../lib/cn'
import { SOMBRA_CARD } from './estilos'
import { calcularResultadoNeto, formatearMoneda } from './reportsQuery'

type ResultadoNetoVentasProps = {
  ventasNetas: number
  costoVendido: number
  perdidasMermas: number
}

export function ResultadoNetoVentas({
  ventasNetas,
  costoVendido,
  perdidasMermas,
}: ResultadoNetoVentasProps) {
  const neto = calcularResultadoNeto(ventasNetas, costoVendido, perdidasMermas)
  const esNegativo = neto < 0

  return (
    <section
      aria-labelledby="resultado-neto-titulo"
      className={cn(
        'overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-white via-white to-emerald-50/80 p-4 dark:border-emerald-900/70 dark:from-[#111827] dark:via-[#111827] dark:to-emerald-950/30 sm:p-5',
        SOMBRA_CARD,
        'animate-entry-up',
      )}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <CircleDollarSign size={19} />
            </span>
            <div>
              <h2 id="resultado-neto-titulo" className="font-display text-sm font-bold text-slate-900 dark:text-white">
                Neto ganado estimado
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Ventas netas menos costo vendido y mermas
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <ImporteFormula etiqueta="Ventas netas" importe={ventasNetas} tipo="suma" />
            <ImporteFormula etiqueta="Costo vendido" importe={costoVendido} tipo="resta" />
            <ImporteFormula etiqueta="Pérdidas por merma" importe={perdidasMermas} tipo="resta" />
          </div>
        </div>

        <div className="flex shrink-0 items-end justify-between gap-4 border-t border-emerald-100 pt-4 dark:border-emerald-900/50 xl:min-w-56 xl:flex-col xl:items-end xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          <div className="xl:text-right">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Resultado del período</p>
            <p className={cn(
              'mt-1 font-display text-3xl font-bold tabular-nums tracking-tight sm:text-4xl',
              esNegativo ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400',
            )}>
              {formatearMoneda(neto)}
            </p>
          </div>
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold xl:self-end',
            esNegativo
              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
          )}>
            {esNegativo ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
            {esNegativo ? 'Resultado negativo' : 'Resultado positivo'}
          </span>
        </div>
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
        Las devoluciones ya están descontadas. Las mermas se estiman con el costo actual del producto; no incluye gastos operativos.
      </p>
    </section>
  )
}

function ImporteFormula({
  etiqueta,
  importe,
  tipo,
}: {
  etiqueta: string
  importe: number
  tipo: 'suma' | 'resta'
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {tipo === 'suma' ? <ArrowUpRight size={12} /> : <Minus size={12} />}
        {etiqueta}
      </p>
      <p className="mt-1 truncate font-display text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">
        {formatearMoneda(importe)}
      </p>
    </div>
  )
}
