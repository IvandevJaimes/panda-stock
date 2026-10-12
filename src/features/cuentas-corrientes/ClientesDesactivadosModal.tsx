import { useRef, useState } from 'react'
import { Archive, FilterX, RotateCcw, Search } from 'lucide-react'
import { toast } from 'sonner'
import type { ClienteConSaldo } from '../../../electron/db/types'
import { EmptyStateCompact } from '../../components/ui/EmptyStateCompact'
import { HighlightMatch } from '../../components/ui/HighlightMatch'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { Tooltip } from '../../components/ui/Tooltip'
import { cn } from '../../lib/cn'
import { cuentasCorrientesService } from '../../services/cuentas-corrientes.service'
import { formatearMoneda } from './cuentasQuery'

const CLIENTES_POR_PAGINA = 20

interface ClientesDesactivadosModalProps {
  isOpen: boolean
  onClose: () => void
  clientes: ClienteConSaldo[]
  onChanged: () => void
}

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function ClientesDesactivadosModal({
  isOpen,
  onClose,
  clientes,
  onChanged,
}: ClientesDesactivadosModalProps) {
  const [busqueda, setBusqueda] = useState('')
  const [reactivandoId, setReactivandoId] = useState<number | null>(null)
  const [pagina, setPagina] = useState(1)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  const buscadorRef = useRef<HTMLInputElement>(null)

  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      setBusqueda('')
      setPagina(1)
    }
  }

  const termino = normalizar(busqueda.trim())
  const filtrados = clientes.filter((cliente) =>
    normalizar(`${cliente.nombre} ${cliente.telefono ?? ''}`).includes(termino),
  )
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / CLIENTES_POR_PAGINA))
  const paginaSegura = Math.min(pagina, totalPaginas)
  const clientesPagina = filtrados.slice(
    (paginaSegura - 1) * CLIENTES_POR_PAGINA,
    paginaSegura * CLIENTES_POR_PAGINA,
  )
  const hayFiltroActivo = busqueda.trim() !== ''

  const limpiarFiltros = () => {
    setBusqueda('')
    setPagina(1)
    buscadorRef.current?.focus()
  }

  const reactivar = async (cliente: ClienteConSaldo) => {
    setReactivandoId(cliente.id)
    try {
      await cuentasCorrientesService.toggleCliente(cliente.id, true)
      onChanged()
      toast.success(`Cliente "${cliente.nombre}" activado`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo activar el cliente')
    } finally {
      setReactivandoId(null)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title="Clientes desactivados"
      headerIcon={<Archive className="h-4 w-4" />}
      height="h-[60vh]"
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        {clientes.length > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            <Input
              ref={buscadorRef}
              value={busqueda}
              onChange={(event) => {
                setBusqueda(event.target.value)
                setPagina(1)
              }}
              placeholder="Buscar cliente desactivado por nombre o teléfono..."
              leftIcon={<Search size={16} />}
              aria-label="Buscar cliente desactivado"
              onClear={hayFiltroActivo ? limpiarFiltros : undefined}
              autoFocus
              className="w-full"
              wrapperClassName="min-w-0 flex-1"
            />
            <Tooltip
              content={hayFiltroActivo ? 'Limpiar todos los filtros' : undefined}
              placement="top"
            >
              <button
                type="button"
                onClick={limpiarFiltros}
                disabled={!hayFiltroActivo}
                aria-label="Limpiar todos los filtros"
                className={cn(
                  'shrink-0 select-none rounded-xl p-2 transition-colors duration-150',
                  hayFiltroActivo
                    ? 'cursor-pointer text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400'
                    : 'cursor-not-allowed text-slate-400 opacity-25 dark:text-slate-600',
                )}
              >
                <FilterX className="h-5 w-5" />
              </button>
            </Tooltip>
          </div>
        )}

        {filtrados.length === 0 ? (
          <EmptyStateCompact
            icon={<Archive className="h-8 w-8 stroke-[1.5]" />}
            title={clientes.length === 0 ? 'No hay clientes desactivados' : 'No se encontraron clientes'}
            description={clientes.length === 0
              ? 'Cuando haya clientes desactivados, aparecerán aquí.'
              : 'Probá con otro término de búsqueda.'}
            className="min-h-0 flex-1"
          />
        ) : (
          <>
            <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
              {clientesPagina.map((cliente) => (
                <div
                  key={cliente.id}
                  className="flex w-full items-stretch overflow-hidden rounded-xl border border-slate-200 text-left dark:border-slate-800"
                >
                  <div className="flex w-13 shrink-0 items-center justify-center bg-slate-200/60 sm:w-15 dark:bg-slate-800/60">
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white font-display text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      {cliente.nombre.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0] ?? '').join('').toUpperCase() || 'CL'}
                    </span>
                  </div>
                  <span className="flex min-w-0 flex-1 flex-col justify-center py-2.5 pl-3 pr-3">
                    <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      <HighlightMatch text={cliente.nombre} query={busqueda} compact />
                    </span>
                    <span className="block truncate text-xs text-slate-400 dark:text-slate-500">
                      {cliente.telefono || 'Sin teléfono'} · Pendiente {formatearMoneda(cliente.saldo)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center pr-3">
                    <Tooltip content="Reactivar cliente" placement="top">
                      <button
                        type="button"
                        onClick={() => void reactivar(cliente)}
                        disabled={reactivandoId !== null}
                        aria-label={`Reactivar ${cliente.nombre}`}
                        className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-400"
                      >
                        <RotateCcw
                          className={cn(
                            'h-4 w-4',
                            reactivandoId === cliente.id && 'animate-spin',
                          )}
                        />
                      </button>
                    </Tooltip>
                  </span>
                </div>
              ))}
            </div>

            {filtrados.length > 1 && (
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800/60">
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  {(paginaSegura - 1) * CLIENTES_POR_PAGINA + 1}–
                  {Math.min(paginaSegura * CLIENTES_POR_PAGINA, filtrados.length)} de {filtrados.length} clientes
                </span>
                <Pagination
                  currentPage={paginaSegura}
                  totalPages={totalPaginas}
                  onPageChange={setPagina}
                />
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
