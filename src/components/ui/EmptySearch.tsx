import { RotateCcw, SearchX } from 'lucide-react'
import { Button } from './Button'
import { EmptyStateCompact } from './EmptyStateCompact'
import { cn } from '../../lib/cn'

type EmptySearchProps = {
  onClear: () => void
  description?: string
  className?: string
}

export function EmptySearch({
  onClear,
  description = 'Probá cambiar la búsqueda o los filtros aplicados.',
  className,
}: EmptySearchProps) {
  return (
    <EmptyStateCompact
      icon={<SearchX size={20} aria-hidden="true" />}
      title="No se encontraron resultados"
      description={description}
      action={(
        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={<RotateCcw size={14} aria-hidden="true" />}
          onClick={onClear}
        >
          Limpiar búsqueda y filtros
        </Button>
      )}
      className={cn('px-4 py-8', className)}
    />
  )
}
