import { useEffect, useMemo, useState } from 'react'
import { BookUser, Loader2, Plus, Search, User, UserRound } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { formatearMoneda } from './posQuery'
import type { Cliente, ClienteConSaldo } from '../../../electron/db/types'
import { cuentasCorrientesService } from '../../services/cuentas-corrientes.service'
import { ClienteModal } from '../cuentas-corrientes/ClienteModal'

type ClienteSeleccionModalProps = {
  isOpen: boolean
  onClose: () => void
  onSeleccionar: (cliente: { id: number; nombre: string }) => void
  clienteSeleccionadoId?: number | null
}

export function ClienteSeleccionModal({
  isOpen,
  onClose,
  onSeleccionar,
  clienteSeleccionadoId,
}: ClienteSeleccionModalProps) {
  const [clientes, setClientes] = useState<ClienteConSaldo[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false)

  // El reset va en el cierre y no al abrir: un setState sincrónico en el cuerpo
  // del efecto fuerza un render extra en cada apertura (regla de React), y acá
  // alcanza con que el estado quede limpio antes de la próxima apertura.
  const cerrar = () => {
    setClientes(null)
    setError(null)
    setBusqueda('')
    setModalNuevoCliente(false)
    onClose()
  }

  const handleClienteCreado = (clienteNuevo?: Cliente) => {
    setModalNuevoCliente(false)
    if (clienteNuevo) {
      onSeleccionar({ id: clienteNuevo.id, nombre: clienteNuevo.nombre })
      cerrar()
      return
    }

    cuentasCorrientesService
      .getClientes()
      .then((lista) => setClientes(lista))
      .catch(() => {})
  }

  useEffect(() => {
    if (!isOpen) return
    let activo = true

    cuentasCorrientesService
      .getClientes()
      .then((lista) => {
        if (activo) setClientes(lista)
      })
      .catch((err) => {
        if (activo) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar los clientes')
        }
      })

    return () => {
      activo = false
    }
  }, [isOpen])

  const visibles = useMemo(() => {
    if (!clientes) return []
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return clientes
    const textoNumerico = texto.replace(/\D/g, '')

    return clientes.filter((cliente) => {
      if (cliente.nombre.toLowerCase().includes(texto)) return true

      if (cliente.telefono) {
        if (cliente.telefono.toLowerCase().includes(texto)) return true
        if (textoNumerico.length >= 2 && cliente.telefono.replace(/\D/g, '').includes(textoNumerico)) {
          return true
        }
      }

      return false
    })
  }, [clientes, busqueda])

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={cerrar}
        title="Seleccionar cliente"
        subtitle="Cliente al que se le fía esta venta"
        headerIcon={
          <BookUser size={18} className="text-emerald-600 dark:text-emerald-400" />
        }
        maxWidth="lg"
        height='h-[70vh]'
        footer={
          <Button variant="outline" onClick={cerrar}>
            Cerrar
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <Input
                placeholder="Buscar cliente por nombre o teléfono…"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                leftIcon={<Search size={16} aria-hidden="true" />}
                autoFocus
              />
            </div>
            <Button
              type="button"
              icon={<Plus size={16} />}
              onClick={() => setModalNuevoCliente(true)}
              className="shrink-0"
            >
              Nuevo cliente
            </Button>
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </p>
          )}

          {clientes === null && !error && (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-500 dark:text-slate-400">
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              <span className="text-sm">Cargando clientes…</span>
            </div>
          )}

          {clientes !== null && !error && visibles.length === 0 && (
            <div className="flex flex-col items-center gap-1.5 py-8 text-center">
              <UserRound
                size={38}
                strokeWidth={1.6}
                className="text-slate-300 dark:text-slate-600"
                aria-hidden="true"
              />
              <p className="font-display text-[15px] font-semibold text-slate-600 dark:text-slate-400">
                {clientes.length === 0 ? 'No hay clientes activos' : 'Sin resultados'}
              </p>
              <span className="text-[13px] text-slate-500">
                {clientes.length === 0
                  ? 'Creá tu primer cliente para poder fiar ventas'
                  : 'Probá con otro nombre o teléfono, o creá un cliente nuevo'}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => setModalNuevoCliente(true)}
                className="mt-2"
              >
                Nuevo cliente
              </Button>
            </div>
          )}

          {visibles.length > 0 && (
            <div className="custom-scrollbar flex max-h-[48vh] flex-col gap-2 overflow-y-auto p-0.5">
              {visibles.map((cliente) => {
                const seleccionado = cliente.id === clienteSeleccionadoId

                return (
                  <button
                    key={cliente.id}
                    type="button"
                    onClick={() => {
                      onSeleccionar({ id: cliente.id, nombre: cliente.nombre })
                      cerrar()
                    }}
                    className={cn(
                      'group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-left transition-[color,background-color,border-color,box-shadow]',
                      seleccionado
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500/40 dark:border-emerald-500/70 dark:bg-emerald-950/30 dark:ring-emerald-500/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#111827] dark:hover:border-slate-700 dark:hover:bg-slate-800/60',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          'grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors',
                          seleccionado
                            ? 'bg-emerald-500/20 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/70 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700',
                        )}
                      >
                        <User size={18} aria-hidden="true" />
                      </span>

                      <div className="min-w-0">
                        <span
                          className={cn(
                            'truncate text-sm font-semibold',
                            seleccionado
                              ? 'text-emerald-950 dark:text-emerald-200'
                              : 'text-slate-800 dark:text-slate-200',
                          )}
                        >
                          {cliente.nombre}
                        </span>

                        {cliente.telefono && (
                          <span className="block text-xs text-slate-400 dark:text-slate-500">
                            {cliente.telefono}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span
                        className={cn(
                          'font-display text-sm font-bold tabular-nums',
                          cliente.saldo > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-400 dark:text-slate-500',
                        )}
                      >
                        {cliente.saldo > 0 ? formatearMoneda(cliente.saldo) : 'Sin deuda'}
                      </span>
                      {cliente.saldo > 0 && (
                        <span className="block text-[11px] font-medium text-amber-600/80 dark:text-amber-400/80">
                          Saldo deudor
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </Modal>

      <ClienteModal
        isOpen={modalNuevoCliente}
        onClose={() => setModalNuevoCliente(false)}
        onSuccess={handleClienteCreado}
      />
    </>
  )
}
