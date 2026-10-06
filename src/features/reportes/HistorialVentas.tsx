import { useEffect, useMemo, useState } from 'react'
import { History, Receipt } from 'lucide-react'
import { Pagination } from '../../components/ui/Pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table'
import { SOMBRA_CARD } from './estilos'
import { ventasService } from '../../services/ventas.service'
import { cn } from '../../lib/cn'
import { formatearMoneda, formatearUnidades } from './reportsQuery'
import type { EstadoVenta, MetodoPago, Venta, VentaDetalle } from '../../../electron/db/types'

/**
 * Tope de ventas que se traen del backend.
 *
 * `FiltrosVentas` no tiene `offset`, solo `limit`. No hay paginación real: se
 * pide una ventana acotada y se pagina en memoria. El rótulo lo aclara, porque
 * un total de "3 de 8" sin ese aviso se lee como que hay 3 ventas en el período.
 */
const TOPE = 200
const POR_PAGINA = 10

const ETIQUETAS_METODO: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  debito: 'Tarjeta',
  credito: 'Crédito',
  cuenta_corriente: 'Cuenta corriente',
}

const ESTADOS: Record<EstadoVenta, { etiqueta: string; clase: string }> = {
  completada: {
    etiqueta: 'Completada',
    clase: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  anulada: { etiqueta: 'Anulada', clase: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
}

function formatearMomento(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

type HistorialVentasProps = {
  desde: string | null
  hasta: string | null
}

export function HistorialVentas({ desde, hasta }: HistorialVentasProps) {
  const [ventas, setVentas] = useState<Venta[] | null>(null)
  const [pagina, setPagina] = useState(1)
  const [detalles, setDetalles] = useState<Map<number, VentaDetalle>>(new Map())

  /*
    `detalles` es a la vez caché y dato renderizado. La página actual pide 10
    filas y volver atrás con la paginación releería las mismas 10 en cada cambio
    de página: guardarlas acá evita esas idas al backend. La clave es el id de
    venta, así que el cacheo es seguro mientras el turno siga igual; si el filtro
    de fechas cambia, se limpia.
  */

  /*
    Reset durante el render, no en el effect (mismo patrón que
    `HistorialVentasModal`): el effect queda solo con la responsabilidad de pedir.
    Con `setPagina`/`setDetalles` adentro, el effect dispara renders en cascada.
  */
  const claveFiltro = `${desde}|${hasta}`
  const [filtroAplicado, setFiltroAplicado] = useState(claveFiltro)

  if (filtroAplicado !== claveFiltro) {
    setFiltroAplicado(claveFiltro)
    setVentas(null)
    setDetalles(new Map())
    setPagina(1)
  }

  useEffect(() => {
    let vigente = true

    ventasService
      .getAll({ desde: desde ?? undefined, hasta: hasta ?? undefined, limit: TOPE })
      .then((lista) => {
        if (vigente) setVentas(lista)
      })
      .catch(() => {
        if (vigente) setVentas([])
      })

    return () => {
      vigente = false
    }
  }, [desde, hasta])

  const totalPaginas = Math.max(1, Math.ceil((ventas?.length ?? 0) / POR_PAGINA))
  const visibles = useMemo(() => {
    if (ventas === null) return []
    const inicio = (pagina - 1) * POR_PAGINA
    return ventas.slice(inicio, inicio + POR_PAGINA)
  }, [ventas, pagina])

  /*
    Solo se pide el detalle de las filas visibles. Traer el detalle de las 200
    ventas del tope serían 200 idas al backend por cada cambio de filtro.
  */
  useEffect(() => {
    const faltantes = visibles.map((venta) => venta.id).filter((id) => !detalles.has(id))

    if (faltantes.length === 0) return

    let vigente = true

    Promise.all(
      faltantes.map((id) =>
        ventasService.getDetail(id).then((detalle) => ({ id, detalle })),
      ),
    ).then((resultados) => {
      if (!vigente) return

      setDetalles((previas) => {
        const siguiente = new Map(previas)
        for (const { id, detalle } of resultados) {
          if (detalle) siguiente.set(id, detalle)
        }
        return siguiente
      })
    })

    return () => {
      vigente = false
    }
  }, [visibles, detalles])

  if (ventas === null) {
    return (
      <section className={`w-full rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] ${SOMBRA_CARD}`}>
        <p className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
          Cargando ventas...
        </p>
      </section>
    )
  }

  return (
    <section className={`w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] ${SOMBRA_CARD}`}>
      <header className="flex items-start justify-between gap-3 px-4 py-3.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <History size={15} />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Historial de ventas
            </h3>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              {ventas.length >= TOPE
                ? `Últimas ${TOPE} ventas del período, de un total que puede ser mayor.`
                : 'Ventas del período seleccionado, de la más reciente a la más antigua.'}
            </p>
          </div>
        </div>
      </header>

      {ventas.length === 0 ? (
        <p className="px-4 pb-5 text-xs text-slate-500 dark:text-slate-400">
          No hay ventas registradas en el período seleccionado.
        </p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">N.º</TableHead>
                <TableHead>Momento</TableHead>
                <TableHead>Artículos</TableHead>
                <TableHead>Medios de pago</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibles.map((venta) => {
                const detalle = detalles.get(venta.id)
                const unidades = detalle?.items.reduce((acc, item) => acc + item.cantidad, 0) ?? null
                const metodos = detalle ? [...new Set(detalle.pagos.map((pago) => pago.metodo))] : null
                const estado = ESTADOS[venta.estado]

                return (
                  <TableRow key={venta.id}>
                    <TableCell className="font-display font-bold tabular-nums text-slate-900 dark:text-white">
                      {venta.id}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums text-slate-500 dark:text-slate-400">
                      {formatearMomento(venta.fechaHora)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {unidades === null ? (
                        <span className="text-slate-300 dark:text-slate-600">...</span>
                      ) : detalle && detalle.items.length > 0 ? (
                        <span className="block max-w-[22rem] truncate text-slate-600 dark:text-slate-300">
                          {detalle.items.map((item) => item.descripcionItem).join(' · ')}
                          <span className="ml-1.5 text-slate-400 dark:text-slate-500">
                            ({formatearUnidades(unidades)} u.)
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">Sin ítems</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {metodos === null ? (
                        <span className="text-slate-300 dark:text-slate-600">...</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Receipt size={13} className="shrink-0 text-slate-400" />
                          {metodos.length === 0
                            ? '—'
                            : metodos.map((metodo) => ETIQUETAS_METODO[metodo]).join(' + ')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-block rounded-full px-2 py-0.5 text-[11px] font-medium',
                          estado.clase,
                        )}
                      >
                        {estado.etiqueta}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-display font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatearMoneda(venta.total)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {totalPaginas > 1 && (
            <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800/60">
              <Pagination currentPage={pagina} totalPages={totalPaginas} onPageChange={setPagina} />
            </div>
          )}
        </>
      )}
    </section>
  )
}