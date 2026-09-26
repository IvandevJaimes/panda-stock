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
        // `pb-32` hasta 1024: el pill del ticket se apila debajo del badge de no
        // vendibles y sin el padding extra la última fila no se puede despejar.
        //
        // Las columnas suben y BAJAN. Suben 3 → 4 → 5 mientras el ticket está
        // colapsado, y vuelven a 3 en 1025 porque a partir de ahí el ticket se
        // come 520px de grilla. De 1025 para arriba sí escalan 3 → 4 → 5.
        //
        // Todas las bandas van como RANGO, nunca como `min-width` pelada. Las
        // reglas de una banda se pisan con las de la siguiente y ahí gana la
        // que Tailwind emite última, no la que uno supondría: se verificó
        // compilando el CSS que `min-[1025px]` sale ANTES que `md`, así que un
        // `md:grid-cols-5` a secas se comía la banda de 1025. Con rangos no hay
        // solape y el orden deja de importar. Los `max-*` de v4 son estrictos
        // (`< 1025px`, no `<=`), de ahí el 1025 y no el 1024.
        'grid auto-rows-min px-1 pb-16 pt-1 grid-cols-3 content-start gap-2 overflow-y-auto max-[1024px]:pb-32',
        'sm:gap-3 sm:max-[767px]:grid-cols-4 md:max-[1025px]:grid-cols-5 min-[1025px]:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
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
