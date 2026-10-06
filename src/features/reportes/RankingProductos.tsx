import { Package } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table'
import { EmptyState } from '../../components/ui/EmptyState'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { SOMBRA_CARD } from './estilos'
import { cn } from '../../lib/cn'
import { formatearMoneda, formatearUnidades, margenEsNegativo, type FilaRanking } from './reportsQuery'

type RankingProductosProps = {
  filas: FilaRanking[]
}

/**
 * Ranking por unidades, con el margen al lado.
 *
 * Ordenar por margen y no por unidades es lo que sirve para decidir qué
 * reponer: el producto que más se vendió puede ser el que menos plata deja.
 */
export function RankingProductos({ filas }: RankingProductosProps) {
  if (filas.length === 0) {
    return (
      <section className={`w-full rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] ${SOMBRA_CARD}`}>
        <EmptyState
          title="Sin productos vendidos"
          description="No hay ventas en el período seleccionado."
          icon={<Package size={22} />}
        />
      </section>
    )
  }

  return (
    <section className={`w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] ${SOMBRA_CARD}`}>
      <header className="flex items-start gap-2.5 px-4 py-3.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Package size={15} />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Productos más vendidos
          </h3>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
            Por unidades vendidas. El costo es el que tenía el producto al venderse.
          </p>
        </div>
      </header>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead className="text-right">Unidades</TableHead>
            <TableHead className="text-right">Ingresos</TableHead>
            <TableHead className="text-right">Costo</TableHead>
            <TableHead className="text-right">Margen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((fila, indice) => {
            const negativo = margenEsNegativo(fila.margen)
            return (
              <TableRow key={fila.productoId ?? fila.nombre}>
                <TableCell className="tabular-nums text-slate-400">{indice + 1}</TableCell>
                <TableCell>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900 dark:text-white">{fila.nombre}</p>
                    <ProgressBar value={fila.porcentajeVenta} className="mt-1 h-1 w-24" />
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatearUnidades(fila.cantidad)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-slate-900 dark:text-white">
                  {formatearMoneda(fila.monto)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-slate-500 dark:text-slate-400">
                  {formatearMoneda(fila.costo)}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right font-display font-semibold tabular-nums',
                    negativo
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-600 dark:text-emerald-400',
                  )}
                >
                  {formatearMoneda(fila.margen)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </section>
  )
}