import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, PackageX, Trash2 } from 'lucide-react'
import { CustomSelect } from '../../components/ui/CustomSelect'
import { EmptySearch } from '../../components/ui/EmptySearch'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import type { ReportesSummary, TipoMovimientoStock } from '../../../electron/db/types'
import { SOMBRA_CARD } from './estilos'
import { cn } from '../../lib/cn'
import { etiquetaMovimiento, filasMovimientos } from './metricasPestana'
import { MovimientosRecientes } from './MovimientosRecientes'
import { formatearMoneda, formatearUnidades } from './reportsQuery'
import { BarraFiltrosReporte, PaginacionReporte } from './TablaReporteUI'

const POR_PAGINA = 30

const ICONO_TIPO: Record<TipoMovimientoStock, typeof ArrowUpRight> = {
  entrada: ArrowDownRight,
  ajuste_positivo: ArrowDownRight,
  devolucion: ArrowUpRight,
  venta: ArrowUpRight,
  ajuste_negativo: ArrowUpRight,
  merma: Trash2,
}

const COLOR_TIPO: Record<TipoMovimientoStock, string> = {
  entrada: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  ajuste_positivo: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  devolucion: 'bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400',
  venta: 'bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
  ajuste_negativo: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  merma: 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
}

export function MovimientosPanel({
  resumen,
  desde,
  hasta,
}: {
  resumen: ReportesSummary | null
  desde: string | null
  hasta: string | null
}) {
  const filas = filasMovimientos(resumen)
  const totalUnidades = filas.reduce((acc, fila) => acc + fila.unidades, 0)

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(16rem,0.75fr)_minmax(0,1.5fr)]">
      <div className={`h-fit rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-[#111827] ${SOMBRA_CARD}`}>
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
                      COLOR_TIPO[fila.tipo],
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
                    <ProgressBar value={proporcion} variant="emerald" className="mt-1 bg-slate-100 dark:bg-slate-800" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <MovimientosRecientes desde={desde} hasta={hasta} />
    </div>
  )
}

export function PerdidasPanel({ resumen }: { resumen: ReportesSummary | null }) {
  const perdidas = resumen?.perdidas
  const filas = useMemo(() => perdidas?.porProducto ?? [], [perdidas])
  const [buscar, setBuscar] = useState('')
  const [pagina, setPagina] = useState(1)
  const filtradas = useMemo(() => {
    const consulta = buscar.trim().toLocaleLowerCase('es-AR')
    return consulta
      ? filas.filter((fila) => fila.nombre.toLocaleLowerCase('es-AR').includes(consulta))
      : filas
  }, [filas, buscar])
  const visibles = useMemo(
    () => filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    [filtradas, pagina],
  )

  return (
    <section className={`overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] ${SOMBRA_CARD}`}>
      <header className="flex items-start gap-2.5 px-4 py-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400"><PackageX size={17} /></span>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">Mermas por producto</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            Importe estimado de las unidades descartadas por producto.
          </p>
        </div>
      </header>
      <BarraFiltrosReporte
        buscar={buscar}
        onBuscarChange={(valor) => { setBuscar(valor); setPagina(1) }}
        placeholder="Buscar producto"
        total={filtradas.length}
      />
      {filtradas.length === 0 ? filas.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
          No se registraron mermas en el período.
        </p>
      ) : (
        <EmptySearch onClear={() => { setBuscar(''); setPagina(1) }} />
      ) : (
        <>
          <div className="hidden lg:block">
            <Table>
              <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Unidades</TableHead><TableHead className="text-right">Pérdida estimada</TableHead></TableRow></TableHeader>
              <TableBody>
                {visibles.map((fila) => (
                  <TableRow key={fila.productoId ?? fila.nombre}>
                    <TableCell className="font-medium text-slate-900 dark:text-white">{fila.nombre}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatearUnidades(fila.unidades)}</TableCell>
                    <TableCell className="text-right font-display font-bold tabular-nums text-rose-600 dark:text-rose-400">{formatearMoneda(fila.perdido)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="divide-y divide-slate-100 px-4 dark:divide-slate-800/60 lg:hidden">
            {visibles.map((fila) => (
              <li key={fila.productoId ?? fila.nombre} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{fila.nombre}</p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {formatearUnidades(fila.unidades)} unidades descartadas
                  </p>
                </div>
                <p className="shrink-0 font-display text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">{formatearMoneda(fila.perdido)}</p>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800/60">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Pérdidas estimadas · {formatearUnidades(perdidas?.unidadesPerdidas ?? 0)} unidades</span>
            <span className="font-display text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">{formatearMoneda(perdidas?.plataPerdida ?? 0)}</span>
          </div>
          <PaginacionReporte pagina={pagina} tamanoPagina={POR_PAGINA} total={filtradas.length} onCambiarPagina={setPagina} />
        </>
      )}
    </section>
  )
}

export function CortesPanel({ resumen }: { resumen: ReportesSummary | null }) {
  const cortes = resumen?.cortes
  const filas = useMemo(() => cortes?.cortes ?? [], [cortes])
  const [buscar, setBuscar] = useState('')
  const [filtroDiferencia, setFiltroDiferencia] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const filtradas = useMemo(() => {
    const consulta = buscar.trim().toLocaleLowerCase('es-AR')
    return filas.filter((fila) => {
      const diferencia = fila.diferencia ?? 0
      if (filtroDiferencia === 'descuadre' && diferencia === 0) return false
      if (filtroDiferencia === 'cuadradas' && diferencia !== 0) return false
      if (!consulta) return true
      return [
        String(fila.id),
        fila.empleadoNombre,
        fila.fechaCierre ?? '',
        fila.observaciones ?? '',
      ].some((valor) => valor.toLocaleLowerCase('es-AR').includes(consulta))
    })
  }, [filas, buscar, filtroDiferencia])
  const visibles = useMemo(
    () => filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    [filtradas, pagina],
  )

  return (
    <section className={cn('overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827]', SOMBRA_CARD)}>
      <header className="flex items-start gap-2.5 px-4 py-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400"><PackageX size={17} /></span>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">Arqueos de caja</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            Turnos cerrados en el período, ordenados por fecha de cierre.
          </p>
        </div>
      </header>
      <BarraFiltrosReporte
        buscar={buscar}
        onBuscarChange={(valor) => { setBuscar(valor); setPagina(1) }}
        placeholder="Buscar por responsable, fecha o nota"
        total={filtradas.length}
      >
        <div className="w-full sm:w-48">
          <CustomSelect
            value={filtroDiferencia}
            options={[
              { value: 'todos', label: 'Todos los cierres' },
              { value: 'descuadre', label: 'Con diferencia' },
              { value: 'cuadradas', label: 'Sin diferencia' },
            ]}
            onChange={(valor) => { setFiltroDiferencia(String(valor)); setPagina(1) }}
            buttonClassName="h-10 text-xs"
          />
        </div>
      </BarraFiltrosReporte>
      {filtradas.length === 0 ? filas.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
          No se cerró ninguna caja en el período.
        </p>
      ) : (
        <EmptySearch
          onClear={() => {
            setBuscar('')
            setFiltroDiferencia('todos')
            setPagina(1)
          }}
        />
      ) : (
        <>
          <div className="hidden lg:block">
            <Table>
              <TableHeader><TableRow><TableHead>Cierre</TableHead><TableHead>Responsable</TableHead><TableHead className="text-right">Inicial</TableHead><TableHead className="text-right">Esperado</TableHead><TableHead className="text-right">Real</TableHead><TableHead className="text-right">Diferencia</TableHead></TableRow></TableHeader>
              <TableBody>
                {visibles.map((fila) => {
                  const diferencia = fila.diferencia ?? 0
                  return (
                    <TableRow key={fila.id}>
                      <TableCell className="whitespace-nowrap text-xs tabular-nums text-slate-500 dark:text-slate-400">{fila.fechaCierre ? formatearFechaHora(fila.fechaCierre) : 'Sin fecha'}</TableCell>
                      <TableCell className="font-medium text-slate-900 dark:text-white">{fila.empleadoNombre}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatearMoneda(fila.montoInicial)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fila.montoEsperado === null ? '—' : formatearMoneda(fila.montoEsperado)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fila.montoReal === null ? '—' : formatearMoneda(fila.montoReal)}</TableCell>
                      <TableCell className={cn('text-right font-display font-bold tabular-nums', diferencia === 0 ? 'text-slate-400 dark:text-slate-500' : diferencia < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400')}>
                        {diferencia === 0 ? formatearMoneda(0) : formatearMoneda(diferencia)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <ul className="divide-y divide-slate-100 px-4 dark:divide-slate-800/60 lg:hidden">
            {visibles.map((fila) => {
              const diferencia = fila.diferencia ?? 0
              return (
                <li key={fila.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{fila.empleadoNombre}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{fila.fechaCierre ? formatearFechaHora(fila.fechaCierre) : 'Sin fecha'}</p>
                    </div>
                    <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold', diferencia === 0 ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : diferencia < 0 ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400')}>
                      {diferencia === 0 ? 'Cuadrada' : formatearMoneda(diferencia)}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                    <span>Inicial <strong className="block text-xs tabular-nums text-slate-700 dark:text-slate-200">{formatearMoneda(fila.montoInicial)}</strong></span>
                    <span>Esperado <strong className="block text-xs tabular-nums text-slate-700 dark:text-slate-200">{fila.montoEsperado === null ? '—' : formatearMoneda(fila.montoEsperado)}</strong></span>
                    <span>Real <strong className="block text-xs tabular-nums text-slate-700 dark:text-slate-200">{fila.montoReal === null ? '—' : formatearMoneda(fila.montoReal)}</strong></span>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800/60">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Diferencia acumulada del período</span>
            <span className={cn('font-display text-sm font-bold tabular-nums', (cortes?.diferenciaTotal ?? 0) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400')}>
              {formatearMoneda(cortes?.diferenciaTotal ?? 0)}
            </span>
          </div>
          <PaginacionReporte pagina={pagina} tamanoPagina={POR_PAGINA} total={filtradas.length} onCambiarPagina={setPagina} />
        </>
      )}
    </section>
  )
}

function formatearFechaHora(fechaISO: string): string {
  const [fecha, hora] = fechaISO.split('T')
  if (!fecha || !hora) return fechaISO
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)} · ${hora.slice(0, 5)}`
}
