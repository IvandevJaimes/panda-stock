import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Search, TicketCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { ModalContrasena } from '../seguridad/ModalContrasena'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table'
import { Pagination } from '../../components/ui/Pagination'
import { devolucionesService } from '../../services/devoluciones.service'
import type {
  DevolucionCompleta,
  MetodoPago,
  ResultadoDevolucion,
  VentaDevolucionDetalle,
  VentaDevolucionResumen,
} from '../../../electron/db/types'
import { formatearMoneda, formatearUnidades } from './reportsQuery'
import { SOMBRA_CARD } from './estilos'
import { cn } from '../../lib/cn'

const POR_PAGINA = 10

const ETIQUETAS_METODO: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  debito: 'Débito',
  credito: 'Crédito',
  cuenta_corriente: 'Cuenta corriente',
}

function fechaHora(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

type DevolucionesPanelProps = {
  desde: string | null
  hasta: string | null
  onSuccess: () => void
}

export function DevolucionesPanel({ desde, hasta, onSuccess }: DevolucionesPanelProps) {
  const [vista, setVista] = useState<'tickets' | 'historial'>('tickets')
  const [buscar, setBuscar] = useState('')
  const [pagina, setPagina] = useState(1)
  const [recarga, setRecarga] = useState(0)
  const [claveFiltro, setClaveFiltro] = useState('')
  const [tickets, setTickets] = useState<{ items: VentaDevolucionResumen[]; total: number } | null>(null)
  const [historial, setHistorial] = useState<{ items: DevolucionCompleta[]; total: number } | null>(null)
  const [ventaId, setVentaId] = useState<number | null>(null)
  const [detalleCargado, setDetalleCargado] = useState<{
    ventaId: number
    detalle: VentaDevolucionDetalle
  } | null>(null)
  const [pedirPin, setPedirPin] = useState(false)
  const resultadoPendiente = useRef<ResultadoDevolucion | null>(null)

  const filtroActual = `${vista}|${desde}|${hasta}|${buscar}`
  if (claveFiltro !== filtroActual) {
    setClaveFiltro(filtroActual)
    setPagina(1)
    setTickets(null)
    setHistorial(null)
  }

  useEffect(() => {
    let vigente = true
    const filtros = {
      desde: desde ?? undefined,
      hasta: hasta ?? undefined,
      buscar: buscar.trim() || undefined,
      limit: POR_PAGINA,
      offset: (pagina - 1) * POR_PAGINA,
    }

    if (vista === 'tickets') {
      void devolucionesService.getVentas(filtros)
        .then((resultado) => {
          if (vigente) setTickets(resultado)
        })
        .catch((error: unknown) => {
          if (!vigente) return
          setTickets({ items: [], total: 0 })
          toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los tickets')
        })
    } else {
      void devolucionesService.getHistorial(filtros)
        .then((resultado) => {
          if (vigente) setHistorial(resultado)
        })
        .catch((error: unknown) => {
          if (!vigente) return
          setHistorial({ items: [], total: 0 })
          toast.error(error instanceof Error ? error.message : 'No se pudo cargar el historial')
        })
    }

    return () => {
      vigente = false
    }
  }, [vista, desde, hasta, buscar, pagina, recarga])

  useEffect(() => {
    if (ventaId === null) return
    let vigente = true
    void devolucionesService.getVentaDetalle(ventaId)
      .then((detalle) => {
        if (!vigente) return
        if (!detalle) {
          toast.error('El ticket ya no está disponible para devolución')
          setVentaId(null)
          return
        }
        setDetalleCargado({ ventaId, detalle })
      })
      .catch((error: unknown) => {
        if (!vigente) return
        toast.error(error instanceof Error ? error.message : 'No se pudo cargar el ticket')
        setVentaId(null)
      })

    return () => {
      vigente = false
    }
  }, [ventaId])

  const detalle = detalleCargado?.ventaId === ventaId ? detalleCargado.detalle : null
  const importeEstimado = detalle?.venta.total ?? 0

  const cerrarTicket = () => {
    setPedirPin(false)
    setVentaId(null)
  }

  const completarDevolucion = () => {
    const resultado = resultadoPendiente.current
    resultadoPendiente.current = null
    setPedirPin(false)
    cerrarTicket()
    setRecarga((valor) => valor + 1)
    onSuccess()
    if (resultado) {
      toast.success(`Devolución #${resultado.devolucionId} completada`, {
        description: `${formatearMoneda(resultado.total)} · ganancia revertida ${formatearMoneda(resultado.gananciaRevertida)}`,
      })
    }
  }

  const enviarDevolucion = async (pin: string): Promise<boolean> => {
    if (!detalle) return false
    const resultado = await devolucionesService.process({
      pin,
      ventaId: detalle.venta.id,
    })
    resultadoPendiente.current = resultado
    return resultado !== null
  }

  const paginaMaxima = Math.max(
    1,
    Math.ceil(((vista === 'tickets' ? tickets?.total : historial?.total) ?? 0) / POR_PAGINA),
  )

  return (
    <section className={`overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] ${SOMBRA_CARD}`}>
      <header className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800/60 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <RotateCcw size={15} />
          </span>
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Devoluciones de ticket completo
            </h3>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              Devuelve todos los artículos y cantidades del ticket original. Un ticket completado solo admite una devolución.
            </p>
          </div>
        </div>
        <div className="flex rounded-xl border border-slate-200 p-1 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setVista('tickets')}
            aria-pressed={vista === 'tickets'}
            className={cn(
              'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              vista === 'tickets'
                ? 'bg-emerald-500 text-white'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
            )}
          >
            Tickets para devolver
          </button>
          <button
            type="button"
            onClick={() => setVista('historial')}
            aria-pressed={vista === 'historial'}
            className={cn(
              'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              vista === 'historial'
                ? 'bg-emerald-500 text-white'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
            )}
          >
            Historial completado
          </button>
        </div>
      </header>

      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800/60">
        <Input
          placeholder={vista === 'tickets'
            ? 'Buscar ticket, cliente, producto o medio de pago'
            : 'Buscar ticket, devolución, cliente o producto'}
          value={buscar}
          onChange={(event) => setBuscar(event.target.value)}
          leftIcon={<Search size={15} />}
          onClear={() => setBuscar('')}
          wrapperClassName="max-w-lg"
        />
      </div>

      {vista === 'tickets' ? (
        <TablaTickets
          pagina={tickets}
          onDevolver={(id) => {
            setDetalleCargado(null)
            setVentaId(id)
          }}
        />
      ) : (
        <TablaHistorial pagina={historial} />
      )}

      {paginaMaxima > 1 && (
        <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800/60">
          <Pagination currentPage={pagina} totalPages={paginaMaxima} onPageChange={setPagina} />
        </div>
      )}

      <Modal
        isOpen={ventaId !== null}
        onClose={cerrarTicket}
        title={detalle ? `Devolver ticket #${detalle.venta.id}` : 'Cargar ticket'}
        subtitle={detalle ? `Venta del ${fechaHora(detalle.venta.fechaHora)}` : 'Consultando artículos y devoluciones anteriores'}
        headerIcon={<TicketCheck size={18} />}
        maxWidth="lg"
        footer={
          <>
            <Button variant="outline" onClick={cerrarTicket}>Cancelar</Button>
            <Button
              disabled={!detalle || detalle.items.length === 0 || importeEstimado <= 0}
              onClick={() => setPedirPin(true)}
            >
              Devolver ticket completo · {formatearMoneda(importeEstimado)}
            </Button>
          </>
        }
      >
        {detalle ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <TableContainer>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artículo</TableHead>
                      <TableHead>Cantidad original</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalle.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {item.descripcionItem}
                          </span>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                            {formatearMoneda(item.precioUnitario)} c/u · costo {formatearMoneda(item.costoUnitario)}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs tabular-nums text-slate-500 dark:text-slate-400">
                          {formatearUnidades(item.cantidad)} unidades
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/50">
              <span className="text-slate-600 dark:text-slate-300">Importe total del ticket original</span>
              <span className="font-display font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                {formatearMoneda(importeEstimado)}
              </span>
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Cargando ticket…</p>
        )}
      </Modal>

      {pedirPin && (
        <ModalContrasena
          titulo="Autorizar devolución"
          subtitulo="Ingresá la contraseña vigente o la maestra para completar el reintegro."
          etiquetaCancelar="Volver al ticket"
          onSubmit={enviarDevolucion}
          onSuccess={completarDevolucion}
          onCancelar={() => setPedirPin(false)}
        />
      )}
    </section>
  )
}

function TablaTickets({
  pagina,
  onDevolver,
}: {
  pagina: { items: VentaDevolucionResumen[]; total: number } | null
  onDevolver: (ventaId: number) => void
}) {
  if (pagina === null) {
    return <p className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">Buscando tickets…</p>
  }
  if (pagina.items.length === 0) {
    return <p className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">No hay tickets que coincidan con la búsqueda.</p>
  }

  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticket</TableHead>
            <TableHead>Fecha de venta</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Medio</TableHead>
            <TableHead>Unidades del ticket</TableHead>
            <TableHead className="text-right">Importe del ticket</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagina.items.map((fila) => (
            <TableRow key={fila.venta.id}>
              <TableCell className="font-display font-bold tabular-nums text-slate-900 dark:text-white">
                #{fila.venta.id}
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {fechaHora(fila.venta.fechaHora)}
              </TableCell>
              <TableCell>{fila.clienteNombre ?? '—'}</TableCell>
              <TableCell className="text-xs">
                {fila.metodos.map((metodo) => ETIQUETAS_METODO[metodo]).join(' + ') || '—'}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatearUnidades(fila.unidades)}
              </TableCell>
              <TableCell className="text-right font-display font-semibold tabular-nums">
                {formatearMoneda(fila.venta.total)}
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" onClick={() => onDevolver(fila.venta.id)}>
                  Devolver ticket
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function TablaHistorial({
  pagina,
}: {
  pagina: { items: DevolucionCompleta[]; total: number } | null
}) {
  if (pagina === null) {
    return <p className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">Cargando historial…</p>
  }
  if (pagina.items.length === 0) {
    return <p className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">Todavía no hay devoluciones completadas para este período.</p>
  }

  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Devolución</TableHead>
            <TableHead>Ticket original</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Artículos y cantidades</TableHead>
            <TableHead>Importe / liquidación</TableHead>
            <TableHead>Ganancia revertida</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagina.items.map((fila) => (
            <TableRow key={fila.id}>
              <TableCell className="font-display font-bold tabular-nums">#{fila.id}</TableCell>
              <TableCell className="font-display font-bold tabular-nums">#{fila.ventaId}</TableCell>
              <TableCell className="whitespace-nowrap text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {fechaHora(fila.fechaHora)}
              </TableCell>
              <TableCell className="max-w-72 text-xs">
                {fila.items.map((item) => `${item.descripcionItem} × ${formatearUnidades(item.cantidad)}`).join(' · ')}
              </TableCell>
              <TableCell className="text-xs">
                <span className="block font-semibold tabular-nums">{formatearMoneda(fila.total)}</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {[
                    fila.deudaReducida > 0
                      ? `Descontado de deuda ${formatearMoneda(fila.deudaReducida)}`
                      : null,
                    ...fila.reintegros.map((r) => `${ETIQUETAS_METODO[r.metodo]} ${formatearMoneda(r.monto)}`),
                  ].filter((parte): parte is string => parte !== null).join(' · ') || 'Sin reintegro monetario'}
                </span>
              </TableCell>
              <TableCell className="font-display font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                {formatearMoneda(fila.gananciaRevertida)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
