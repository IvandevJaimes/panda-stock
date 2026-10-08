import { useRef } from 'react'
import { AlertCircle, FilterX, PackageSearch, PackageX } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { PosProductCard } from './PosProductCard'
import type { ProductoPOS } from './posQuery'

type ProductGridProps = {
  productos: ProductoPOS[]
  sinStock: ProductoPOS[]
  /** Recibe el índice para que el click mueva el cursor de los atajos. */
  onAgregar: (producto: ProductoPOS) => void
  error: string | null
  terminoConsulta: string
  onLimpiarFiltros?: () => void
  paginaActual?: number
  onPageChange?: (page: number) => void
}

const contenedor = 'flex w-full min-h-0 flex-1 flex-col'

export function ProductGrid({
  productos,
  sinStock,
  onAgregar,
  error,
  terminoConsulta,
  onLimpiarFiltros,
  paginaActual = 1,
  onPageChange,
}: ProductGridProps) {
  const LIMITE_PAGINA = 50
  const totalPages = Math.max(1, Math.ceil(productos.length / LIMITE_PAGINA))
  const paginados = productos.slice((paginaActual - 1) * LIMITE_PAGINA, paginaActual * LIMITE_PAGINA)
  const desde = (paginaActual - 1) * LIMITE_PAGINA + 1
  const hasta = Math.min(paginaActual * LIMITE_PAGINA, productos.length)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handlePageChange = (nuevaPagina: number) => {
    onPageChange?.(nuevaPagina)
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (error) {
    return (
      <div className={cn(contenedor, 'justify-center')}>
        <EmptyState
          icon={<AlertCircle className="h-12 w-12 stroke-[1.5] text-red-500" />}
          title="No se pudieron cargar los productos"
          description={error}
        />
      </div>
    )
  }

  if (productos.length === 0) {
    const haySinStock = sinStock.length > 0

    return (
      <div className={cn(contenedor, 'justify-center')}>
        {haySinStock ? (
          // El mensaje no nombra productos. Cuando la búsqueda viene de elegir
          // una marca, decir "Sin stock: Coca Cola 2L" y "y 3 productos más"
          // responde a una pregunta que nadie se hizo: el usuario no buscó un
          // producto, buscó una marca. Y un nombre en el título ages la pantalla
          // al de un solo artículo, cuando en realidad puede haber una marca
          // entera detrás. El detalle de qué falta y por qué ya lo cuenta el
          // badge flotante, que está al lado.
          <EmptyState
            icon={<PackageX className="h-12 w-12 stroke-[1.5] text-red-400 dark:text-red-500" />}
            title="Sin stock"
            description="Los productos de esta marca no están disponibles para vender."
            action={
              onLimpiarFiltros ? (
                <Button variant="outline" onClick={onLimpiarFiltros}>
                  <FilterX className="h-4 w-4" aria-hidden />
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        ) : (
          <EmptyState
            icon={<PackageSearch className="h-12 w-12 stroke-[1.5]" />}
            title="No hay productos que coincidan con la búsqueda"
            description="Probá con otro término o limpiá los filtros para ver todo el catálogo."
            action={
              onLimpiarFiltros ? (
                <Button variant="outline" onClick={onLimpiarFiltros}>
                  <FilterX className="h-4 w-4" aria-hidden />
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        )}
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className={cn(
        contenedor,
        'relative overflow-y-auto px-1 pt-1 pb-16 max-[1024px]:pb-32',
      )}
    >
      <div
        className={cn(
          'grid auto-rows-min grid-cols-3 content-start gap-2',
          'sm:gap-3 sm:max-[767px]:grid-cols-4 md:max-[1025px]:grid-cols-5 min-[1025px]:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
        )}
      >
        {paginados.map((producto) => (
          <PosProductCard
            key={producto.id}
            producto={producto}
            onAgregar={onAgregar}
            terminoConsulta={terminoConsulta}
          />
        ))}
      </div>

      <div className="flex flex-col items-center justify-between gap-2 pt-6 pb-2 sm:flex-row px-1">
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
          Mostrando{' '}
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {desde}–{hasta}
          </span>{' '}
          de {productos.length} productos vendibles
        </span>

        {totalPages > 1 && onPageChange && (
          <Pagination
            currentPage={paginaActual}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  )
}
