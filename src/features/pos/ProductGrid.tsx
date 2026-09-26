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
    const agotado = sinStock[0]

    return (
      <div className={cn(contenedor, 'justify-center')}>
        {agotado ? (
          <EmptyState
            icon={<PackageX className="h-12 w-12 stroke-[1.5] text-red-400 dark:text-red-500" />}
            title={`Sin stock: ${agotado.nombre}`}
            description={
              sinStock.length > 1
                ? `y ${sinStock.length - 1} producto${sinStock.length - 1 > 1 ? 's' : ''} más sin stock. No se pueden vender desde el punto de venta.`
                : 'No se puede vender desde el punto de venta.'
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
