import type { ReactNode } from 'react'
import { FilterX, Search } from 'lucide-react'
import { Input } from '../../components/ui/Input'
import { Pagination } from '../../components/ui/Pagination'
import { Tooltip } from '../../components/ui/Tooltip'
import { cn } from '../../lib/cn'

type BarraFiltrosReporteProps = {
  buscar: string
  onBuscarChange: (valor: string) => void
  onClearFilters: () => void
  hayFiltrosActivos: boolean
  placeholder: string
  total: number
  children?: ReactNode
}

export function BarraFiltrosReporte({
  buscar,
  onBuscarChange,
  onClearFilters,
  hayFiltrosActivos,
  placeholder,
  total,
  children,
}: BarraFiltrosReporteProps) {
  const botonLimpiar = (
    <Tooltip
      content={hayFiltrosActivos ? 'Limpiar todos los filtros' : undefined}
      placement="top"
    >
      <button
        type="button"
        onClick={onClearFilters}
        disabled={!hayFiltrosActivos}
        aria-label="Limpiar todos los filtros"
        className={cn(
          'shrink-0 select-none rounded-xl p-2 transition-colors duration-150',
          hayFiltrosActivos
            ? 'cursor-pointer text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400'
            : 'cursor-not-allowed text-slate-400 opacity-25 dark:text-slate-600',
        )}
      >
        <FilterX className="h-5 w-5" />
      </button>
    </Tooltip>
  )

  return (
    <div className="flex flex-col gap-2.5 border-y border-slate-100 px-4 py-3 dark:border-slate-800/60 sm:flex-row sm:flex-wrap sm:items-center">
      <div className={cn(
        'flex min-w-0 items-center gap-2',
        children
          ? 'w-full flex-col sm:w-auto sm:flex-1 sm:flex-row sm:gap-2.5'
          : 'w-full sm:w-auto sm:flex-1',
      )}>
        <Input
          value={buscar}
          onChange={(event) => onBuscarChange(event.target.value)}
          onClear={() => onBuscarChange('')}
          placeholder={placeholder}
          aria-label={placeholder}
          leftIcon={<Search size={15} />}
          wrapperClassName={cn('min-w-0 flex-1', children ? 'w-full sm:max-w-sm' : 'w-full')}
        />
        {children ? (
          <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
            <div className="min-w-0 flex-1 sm:flex-none">{children}</div>
            {botonLimpiar}
          </div>
        ) : botonLimpiar}
      </div>
      <span className="text-[11px] text-slate-500 dark:text-slate-400 sm:ml-auto">
        {total} {total === 1 ? 'resultado' : 'resultados'}
      </span>
    </div>
  )
}

type PaginacionReporteProps = {
  pagina: number
  tamanoPagina: number
  total: number
  onCambiarPagina: (pagina: number) => void
}

export function PaginacionReporte({
  pagina,
  tamanoPagina,
  total,
  onCambiarPagina,
}: PaginacionReporteProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / tamanoPagina))
  const inicio = total === 0 ? 0 : (pagina - 1) * tamanoPagina + 1
  const fin = Math.min(pagina * tamanoPagina, total)

  return (
    <footer className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800/60 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 sm:text-left">
        {total === 0 ? 'Sin resultados' : `Mostrando ${inicio}–${fin} de ${total}`}
      </p>
      <Pagination currentPage={pagina} totalPages={totalPaginas} onPageChange={onCambiarPagina} />
    </footer>
  )
}
