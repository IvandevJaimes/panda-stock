import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Archive,
  BookUser,
  CircleCheck,
  FilterX,
  Pencil,
  Plus,
  PowerOff,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { ClienteCard } from '../../components/ui/ClienteCard'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { KpiCard } from '../../components/ui/KpiCard'
import { LoadingState } from '../../components/ui/LoadingState'
import { CustomSelect, type SelectOption } from '../../components/ui/CustomSelect'
import { Tooltip } from '../../components/ui/Tooltip'
import { ContextMenu, ContextMenuItem } from '../../components/ui/ContextMenu'
import { ModalContrasena } from '../seguridad/ModalContrasena'
import type {
  ClienteConSaldo,
  MovimientoCuentaCorriente,
  ResumenCuentasCorrientes,
} from '../../../electron/db/types'
import { cuentasCorrientesService } from '../../services/cuentas-corrientes.service'
import { seguridadService } from '../../services/seguridad.service'
import { cn } from '../../lib/cn'
import { useSettingsStore } from '../../stores/settings.store'
import { AbonoModal } from './AbonoModal'
import { ClienteModal } from './ClienteModal'
import { ClienteDetalleModal } from './ClienteDetalleModal'
import { ClientesDesactivadosModal } from './ClientesDesactivadosModal'
import {
  buscarClientes,
  formatearMoneda,
  tieneDeuda,
} from './cuentasQuery'

type FiltroSaldo = 'todos' | 'con_deuda' | 'al_dia'
type OrdenClientes = 'deuda_desc' | 'deuda_asc' | 'nombre_asc'

const OPCIONES_ORDEN: SelectOption[] = [
  { value: 'deuda_desc', label: 'Mayor deuda' },
  { value: 'deuda_asc', label: 'Menor deuda' },
  { value: 'nombre_asc', label: 'Nombre A→Z' },
]

export function CuentasCorrientesPage() {
  const protegerEliminacion = useSettingsStore((state) => state.proteccionesSeguridad.eliminarClientes)
  const contrasenaConfigurada = useSettingsStore((state) => state.contrasenaConfigurada)
  const [clientes, setClientes] = useState<ClienteConSaldo[]>([])
  const [clientesDesactivados, setClientesDesactivados] = useState<ClienteConSaldo[]>([])
  const [resumen, setResumen] = useState<ResumenCuentasCorrientes | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroSaldo, setFiltroSaldo] = useState<FiltroSaldo>('todos')
  const [orden, setOrden] = useState<OrdenClientes>('deuda_desc')
  const [seleccionado, setSeleccionado] = useState<ClienteConSaldo | null>(null)
  const [clienteEnDetalle, setClienteEnDetalle] = useState<ClienteConSaldo | null>(null)
  const [pestanaDetalleInicial, setPestanaDetalleInicial] = useState<'informacion' | 'deudas' | 'movimientos'>('informacion')
  const [clienteAEliminar, setClienteAEliminar] = useState<ClienteConSaldo | null>(null)
  const [clientePendientePin, setClientePendientePin] = useState<ClienteConSaldo | null>(null)
  const [cargando, setCargando] = useState(true)
  const [inactivosAbierta, setInactivosAbierta] = useState(false)
  const [menuContextual, setMenuContextual] = useState<{
    cliente: ClienteConSaldo
    x: number
    y: number
  } | null>(null)

  const [modalCliente, setModalCliente] = useState(false)
  const [clienteEnEdicion, setClienteEnEdicion] = useState<ClienteConSaldo | null>(null)
  const [modalAbono, setModalAbono] = useState(false)
  const [montoAbonoInicial, setMontoAbonoInicial] = useState<number | undefined>()
  const [deudaAbono, setDeudaAbono] = useState<MovimientoCuentaCorriente | null>(null)
  const [cobroDesdeTarjeta, setCobroDesdeTarjeta] = useState(false)

  /*
    Los cargadores solo devuelven datos: los setState viven en quien los llama. Si un
    `useCallback` que setea se invoca desde un efecto, react-hooks/set-state-in-effect
    lo marca, y con razón: la cascada de renders es real.
  */
  const obtenerClientes = useCallback(
    () =>
      Promise.all([
        cuentasCorrientesService.getClientes({ incluirInactivos: true }),
        cuentasCorrientesService.getResumen(),
      ]),
    [],
  )

  const separarClientes = useCallback((lista: ClienteConSaldo[]) => {
    setClientes(lista.filter((cliente) => cliente.activo))
    setClientesDesactivados(lista.filter((cliente) => !cliente.activo))
  }, [])

  /* Fetch inicial. El flag `activo` evita escribir después del desmontaje. */
  useEffect(() => {
    let activo = true

    void obtenerClientes()
      .then(([lista, kpis]) => {
        if (!activo) return
        separarClientes(lista)
        setResumen(kpis)
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
  }, [obtenerClientes, separarClientes])

  const visibles = useMemo(
    () => {
      const filtrados = buscarClientes(clientes, busqueda).filter((cliente) => {
        if (filtroSaldo === 'con_deuda') return tieneDeuda(cliente)
        if (filtroSaldo === 'al_dia') return !tieneDeuda(cliente)
        return true
      })
      return filtrados.sort((a, b) => {
        if (orden === 'nombre_asc') return a.nombre.localeCompare(b.nombre)
        const diferencia = orden === 'deuda_asc' ? a.saldo - b.saldo : b.saldo - a.saldo
        return diferencia || a.nombre.localeCompare(b.nombre)
      })
    },
    [clientes, busqueda, filtroSaldo, orden],
  )
  const hayFiltroActivo = busqueda.trim().length > 0 || filtroSaldo !== 'todos' || orden !== 'deuda_desc'
  const cantidadConDeuda = clientes.filter(tieneDeuda).length
  const cantidadAlDia = clientes.length - cantidadConDeuda
  const opcionesFiltro: SelectOption[] = [
    { value: 'todos', label: `Todos (${clientes.length})` },
    { value: 'con_deuda', label: `Con deuda (${cantidadConDeuda})` },
    { value: 'al_dia', label: `Al día (${cantidadAlDia})` },
  ]

  const limpiarFiltros = () => {
    setBusqueda('')
    setFiltroSaldo('todos')
    setOrden('deuda_desc')
  }

  // Al registrar un pago, actualizar la referencia permite que el modal refleje el saldo nuevo.
  const recargarSeleccionado = useCallback(async () => {
    const [lista, kpis] = await obtenerClientes()
    const frescos = seleccionado
      ? (lista.find((c) => c.id === seleccionado.id) ?? null)
      : null

    separarClientes(lista)
    setResumen(kpis)
    setSeleccionado(frescos)
    return frescos
  }, [obtenerClientes, seleccionado, separarClientes])

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

  const abrirCobroDeuda = useCallback(async (
    cliente: ClienteConSaldo,
    deudaElegida?: MovimientoCuentaCorriente,
    desdeTarjeta = false,
  ) => {
    try {
      const movimientos = deudaElegida
        ? null
        : await cuentasCorrientesService.getMovimientos({ clienteId: cliente.id })
      const deuda = deudaElegida ?? movimientos?.find((movimiento) =>
        (movimiento.tipo === 'cargo' || movimiento.tipo === 'reintegro')
          && (movimiento.saldoPendiente ?? movimiento.monto) > 0,
      )

      if (!deuda) {
        toast.error('No se encontró una deuda pendiente para este cliente')
        return
      }

      setSeleccionado(cliente)
      setDeudaAbono(deuda)
      setMontoAbonoInicial(Math.min(deuda.saldoPendiente ?? deuda.monto, cliente.saldo))
      setCobroDesdeTarjeta(desdeTarjeta)
      setModalAbono(true)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar la deuda')
    }
  }, [])

  const eliminarConfirmado = useCallback(
    async (cliente: ClienteConSaldo, pin?: string) => {
      await cuentasCorrientesService.eliminarCliente(cliente.id, pin)
      toast.success(`${cliente.nombre} fue eliminado`)
      if (seleccionado?.id === cliente.id) setSeleccionado(null)

      try {
        const [lista, kpis] = await obtenerClientes()
        separarClientes(lista)
        setResumen(kpis)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la lista')
      }
    },
    [obtenerClientes, seleccionado, separarClientes],
  )

  const solicitarEliminacion = useCallback(
    (cliente: ClienteConSaldo) => {
      if (tieneDeuda(cliente)) return
      setClienteAEliminar(cliente)
    },
    [],
  )

  const confirmarEliminacion = useCallback(async () => {
    if (!clienteAEliminar) return
    if (protegerEliminacion && contrasenaConfigurada) {
      setClientePendientePin(clienteAEliminar)
      return
    }

    try {
      await eliminarConfirmado(clienteAEliminar)
    } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el cliente')
      throw error
    }
  }, [clienteAEliminar, contrasenaConfigurada, eliminarConfirmado, protegerEliminacion])

  const cambiarEstadoCliente = useCallback(async (cliente: ClienteConSaldo, activo: boolean) => {
    try {
      await cuentasCorrientesService.toggleCliente(cliente.id, activo)
      const [lista, kpis] = await obtenerClientes()
      separarClientes(lista)
      setResumen(kpis)
      toast.success(activo
        ? `Cliente "${cliente.nombre}" activado`
        : `Cliente "${cliente.nombre}" desactivado`)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cambiar el estado del cliente')
    }
  }, [obtenerClientes, separarClientes])

  const abrirMenuContextual = useCallback((event: React.MouseEvent<HTMLElement>, cliente: ClienteConSaldo) => {
    setMenuContextual({ cliente, x: event.clientX, y: event.clientY })
  }, [])

  const cerrarMenuContextual = useCallback(() => setMenuContextual(null), [])
  const clienteMenuContextual = menuContextual?.cliente ?? null
  const totalDesactivados = clientesDesactivados.length

  if (cargando && clientes.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingState title="Cargando cuentas corrientes..." fullPage />
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 pt-4 sm:gap-4 md:pt-6">
      <header className="flex animate-entry-up flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            Cuentas corrientes
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Tooltip content={`Ver clientes desactivados (${totalDesactivados})`} placement="top">
            <button
              type="button"
              onClick={() => setInactivosAbierta(true)}
              aria-label="Ver clientes desactivados"
              className="flex shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-2xl border border-slate-200 px-2 py-2 text-sm font-medium text-slate-400 transition-colors duration-150 hover:border-slate-300 hover:text-slate-600 dark:border-slate-700/80 dark:text-slate-500 dark:hover:border-slate-600 dark:hover:text-slate-300"
            >
              <Archive className="h-5 w-5" />
              <span className="select-none rounded-full bg-slate-200 px-1.5 py-0.5 text-xs font-semibold leading-none text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {totalDesactivados}
              </span>
            </button>
          </Tooltip>
          <Button
            variant="primary"
            onClick={() => {
              setClienteEnEdicion(null)
              setModalCliente(true)
            }}
            className="h-10 shrink-0 gap-2 rounded-2xl px-4 text-sm font-bold shadow-xs sm:h-12 sm:px-6 sm:text-base"
          >
            <Plus className="h-5 w-5" />
            <span>Nuevo cliente</span>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <KpiCard
          className="animate-entry-up stagger-1 cursor-default border-amber-200/90 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/25"
          icon={<BookUser size={20} />}
          iconBgClass="border border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900 dark:bg-amber-950/70 dark:text-amber-300"
          title="Total por cobrar"
          value={formatearMoneda(resumen?.totalPorCobrar ?? 0)}
          subtitle={`${resumen?.clientesConDeuda ?? 0} clientes con deuda`}
          subtitleHighlightClass="font-medium text-amber-700 dark:text-amber-300"
        />
        <KpiCard
          className="animate-entry-up stagger-2 cursor-default border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/70"
          icon={<Users size={20} />}
          iconBgClass="border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          title="Clientes activos"
          value={resumen?.clientesActivos ?? 0}
          subtitle="En el sistema"
        />
        <KpiCard
          className="animate-entry-up stagger-3 cursor-default border-emerald-200/90 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/25"
          icon={<CircleCheck size={20} />}
          iconBgClass="border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300"
          title="Clientes al día"
          value={Math.max(0, (resumen?.clientesActivos ?? 0) - (resumen?.clientesConDeuda ?? 0))}
          subtitle="Sin saldo pendiente"
        />
      </div>

      <section className="min-w-0">


        <div className="sticky top-0 z-20 mb-3 flex w-full min-w-0 animate-entry-up stagger-4 flex-col gap-2.5 border-slate-200/80 bg-[#f4f6f8] py-3 transition-colors select-none relative after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-3 after:bg-gradient-to-b after:from-slate-900/10 after:to-transparent after:content-[''] dark:border-slate-800/60 dark:bg-[#0b0f17] dark:after:from-black/45">
          <div className="flex w-full min-w-0 flex-col gap-2 lg:flex-row lg:items-center">
            <Input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por nombre o teléfono..."
              leftIcon={<Search size={16} />}
              wrapperClassName="min-w-0 flex-1"
              aria-label="Buscar cliente"
              rightAction={busqueda.length > 0 ? (
                <button type="button" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda" className="grid h-5 w-5 cursor-pointer place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
                  <X size={14} />
                </button>
              ) : undefined}
            />
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-1.5 lg:flex lg:shrink-0" role="group" aria-label="Filtros y orden de clientes">
              <CustomSelect
                options={opcionesFiltro}
                value={filtroSaldo}
                onChange={(value) => setFiltroSaldo(value as FiltroSaldo)}
                className="w-full min-w-0 lg:w-44"
              />
              <CustomSelect
                options={OPCIONES_ORDEN}
                value={orden}
                onChange={(value) => setOrden(value as OrdenClientes)}
                className="w-full min-w-0 lg:w-44"
              />
              <Tooltip content={hayFiltroActivo ? 'Limpiar todos los filtros' : undefined} placement="top">
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  disabled={!hayFiltroActivo}
                  aria-label="Limpiar todos los filtros"
                  className={cn(
                    'shrink-0 select-none rounded-xl p-2 transition-colors duration-150',
                    hayFiltroActivo ? 'cursor-pointer text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400' : 'cursor-not-allowed text-slate-400 opacity-25 dark:text-slate-600',
                  )}
                >
                  <FilterX className="h-5 w-5" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {visibles.length === 0 ? (
          <EmptyState
            icon={hayFiltroActivo ? <Search size={32} /> : <Users size={32} />}
            title={
              clientes.length === 0
                ? 'Todavía no hay clientes'
                : busqueda.trim()
                  ? 'No encontramos clientes'
                  : filtroSaldo === 'con_deuda'
                    ? 'No hay clientes con deuda'
                    : 'No hay clientes al día'
            }
            description={
              clientes.length === 0
                ? 'Cargá el primer cliente para empezar a administrar sus saldos.'
                : busqueda.trim()
                  ? 'Probá con otro nombre o teléfono, o limpiá los filtros.'
                  : 'Probá con otro filtro para ver los clientes disponibles.'
            }
            action={
              clientes.length === 0 ? (
                <Button
                  variant="primary"
                  onClick={() => { setClienteEnEdicion(null); setModalCliente(true) }}
                  className="h-10 shrink-0 gap-2 rounded-2xl px-4 text-sm font-bold shadow-xs sm:h-12 sm:px-6 sm:text-base"
                >
                  <Plus className="h-5 w-5" />
                  <span>Nuevo cliente</span>
                </Button>
              ) : hayFiltroActivo ? (
                <Button variant="outline" onClick={limpiarFiltros} icon={<FilterX size={16} />}>
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid min-w-0 px-1 grid-cols-1 gap-2.5">
            {visibles.map((cliente) => {
              const conDeuda = tieneDeuda(cliente)
              return (
                <ClienteCard
                  key={cliente.id}
                  nombre={cliente.nombre}
                  telefono={cliente.telefono}
                  saldoPendiente={formatearMoneda(cliente.saldo)}
                  conDeuda={conDeuda}
                  archivado={cliente.activo === false}
                  onContextMenu={(event) => abrirMenuContextual(event, cliente)}
                  onOpen={() => {
                    setPestanaDetalleInicial('informacion')
                    setClienteEnDetalle(cliente)
                  }}
                  onCobrar={conDeuda ? () => { void abrirCobroDeuda(cliente, undefined, true) } : undefined}
                  onEditar={() => {
                    setClienteEnEdicion(cliente)
                    setModalCliente(true)
                  }}
                  onEliminar={!conDeuda ? () => solicitarEliminacion(cliente) : undefined}
                />
              )
            })}
          </div>
        )}
      </section>

      <ContextMenu
        open={menuContextual !== null}
        x={menuContextual?.x ?? 0}
        y={menuContextual?.y ?? 0}
        onClose={cerrarMenuContextual}
      >
        {clienteMenuContextual && (
          <ContextMenuItem
            icon={<PowerOff className="h-3.5 w-3.5" />}
            onClick={() => void cambiarEstadoCliente(clienteMenuContextual, false)}
          >
            Desactivar cliente
          </ContextMenuItem>
        )}
        {clienteMenuContextual && (
          <ContextMenuItem
            icon={<Pencil className="h-3.5 w-3.5" />}
            onClick={() => {
              setClienteEnEdicion(clienteMenuContextual)
              setModalCliente(true)
            }}
          >
            Editar cliente
          </ContextMenuItem>
        )}
        {clienteMenuContextual && !tieneDeuda(clienteMenuContextual) && (
          <ContextMenuItem
            variant="danger"
            icon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={() => solicitarEliminacion(clienteMenuContextual)}
          >
            Eliminar cliente
          </ContextMenuItem>
        )}
      </ContextMenu>

      <ClientesDesactivadosModal
        isOpen={inactivosAbierta}
        onClose={() => setInactivosAbierta(false)}
        clientes={clientesDesactivados}
        onChanged={refrescar}
      />

      <ClienteModal
        isOpen={modalCliente}
        onClose={() => setModalCliente(false)}
        cliente={clienteEnEdicion}
        onSuccess={refrescar}
      />

      <AbonoModal
        isOpen={modalAbono}
        onClose={() => {
          setModalAbono(false)
          setMontoAbonoInicial(undefined)
          setDeudaAbono(null)
          setCobroDesdeTarjeta(false)
        }}
        onCancelar={() => {
          if (cobroDesdeTarjeta || !seleccionado) {
            setModalAbono(false)
            setMontoAbonoInicial(undefined)
            setDeudaAbono(null)
            setCobroDesdeTarjeta(false)
            return
          }

          setModalAbono(false)
          setMontoAbonoInicial(undefined)
          setDeudaAbono(null)
          setCobroDesdeTarjeta(false)
          setPestanaDetalleInicial('deudas')
          setClienteEnDetalle(seleccionado)
        }}
        cliente={seleccionado}
        deuda={deudaAbono}
        esCobroDesdeTarjeta={cobroDesdeTarjeta}
        onSuccess={async () => {
          try {
            const clienteActualizado = await recargarSeleccionado()
            if (!cobroDesdeTarjeta && clienteActualizado) {
              setPestanaDetalleInicial('deudas')
              setClienteEnDetalle(clienteActualizado)
            }
          } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la cuenta')
          }
        }}
        montoInicial={montoAbonoInicial}
        onVerOtrasDeudas={() => {
          if (!seleccionado) return
          setModalAbono(false)
          setMontoAbonoInicial(undefined)
          setDeudaAbono(null)
          setCobroDesdeTarjeta(false)
          setPestanaDetalleInicial('deudas')
          setClienteEnDetalle(seleccionado)
        }}
      />

      {clienteEnDetalle && (
        <ClienteDetalleModal
          cliente={clienteEnDetalle}
          isOpen
          pestanaInicial={pestanaDetalleInicial}
          onClienteChanged={refrescar}
          onClose={() => {
            setClienteEnDetalle(null)
            setPestanaDetalleInicial('informacion')
          }}
          onEdit={() => {
            setClienteEnEdicion(clienteEnDetalle)
            setClienteEnDetalle(null)
            setModalCliente(true)
          }}
          onDelete={() => {
            const cliente = clienteEnDetalle
            setClienteEnDetalle(null)
            solicitarEliminacion(cliente)
          }}
          onCobrar={(deuda) => {
            if (!clienteEnDetalle) return
            const cliente = clienteEnDetalle
            setClienteEnDetalle(null)
            void abrirCobroDeuda(cliente, deuda, false)
          }}
        />
      )}

      <ConfirmModal
        isOpen={clienteAEliminar !== null}
        onClose={() => setClienteAEliminar(null)}
        onConfirm={confirmarEliminacion}
        title="Eliminar cliente"
        description={`¿Eliminar definitivamente a ${clienteAEliminar?.nombre ?? 'este cliente'}? Se borrarán también sus movimientos de cuenta corriente y no se podrán recuperar.`}
        confirmText="Eliminar cliente"
        headerIcon={<Trash2 size={18} />}
      />

      {clientePendientePin && (
        <ModalContrasena
          titulo="Confirmar eliminación"
          subtitulo={`Ingresá la contraseña para eliminar a ${clientePendientePin.nombre}.`}
          etiquetaCancelar="Cancelar"
          etiquetaConfirmar="Eliminar cliente"
          confirmarVariant="danger"
          confirmarIcon={<Trash2 size={16} />}
          onSubmit={(pin) => seguridadService.verifyPin(pin)}
          onCancelar={() => setClientePendientePin(null)}
          onSuccess={async (pin) => {
            await eliminarConfirmado(clientePendientePin, pin)
            setClientePendientePin(null)
          }}
        />
      )}

    </div>
  )
}
