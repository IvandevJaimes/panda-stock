import { memo } from 'react'
import { cn } from '../../lib/cn'
import { buildAssetUrl } from '../../lib/assets'
import { getProductPlaceholderLarge } from '../../lib/productPlaceholder'
import { HighlightMatch } from '../../components/ui/HighlightMatch'
import { TruncatedText } from '../../components/ui/TruncatedText'
import {
  formatearMoneda,
  descripcionAviso,
  tieneAviso,
  type ProductoPOS,
} from './posQuery'
import { StockStatusBadge } from './StockStatusBadge'

type PosProductCardProps = {
  producto: ProductoPOS
  onAgregar: (producto: ProductoPOS) => void
  terminoConsulta: string
}

function PosProductCardComponent({
  producto,
  onAgregar,
  terminoConsulta,
}: PosProductCardProps) {
  const metadatos = [producto.marca, producto.variante]
    .map((valor) => valor?.trim())
    .filter((valor): valor is string => Boolean(valor))
    .join(' · ')

  const aviso = descripcionAviso(producto)
  const conAviso = tieneAviso(producto)

  return (
    <button
      type="button"
      onClick={() => onAgregar(producto)}
      aria-label={
        aviso
          ? `Agregar ${producto.nombre} al ticket. ${aviso}`
          : `Agregar ${producto.nombre} al ticket`
      }
      data-aviso={conAviso ? 'true' : undefined}
      className={cn(
        'group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border text-left',
        'transition duration-150',
        'active:translate-y-0 active:scale-[0.99]',
        conAviso
          ? cn(
              'border-amber-300 bg-amber-50/40',
              'hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-50/70 hover:shadow-lg',
              'dark:border-amber-900/60 dark:bg-amber-950/20 dark:hover:border-amber-700/70 dark:hover:bg-amber-950/30',
            )
          : cn(
              'border-slate-200 bg-white',
              'hover:-translate-y-0.5 hover:border-emerald-500/30 hover:bg-slate-50 hover:shadow-lg',
              'dark:border-slate-800 dark:bg-[#111827] dark:hover:border-emerald-500/30 dark:hover:bg-secondary/50',
            ),
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 z-10 h-[3px] opacity-0 transition-opacity duration-200 group-hover:opacity-100',
          conAviso
            ? 'bg-[linear-gradient(90deg,transparent,#f59e0b,transparent)]'
            : 'bg-[linear-gradient(90deg,transparent,#10b981,transparent)]',
        )}
      />

      <span className="relative block aspect-square w-full shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={buildAssetUrl(producto.imgPath) ?? getProductPlaceholderLarge(producto.id)}
          alt={producto.nombre}
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
        />
        <StockStatusBadge producto={producto} />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1 px-2.5 pt-2.5 pb-2.5">
        <span className="line-clamp-2 min-h-[34px] font-display text-[13px] font-semibold leading-[1.25] text-slate-900 dark:text-slate-100">
          <HighlightMatch text={producto.nombre} query={terminoConsulta} />
        </span>

        {metadatos && (
          <TruncatedText
            text={metadatos}
            className="min-w-0 text-[11px] leading-tight text-slate-500 dark:text-slate-400"
          >
            <HighlightMatch text={metadatos} query={terminoConsulta} />
          </TruncatedText>
        )}

        <span className="mt-auto font-display text-[17px] font-bold tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
          {formatearMoneda(producto.precio)}
        </span>
      </span>
    </button>
  )
}

export const PosProductCard = memo(PosProductCardComponent)
