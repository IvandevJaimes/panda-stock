import { useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { ClipboardList } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { CustomSelect } from '../../components/ui/CustomSelect'
import { EmptySearch } from '../../components/ui/EmptySearch'
import { Modal } from '../../components/ui/Modal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import { cn } from '../../lib/cn'
import { SOMBRA_CARD } from './estilos'
import { BarraFiltrosReporte, PaginacionReporte } from './TablaReporteUI'
import { formatearMoneda } from './reportsQuery'
import type { CorteCaja, ReportesSummary } from '../../../electron/db/types'

const POR_PAGINA = 30
type FiltroCorte = 'todos' | 'descuadres' | 'cuadradas' | 'sin_datos'

const OPCIONES_FILTRO: { value: FiltroCorte; label: string }[] = [
  { value: 'todos', label: 'Todos los cierres' },
  { value: 'descuadres', label: 'Con diferencia' },
  { value: 'cuadradas', label: 'Sin diferencia' },
  { value: 'sin_datos', label: 'Sin datos de arqueo' },
]

function formatearFechaHora(fechaISO: string | null): string {
  if (!fechaISO) return 'Sin fecha'
  const fecha = new Date(fechaISO)
  if (Number.isNaN(fecha.getTime())) return 'Sin fecha'
  return fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

function formatearDuracionCaja(apertura: string | null, cierre: string | null): string {
  if (!apertura || !cierre) return '—'
  const milisegundos = new Date(cierre).getTime() - new Date(apertura).getTime()
  if (!Number.isFinite(milisegundos) || milisegundos < 0) return '—'

  const minutosTotales = Math.floor(milisegundos / 60_000)
  const dias = Math.floor(minutosTotales / 1_440)
  const horas = Math.floor((minutosTotales % 1_440) / 60)
  const minutos = minutosTotales % 60
  const partes: string[] = []

  if (dias > 0) partes.push(`${dias} ${dias === 1 ? 'día' : 'días'}`)
  if (horas > 0) partes.push(`${horas} h`)
  if (minutos > 0 || partes.length === 0) partes.push(`${minutos} min`)

  return partes.join(' ')
}

function estadoCorte(corte: CorteCaja) {
  if (corte.diferencia === null) {
    return {
      etiqueta: 'Sin datos de arqueo',
      clase: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
      valorClase: 'text-slate-400 dark:text-slate-500',
    }
  }
  if (corte.diferencia === 0) {
    return {
      etiqueta: 'Cuadrada',
      clase: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      valorClase: 'text-slate-500 dark:text-slate-400',
    }
  }
  if (corte.diferencia < 0) {
    return {
      etiqueta: 'Faltante',
      clase: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
      valorClase: 'text-rose-600 dark:text-rose-400',
    }
  }
  return {
    etiqueta: 'Sobrante',
    clase: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    valorClase: 'text-emerald-600 dark:text-emerald-400',
  }
}

function DatoCorte({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 border-b border-slate-100 py-2 dark:border-slate-800">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {etiqueta}
      </dt>
      <dd className="break-words text-sm font-semibold text-slate-800 dark:text-slate-200">
        {valor}
      </dd>
    </div>
  )
}

function DetalleCorte({ corte }: { corte: CorteCaja }) {
  const estado = estadoCorte(corte)

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Responsable
          </p>
          <h3 className="mt-1 font-display text-base font-bold text-slate-900 dark:text-white">
            {corte.empleadoNombre}
          </h3>
        </div>
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', estado.clase)}>
          {estado.etiqueta}
        </span>
      </section>

      <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        <DatoCorte etiqueta="Apertura" valor={formatearFechaHora(corte.fechaApertura)} />
        <DatoCorte etiqueta="Cierre" valor={formatearFechaHora(corte.fechaCierre)} />
        <DatoCorte etiqueta="Duración de la caja" valor={formatearDuracionCaja(corte.fechaApertura, corte.fechaCierre)} />
        <DatoCorte etiqueta="Monto esperado" valor={corte.montoEsperado === null ? '—' : formatearMoneda(corte.montoEsperado)} />
        <DatoCorte etiqueta="Monto real" valor={corte.montoReal === null ? '—' : formatearMoneda(corte.montoReal)} />
        <DatoCorte
          etiqueta="Diferencia (real − esperado)"
          valor={corte.diferencia === null ? 'Sin datos de arqueo' : formatearMoneda(corte.diferencia)}
        />
      </dl>

      <section className="border-l-2 border-slate-300 pl-3 dark:border-slate-700">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Nota
        </h3>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-300">
          {corte.observaciones?.trim() || 'Sin nota registrada'}
        </p>
      </section>
    </div>
  )
}

export function CortesPanel({ resumen }: { resumen: ReportesSummary | null }) {
  const cortes = resumen?.cortes
  const filas = useMemo(() => cortes?.cortes ?? [], [cortes])
  const [buscar, setBuscar] = useState('')
  const [filtro, setFiltro] = useState<FiltroCorte>('todos')
  const [pagina, setPagina] = useState(1)
  const [seleccionado, setSeleccionado] = useState<CorteCaja | null>(null)

  const filtradas = useMemo(() => {
    const consulta = buscar.trim().toLocaleLowerCase('es-AR')
    return filas.filter((corte) => {
      if (filtro === 'descuadres' && (corte.diferencia === null || corte.diferencia === 0)) return false
      if (filtro === 'cuadradas' && corte.diferencia !== 0) return false
      if (filtro === 'sin_datos' && corte.diferencia !== null) return false
      if (!consulta) return true
      return [
        String(corte.id),
        corte.empleadoNombre,
        corte.fechaApertura ?? '',
        corte.fechaCierre ?? '',
        corte.observaciones ?? '',
        String(corte.montoEsperado ?? ''),
        String(corte.montoReal ?? ''),
      ].some((valor) => valor.toLocaleLowerCase('es-AR').includes(consulta))
    })
  }, [filas, buscar, filtro])
  const visibles = useMemo(
    () => filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    [filtradas, pagina],
  )

  const limpiarFiltros = () => {
    setBuscar('')
    setFiltro('todos')
    setPagina(1)
  }
  const seleccionarCorte = (corte: CorteCaja) => setSeleccionado(corte)
  const abrirConTeclado = (evento: KeyboardEvent<HTMLTableRowElement>, corte: CorteCaja) => {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault()
      seleccionarCorte(corte)
    }
  }

  return (
    <>
      <section className={cn('w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827]', SOMBRA_CARD)}>
        <header className="flex items-start gap-2.5 px-4 py-3.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <ClipboardList size={15} aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Arqueos de caja
            </h3>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              Turnos cerrados en el período, ordenados por fecha de cierre.
            </p>
          </div>
        </header>

        <BarraFiltrosReporte
          buscar={buscar}
          onBuscarChange={(valor) => { setBuscar(valor); setPagina(1) }}
          onClearFilters={limpiarFiltros}
          hayFiltrosActivos={buscar.trim() !== '' || filtro !== 'todos'}
          placeholder="Buscar responsable, fecha o nota"
          total={filtradas.length}
        >
          <div className="w-full sm:w-48">
            <CustomSelect
              value={filtro}
              options={OPCIONES_FILTRO}
              onChange={(valor) => { setFiltro(String(valor) as FiltroCorte); setPagina(1) }}
              buttonClassName="h-10 text-xs"
            />
          </div>
        </BarraFiltrosReporte>

        {filtradas.length === 0 ? filas.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No se cerró ninguna caja en el período.
          </p>
        ) : (
          <EmptySearch onClear={limpiarFiltros} />
        ) : (
          <>
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cierre</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead className="text-right">Esperado</TableHead>
                    <TableHead className="text-right">Real</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibles.map((corte) => {
                    const estado = estadoCorte(corte)
                    return (
                      <TableRow
                        key={corte.id}
                        tabIndex={0}
                        aria-label={`Ver detalle del corte ${corte.id}, ${corte.empleadoNombre}`}
                        onClick={() => seleccionarCorte(corte)}
                        onKeyDown={(evento) => abrirConTeclado(evento, corte)}
                        className="cursor-pointer odd:bg-white even:bg-slate-50/70 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-500 dark:odd:bg-[#111827] dark:even:bg-slate-900/35 dark:hover:bg-slate-800/70"
                      >
                        <TableCell className="whitespace-nowrap text-xs tabular-nums text-slate-500 dark:text-slate-400">
                          {formatearFechaHora(corte.fechaCierre)}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900 dark:text-white">
                          {corte.empleadoNombre}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {corte.montoEsperado === null ? '—' : formatearMoneda(corte.montoEsperado)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {corte.montoReal === null ? '—' : formatearMoneda(corte.montoReal)}
                        </TableCell>
                        <TableCell className={cn('text-right font-display font-bold tabular-nums', estado.valorClase)}>
                          {corte.diferencia === null ? 'Sin datos' : formatearMoneda(corte.diferencia)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <ul className="lg:hidden">
              {visibles.map((corte, indice) => {
                const estado = estadoCorte(corte)
                return (
                  <li
                    key={corte.id}
                    className={cn(
                      'border-b border-slate-100 dark:border-slate-800/60',
                      indice % 2 === 0
                        ? 'bg-slate-50/60 dark:bg-slate-900/20'
                        : 'bg-white dark:bg-transparent',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => seleccionarCorte(corte)}
                      className="w-full cursor-pointer px-3 py-3 text-left transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-500 dark:hover:bg-slate-800/70"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {corte.empleadoNombre}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {formatearFechaHora(corte.fechaCierre)} · Corte #{corte.id}
                          </p>
                        </div>
                        <span className={cn('max-w-[45%] shrink-0 rounded-full px-2.5 py-1 text-right text-[10px] font-semibold', estado.clase)}>
                          {corte.diferencia === null
                            ? 'Sin datos'
                            : `${estado.etiqueta} · ${formatearMoneda(Math.abs(corte.diferencia))}`}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                        <span>
                          Esperado
                          <strong className="block truncate text-xs tabular-nums text-slate-700 dark:text-slate-200">
                            {corte.montoEsperado === null ? '—' : formatearMoneda(corte.montoEsperado)}
                          </strong>
                        </span>
                        <span>
                          Real
                          <strong className="block truncate text-xs tabular-nums text-slate-700 dark:text-slate-200">
                            {corte.montoReal === null ? '—' : formatearMoneda(corte.montoReal)}
                          </strong>
                        </span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>

            <PaginacionReporte
              pagina={pagina}
              tamanoPagina={POR_PAGINA}
              total={filtradas.length}
              onCambiarPagina={setPagina}
            />
          </>
        )}
      </section>

      <Modal
        isOpen={seleccionado !== null}
        onClose={() => setSeleccionado(null)}
        title={`Detalle del corte${seleccionado ? ` #${seleccionado.id}` : ''}`}
        subtitle={seleccionado ? formatearFechaHora(seleccionado.fechaCierre) : undefined}
        headerIcon={<ClipboardList size={18} aria-hidden="true" />}
        maxWidth="xl"
        footer={(
          <Button variant="outline" onClick={() => setSeleccionado(null)}>
            Cerrar
          </Button>
        )}
      >
        {seleccionado && <DetalleCorte corte={seleccionado} />}
      </Modal>
    </>
  )
}
