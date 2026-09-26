import { AlertCircle, FilterX, PackageSearch, PackageX } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { PosProductCard } from './PosProductCard'
import type { ProductoPOS } from './posQuery'

type ProductGridProps = {
  productos: ProductoPOS[]
  sinStock: ProductoPOS[]
  onAgregar: (producto: ProductoPOS) => void
  error: string | null
  terminoConsulta: string
  onLimpiarFiltros?: () => void
}

const contenedor = 'flex w-full min-h-0 flex-1 flex-col'

export function ProductGrid({
  productos,
  sinStock,
  onAgregar,
  error,
  terminoConsulta,
  onLimpiarFiltros,
}: ProductGridProps) {
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
      className={cn(
        contenedor,
        'grid auto-rows-min px-1 pb-20 pt-1 grid-cols-2 content-start gap-2 overflow-y-auto',
        'md:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5',
      )}
    >
      {productos.map((producto) => (
        <PosProductCard
          key={producto.id}
          producto={producto}
          onAgregar={onAgregar}
          terminoConsulta={terminoConsulta}
        />
      ))}
    </div>
  )
}
