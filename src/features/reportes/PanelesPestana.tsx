import { ArrowDownRight, ArrowUpRight, PackageX, Trash2 } from 'lucide-react'
import type { ReportesSummary } from '../../../electron/db/types'
import { SOMBRA_CARD } from './estilos'
import { cn } from '../../lib/cn'
import { etiquetaMovimiento, filasMovimientos } from './metricasPestana'
import { MovimientosRecientes } from './MovimientosRecientes'
import { formatearMoneda, formatearUnidades } from './reportsQuery'

const ICONO_TIPO: Record<string, typeof ArrowUpRight> = {
  entrada: ArrowDownRight,
  ajuste_positivo: ArrowDownRight,
  devolucion: ArrowUpRight,
  venta: ArrowUpRight,
  ajuste_negativo: ArrowUpRight,
  merma: Trash2,
}

const COLOR_TIPO: Record<string, string> = {
  entrada: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  ajuste_positivo: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  devolucion: 'bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400',
  venta: 'bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
  ajuste_negativo: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  merma: 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
}

export function MovimientosPanel({ resumen }: { resumen: ReportesSummary | null }) {
  const filas = filasMovimientos(resumen)
  const totalUnidades = filas.reduce((acc, fila) => acc + fila.unidades, 0)

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-[#111827] ${SOMBRA_CARD}`}>
        <div className="flex items-start gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <PackageX size={15} />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Movimientos por tipo
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Todo movimiento de mercadería del período. Las ventas y las mermas se ven con más
              detalle en sus pestañas, pero acá están contadas porque también mueven stock.
            </p>
          </div>
        </div>

        {filas.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-50 px-3 py-6 text-center text-xs text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
            No hubo movimientos de mercadería en el período.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {filas.map((fila) => {
              const Icono = ICONO_TIPO[fila.tipo] ?? ArrowUpRight
              const proporcion = totalUnidades > 0 ? (fila.unidades / totalUnidades) * 100 : 0

              return (
                <div key={fila.tipo} className="flex items-center gap-3">
                  <span
                    className={cn(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-lg',
                      COLOR_TIPO[fila.tipo] ?? COLOR_TIPO.venta,
                    )}
                  >
                    <Icono size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                        {etiquetaMovimiento(fila.tipo)}
                      </span>
                      <span className="shrink-0 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                        {fila.cantidad} mov. · {formatearUnidades(fila.unidades)} u.
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-slate-400 dark:bg-slate-500"
                        style={{ width: `${proporcion}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <MovimientosRecientes />
    </div>
  )
}

export function PerdidasPanel({ resumen }: { resumen: ReportesSummary | null }) {
  const perdidas = resumen?.perdidas
  const filas = perdidas?.porProducto ?? []

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-[#111827] ${SOMBRA_CARD}`}>
        <div className="flex items-start gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <PackageX size={15} />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Mermas por producto
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Solo cuentan las mermas. Un ajuste de inventario puede ser una corrección de conteo y
              una devolución devuelve mercadería vendible: ninguna de las dos es una pérdida.
            </p>
          </div>
        </div>

        {filas.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-50 px-3 py-6 text-center text-xs text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
            No se registraron mermas en el período.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:text-slate-500">
                  <th className="pb-2 pr-3 font-medium">Producto</th>
                  <th className="pb-2 pr-3 text-right font-medium">Unidades</th>
                  <th className="pb-2 pr-3 text-right font-medium">Costo unit.</th>
                  <th className="pb-2 text-right font-medium">Perdido</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr
                    key={fila.productoId ?? fila.nombre}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800/60"
                  >
                    <td className="py-2 pr-3 font-medium text-slate-700 dark:text-slate-200">
                      {fila.nombre}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                      {formatearUnidades(fila.unidades)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-500 dark:text-slate-400">
                      {formatearMoneda(fila.costoUnitario)}
                    </td>
                    <td className="py-2 text-right font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                      {formatearMoneda(fila.perdido)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 dark:border-slate-800">
                  <td className="pt-2 font-semibold text-slate-900 dark:text-white">Total</td>
                  <td className="pt-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {formatearUnidades(perdidas?.unidadesPerdidas ?? 0)}
                  </td>
                  <td />
                  <td className="pt-2 text-right font-display font-bold tabular-nums text-rose-600 dark:text-rose-400">
                    {formatearMoneda(perdidas?.plataPerdida ?? 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export function CortesPanel({ resumen }: { resumen: ReportesSummary | null }) {
  const cortes = resumen?.cortes
  const filas = cortes?.cortes ?? []

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-[#111827] ${SOMBRA_CARD}`}>
        <div className="flex items-start gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <PackageX size={15} />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Arqueos de caja
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Turnos cerrados del período. Cada corte cuenta según la fecha en que se cerró, que es
              cuando se supo cuánto se cobró.
            </p>
          </div>
        </div>

        {filas.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-50 px-3 py-6 text-center text-xs text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
            No se cerró ninguna caja en el período.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:text-slate-500">
                  <th className="pb-2 pr-3 font-medium">Cierre</th>
                  <th className="pb-2 pr-3 font-medium">Responsable</th>
                  <th className="pb-2 pr-3 text-right font-medium">Inicial</th>
                  <th className="pb-2 pr-3 text-right font-medium">Esperado</th>
                  <th className="pb-2 pr-3 text-right font-medium">Real</th>
                  <th className="pb-2 text-right font-medium">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => {
                  const diferencia = fila.diferencia ?? 0

                  return (
                    <tr
                      key={fila.id}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800/60"
                    >
                      <td className="py-2 pr-3 font-medium text-slate-700 dark:text-slate-200">
                        {fila.fechaCierre ? formatearFechaHora(fila.fechaCierre) : 'Sin fecha'}
                      </td>
                      <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">
                        {fila.empleadoNombre}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-slate-500 dark:text-slate-400">
                        {formatearMoneda(fila.montoInicial)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-slate-500 dark:text-slate-400">
                        {fila.montoEsperado === null ? '—' : formatearMoneda(fila.montoEsperado)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-slate-500 dark:text-slate-400">
                        {fila.montoReal === null ? '—' : formatearMoneda(fila.montoReal)}
                      </td>
                      <td
                        className={cn(
                          'py-2 text-right font-semibold tabular-nums',
                          diferencia === 0
                            ? 'text-slate-400 dark:text-slate-500'
                            : diferencia < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400',
                        )}
                      >
                        {diferencia === 0 ? '0,00' : formatearMoneda(diferencia)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function formatearFechaHora(fechaISO: string): string {
  const [fecha, hora] = fechaISO.split('T')
  if (!fecha || !hora) return fechaISO
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)} · ${hora.slice(0, 5)}`
}