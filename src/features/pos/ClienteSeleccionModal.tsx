import { useEffect, useMemo, useState } from 'react'
import { BookUser, Loader2, Search, UserRound } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { formatearMoneda } from './posQuery'
import type { ClienteConSaldo } from '../../../electron/db/types'
import { cuentasCorrientesService } from '../../services/cuentas-corrientes.service'

type ClienteSeleccionModalProps = {
  isOpen: boolean
  onClose: () => void
  onSeleccionar: (cliente: { id: number; nombre: string }) => void
}

export function ClienteSeleccionModal({
  isOpen,
  onClose,
  onSeleccionar,
}: ClienteSeleccionModalProps) {
  const [clientes, setClientes] = useState<ClienteConSaldo[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  // El reset va en el cierre y no al abrir: un setState sincrónico en el cuerpo
  // del efecto fuerza un render extra en cada apertura (regla de React), y acá
  // alcanza con que el estado quede limpio antes de la próxima apertura.
  const cerrar = () => {
    setClientes(null)
    setError(null)
    setBusqueda('')
    onClose()
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
    return clientes.filter((cliente) => cliente.nombre.toLowerCase().includes(texto))
  }, [clientes, busqueda])

  return (
    <Modal
      isOpen={isOpen}
      onClose={cerrar}
      title="Seleccionar cliente"
      subtitle="Cliente al que se le fía esta venta"
      headerIcon={
        <BookUser size={18} className="text-emerald-600 dark:text-emerald-400" />
      }
      maxWidth="md"
    >
      <div className="flex flex-col gap-4">
        <Input
          placeholder="Buscar cliente por nombre…"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          leftIcon={<Search size={16} aria-hidden="true" />}
          autoFocus
        />

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
                ? 'Creá clientes desde la pestaña de cuentas corrientes'
                : 'Probá con otro nombre'}
            </span>
          </div>
        )}

        {visibles.length > 0 && (
          <ul className="custom-scrollbar max-h-[45vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 dark:divide-slate-800/70 dark:border-slate-800">
            {visibles.map((cliente) => (
              <li key={cliente.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSeleccionar({ id: cliente.id, nombre: cliente.nombre })
                    cerrar()
                  }}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {cliente.nombre}
                    </span>
                    {cliente.telefono && (
                      <span className="block text-xs text-slate-400 dark:text-slate-500">
                        {cliente.telefono}
                      </span>
                    )}
                  </span>
                  <span
                    className={
                      cliente.saldo > 0
                        ? 'shrink-0 font-display text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400'
                        : 'shrink-0 font-display text-sm font-bold tabular-nums text-slate-400 dark:text-slate-500'
                    }
                  >
                    {cliente.saldo > 0 ? formatearMoneda(cliente.saldo) : 'Sin deuda'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
