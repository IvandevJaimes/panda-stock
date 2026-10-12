import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Input } from '../../components/ui/Input'
import { Pagination } from '../../components/ui/Pagination'

type BarraFiltrosReporteProps = {
  buscar: string
  onBuscarChange: (valor: string) => void
  placeholder: string
  total: number
  children?: ReactNode
}

export function BarraFiltrosReporte({
  buscar,
  onBuscarChange,
  placeholder,
  total,
  children,
}: BarraFiltrosReporteProps) {
  return (
    <div className="flex flex-col gap-2.5 border-y border-slate-100 px-4 py-3 dark:border-slate-800/60 sm:flex-row sm:flex-wrap sm:items-center">
      <Input
        value={buscar}
        onChange={(event) => onBuscarChange(event.target.value)}
        onClear={() => onBuscarChange('')}
        placeholder={placeholder}
        aria-label={placeholder}
        leftIcon={<Search size={15} />}
        wrapperClassName="min-w-0 flex-1 sm:max-w-sm"
      />
      {children}
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
