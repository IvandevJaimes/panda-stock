import { useMemo } from 'react'
import { Package, TrendingUp } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table'
import { EmptyState } from '../../components/ui/EmptyState'
import { SOMBRA_CARD } from './estilos'
import { formatearMoneda, formatearUnidades, type FilaRanking } from './reportsQuery'

type RankingProductosProps = {
  filas: FilaRanking[]
  criterio: 'unidades' | 'ingresos'
}

const TOPE_RANKING = 10

/** Muestra los diez productos destacados según unidades o venta neta. */
export function RankingProductos({ filas, criterio }: RankingProductosProps) {
  const porIngresos = criterio === 'ingresos'
  const Icono = porIngresos ? TrendingUp : Package
  const visibles = useMemo(
    () => [...filas]
      .sort((a, b) => porIngresos
        ? b.monto - a.monto || a.nombre.localeCompare(b.nombre)
        : b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre))
      .slice(0, TOPE_RANKING),
    [filas, porIngresos],
  )

  return (
    <section className={`w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] ${SOMBRA_CARD}`}>
      <header className="flex items-start gap-2.5 px-4 py-3.5">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${porIngresos ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
          <Icono size={15} />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            {porIngresos ? 'Top 10 · Más ingresos' : 'Top 10 · Más vendidos'}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {porIngresos ? 'Ordenados por venta neta.' : 'Ordenados por unidades vendidas.'}
          </p>
        </div>
      </header>

      {visibles.length === 0 ? (
        <EmptyState
          title="Sin productos vendidos"
          description="No hay ventas en el período seleccionado."
          icon={<Package size={22} />}
        />
      ) : (
        <>
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">{porIngresos ? 'Venta neta' : 'Unidades'}</TableHead>
                  <TableHead className="text-right">{porIngresos ? 'Unidades' : 'Venta neta'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((fila, indice) => (
                  <TableRow
                    key={fila.productoId ?? fila.nombre}
                    className="odd:bg-white even:bg-slate-50/70 dark:odd:bg-[#111827] dark:even:bg-slate-900/35"
                  >
                    <TableCell className="tabular-nums text-slate-400">{indice + 1}</TableCell>
                    <TableCell className="font-medium text-slate-900 dark:text-white">
                      <span className="block max-w-[18rem] truncate">{fila.nombre}</span>
                    </TableCell>
                    <TableCell className="text-right font-display font-semibold tabular-nums text-slate-900 dark:text-white">
                      {porIngresos ? formatearMoneda(fila.monto) : formatearUnidades(fila.cantidad)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-500 dark:text-slate-400">
                      {porIngresos ? formatearUnidades(fila.cantidad) : formatearMoneda(fila.monto)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="divide-y divide-slate-100 px-4 dark:divide-slate-800/60 lg:hidden">
            {visibles.map((fila, indice) => (
              <li
                key={fila.productoId ?? fila.nombre}
                className="flex items-center gap-3 border-b border-slate-100 px-2 py-2.5 odd:bg-slate-50/70 even:bg-white last:border-b-0 dark:border-slate-800/60 dark:odd:bg-slate-900/35 dark:even:bg-transparent"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold tabular-nums text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  {indice + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{fila.nombre}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {porIngresos ? `${formatearUnidades(fila.cantidad)} unidades` : formatearMoneda(fila.monto)}
                  </p>
                </div>
                <span className="shrink-0 font-display text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                  {porIngresos ? formatearMoneda(fila.monto) : `${formatearUnidades(fila.cantidad)} u.`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
