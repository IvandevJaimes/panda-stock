import { Pill } from '../../components/ui/Pill'
import { useAutoScrollHover } from '../../hooks/useAutoScrollHover'
import type { CategoriaCatalogo } from './posQuery'

type CategoryFilterProps = {
  categorias: CategoriaCatalogo[]
  total: number
  valor: string
  onChange: (categoriaId: string) => void
}

/**
 * Carrusel de categorías del POS. Solo aporta el layout (scroll horizontal) y
 * la lógica de "Todas" + conteos: la forma visual de cada chip es la primitiva
 * compartida `Pill`, la misma que usa Inventario.
 */
export function CategoryFilter({
  categorias,
  total,
  valor,
  onChange,
}: CategoryFilterProps) {
  const { ref, alMover, alSalir } = useAutoScrollHover<HTMLDivElement>()

  return (
    <div
      ref={ref}
      onMouseMove={alMover}
      onMouseLeave={alSalir}
      className="scrollbar-none flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pl-1 pr-4"
      role="group"
      aria-label="Filtrar por categoría"
    >
      <Pill
        label="Todas"
        active={valor === 'all'}
        showActions={false}
        count={total}
        onSelect={() => onChange('all')}
      />

      {categorias.map((categoria) => {
        const activo = valor === String(categoria.id)
        return (
          <Pill
            key={categoria.id}
            label={categoria.nombre}
            active={activo}
            showActions={false}
            count={categoria.conteo}
            onSelect={() => onChange(String(categoria.id))}
          />
        )
      })}
    </div>
  )
}
