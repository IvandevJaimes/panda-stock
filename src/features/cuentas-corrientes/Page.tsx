import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Archive,
  ArrowDownCircle,
  ArrowUpCircle,
  BookUser,
  Eye,
  NotebookPen,
  Pencil,
  Plus,
  Search,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { KpiCard } from '../../components/ui/KpiCard'
import { LoadingState } from '../../components/ui/LoadingState'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table'
import type {
  ClienteConSaldo,
  MovimientoCuentaCorriente,
  ResumenCuentasCorrientes,
} from '../../../electron/db/types'
import { cuentasCorrientesService } from '../../services/cuentas-corrientes.service'
import { AbonoModal } from './AbonoModal'
import { CargoModal } from './CargoModal'
import { ClienteModal } from './ClienteModal'
import {
  buscarClientes,
  formatearFecha,
  formatearMoneda,
  ordenarPorDeuda,
  origenMovimiento,
  tieneDeuda,
} from './cuentasQuery'

export function CuentasCorrientesPage() {
  const [clientes, setClientes] = useState<ClienteConSaldo[]>([])
  const [resumen, setResumen] = useState<ResumenCuentasCorrientes | null>(null)
  const [movimientos, setMovimientos] = useState<MovimientoCuentaCorriente[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [seleccionado, setSeleccionado] = useState<ClienteConSaldo | null>(null)
  const [cargando, setCargando] = useState(true)

  const [modalCliente, setModalCliente] = useState(false)
  const [clienteEnEdicion, setClienteEnEdicion] = useState<ClienteConSaldo | null>(null)
  const [modalAbono, setModalAbono] = useState(false)
  const [modalCargo, setModalCargo] = useState(false)

  /*
    Los cargadores solo devuelven datos: los setState viven en quien los llama. Si un
    `useCallback` que setea se invoca desde un efecto, react-hooks/set-state-in-effect
    lo marca, y con razón: la cascada de renders es real.
  */
  const obtenerClientes = useCallback(
    () =>
      Promise.all([
        cuentasCorrientesService.getClientes(),
        cuentasCorrientesService.getResumen(),
      ]),
    [],
  )

  /*
    El historial se pide aparte y no con el resto: cambia al elegir un cliente, no
    al recargar la lista. Metiéndolo en `obtenerClientes` cada búsqueda en la tabla
    pegaría una consulta de movimientos que nadie está mirando.
  */
  const obtenerHistorial = useCallback(
    (clienteId?: number) =>
      cuentasCorrientesService.getMovimientos(
        clienteId ? { clienteId, limit: 200 } : { limit: 200 },
      ),
    [],
  )

  /*
    Fetch inicial. El flag `activo` evita escribir después del desmontaje.
  */
  useEffect(() => {
    let activo = true

    void Promise.all([obtenerClientes(), obtenerHistorial()])
      .then(([[lista, kpis], movs]) => {
        if (!activo) return
        setClientes(lista)
        setResumen(kpis)
        setMovimientos(movs)
      })
      .catch((error: unknown) => {
        if (!activo) return
        toast.error(
          error instanceof Error ? error.message : 'No se pudieron cargar las cuentas corrientes',
        )
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [obtenerClientes, obtenerHistorial])

  const visibles = useMemo(
    () => ordenarPorDeuda(buscarClientes(clientes, busqueda)),
    [clientes, busqueda],
  )

  // Al archivar o pagarle, el cliente que estaba abierto deja de ser el mismo
  // objeto: sin esto la tabla de movimientos seguiría mostrando su saldo viejo.
  const recargarSeleccionado = useCallback(async () => {
    const [lista, kpis] = await obtenerClientes()
    const frescos = seleccionado
      ? (lista.find((c) => c.id === seleccionado.id) ?? null)
      : null

    setClientes(lista)
    setResumen(kpis)
    setSeleccionado(frescos)
    setMovimientos(await obtenerHistorial(frescos?.id))
  }, [obtenerClientes, obtenerHistorial, seleccionado])

  /*
    Los modales ya avisan si su propia escritura falló; este refresh es una segunda
    lectura y puede caerse sola (la app se cierra, la base se bloquea). Sin este
    catch quedaría una promesa rechazada sin dueño.
  */
  const refrescar = useCallback(() => {
    recargarSeleccionado().catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la lista')
    })
  }, [recargarSeleccionado])

  const abrirCliente = useCallback(
    (cliente: ClienteConSaldo) => {
      setSeleccionado(cliente)
      obtenerHistorial(cliente.id)
        .then(setMovimientos)
        .catch((error: unknown) => {
          toast.error(
            error instanceof Error ? error.message : 'No se pudo cargar el historial',
          )
        })
    },
    [obtenerHistorial],
  )

  const archivar = useCallback(
    async (cliente: ClienteConSaldo) => {
      const confirmar = window.confirm(
        `¿Archivar a ${cliente.nombre}?\n\nDeja de aparecer en la lista, pero su deuda y su historial se conservan.`,
      )
      if (!confirmar) return

      try {
        await cuentasCorrientesService.archivarCliente(cliente.id)
        toast.success(`${cliente.nombre} quedó archivado`)
        if (seleccionado?.id === cliente.id) setSeleccionado(null)

        const [lista, kpis] = await obtenerClientes()
        setClientes(lista)
        setResumen(kpis)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo archivar')
      }
    },
    [obtenerClientes, seleccionado],
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            Cuentas corrientes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            A quién se le fió y cuánto tiene que pagar.
          </p>
        </div>

        <Button
          onClick={() => {
            setClienteEnEdicion(null)
            setModalCliente(true)
          }}
          icon={<Plus size={16} />}
        >
          Nuevo cliente
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          icon={<BookUser size={20} />}
          iconBgClass="bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
          title="Total por cobrar"
          value={formatearMoneda(resumen?.totalPorCobrar ?? 0)}
          subtitle={`${resumen?.clientesConDeuda ?? 0} clientes con deuda`}
          subtitleHighlightClass="text-amber-600 dark:text-amber-400"
        />
        <KpiCard
          icon={<ArrowDownCircle size={20} />}
          iconBgClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
          title="Cobrado neto"
          value={formatearMoneda((resumen?.totalAbonos ?? 0) - (resumen?.totalReintegros ?? 0))}
          subtitle="Abonos menos reintegros"
        />
        <KpiCard
          icon={<ArrowUpCircle size={20} />}
          iconBgClass="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          title="Fiado neto"
          value={formatearMoneda((resumen?.totalCargos ?? 0) - (resumen?.totalDevoluciones ?? 0))}
          subtitle="Cargos menos devoluciones"
        />
        <KpiCard
          icon={<Users size={20} />}
          iconBgClass="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          title="Clientes"
          value={resumen?.clientesActivos ?? 0}
          subtitle="Activos en el sistema"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card
          title="Clientes"
          description="Tocá un cliente para ver su historial."
          className="min-w-0"
        >
          <div className="mb-4">
            <Input
              placeholder="Buscar por nombre o teléfono"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              leftIcon={<Search size={16} />}
              onClear={() => setBusqueda('')}
              wrapperClassName="max-w-sm"
            />
          </div>

          {cargando && clientes.length === 0 ? (
            <LoadingState title="Cargando cuentas corrientes..." />
          ) : visibles.length === 0 ? (
            <EmptyState
              icon={<Users size={32} />}
              title={busqueda ? 'Ningún cliente coincide' : 'Todavía no hay clientes'}
              description={
                busqueda
                  ? 'Probá con otro nombre o teléfono.'
                  : 'Cargá el primer cliente para empezar a anotar quién te debe.'
              }
              action={
                !busqueda ? (
                  <Button
                    onClick={() => {
                      setClienteEnEdicion(null)
                      setModalCliente(true)
                    }}
                    icon={<Plus size={16} />}
                  >
                    Nuevo cliente
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Debe</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Cargos</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Abonos</TableHead>
                    <TableHead className="w-px" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibles.map((cliente) => (
                    <TableRow
                      key={cliente.id}
                      onClick={() => abrirCliente(cliente)}
                      className={
                        seleccionado?.id === cliente.id
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/20'
                          : 'cursor-pointer'
                      }
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{cliente.nombre}</span>
                          {cliente.activo === false ? (
                            <span className="text-xs text-slate-400">(archivado)</span>
                          ) : null}
                        </div>
                        {cliente.telefono ? (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {cliente.telefono}
                          </span>
                        ) : null}
                      </TableCell>

                      <TableCell className="text-right">
                        {tieneDeuda(cliente) ? (
                          <span className="font-display font-bold tabular-nums text-amber-600 dark:text-amber-400">
                            {formatearMoneda(cliente.saldo)}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">Al día</span>
                        )}
                      </TableCell>

                      <TableCell className="hidden text-right tabular-nums sm:table-cell">
                        {formatearMoneda(cliente.totalCargos)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">
                        {formatearMoneda(cliente.totalAbonos)}
                      </TableCell>

                      <TableCell className="w-px">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={cliente.saldo <= 0}
                            onClick={() => {
                              setSeleccionado(cliente)
                              setModalAbono(true)
                            }}
                          >
                            Cobrar
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Cargar deuda a ${cliente.nombre}`}
                            title="Cargar deuda"
                            onClick={() => {
                              setSeleccionado(cliente)
                              setModalCargo(true)
                            }}
                          >
                            <NotebookPen size={15} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Editar a ${cliente.nombre}`}
                            title="Editar"
                            onClick={() => {
                              setClienteEnEdicion(cliente)
                              setModalCliente(true)
                            }}
                          >
                            <Pencil size={15} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Archivar a ${cliente.nombre}`}
                            title="Archivar"
                            onClick={() => void archivar(cliente)}
                          >
                            <Archive size={15} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>

        <Card
          title={seleccionado ? `Historial de ${seleccionado.nombre}` : 'Historial'}
          description={seleccionado ? undefined : 'Elegí un cliente para ver sus movimientos.'}
          className="min-w-0"
        >
          {seleccionado ? (
            <div className="mb-3 flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => setSeleccionado(null)}>
                Ver todos
              </Button>
            </div>
          ) : null}

          {movimientos.length === 0 ? (
            <EmptyState
              icon={<Eye size={32} />}
              title="Sin movimientos"
              description="Acá van a aparecer las ventas fiadas y los abonos."
            />
          ) : (
            <div className="max-h-[32rem] overflow-y-auto">
              <TableContainer>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      {!seleccionado ? <TableHead>Cliente</TableHead> : null}
                      <TableHead>Origen</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientos.map((movimiento) => (
                      <TableRow key={movimiento.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatearFecha(movimiento.fechaHora)}
                        </TableCell>
                        {!seleccionado ? (
                          <TableCell className="text-sm">{movimiento.clienteNombre}</TableCell>
                        ) : null}
                        <TableCell className="text-sm">
                          {origenMovimiento(movimiento)}
                          {movimiento.nota ? (
                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                              {movimiento.nota}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium tabular-nums ${
                            movimiento.tipo === 'cargo' || movimiento.tipo === 'reintegro'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {movimiento.tipo === 'cargo' || movimiento.tipo === 'reintegro' ? '+' : '−'}
                          {formatearMoneda(movimiento.monto)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          )}
        </Card>
      </div>

      <ClienteModal
        isOpen={modalCliente}
        onClose={() => setModalCliente(false)}
        cliente={clienteEnEdicion}
        onSuccess={refrescar}
      />

      <AbonoModal
        isOpen={modalAbono}
        onClose={() => setModalAbono(false)}
        cliente={seleccionado}
        onSuccess={refrescar}
      />

      <CargoModal
        isOpen={modalCargo}
        onClose={() => setModalCargo(false)}
        cliente={seleccionado}
        onSuccess={refrescar}
      />
    </div>
  )
}
