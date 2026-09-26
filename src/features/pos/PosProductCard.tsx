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
        // La cascada de entrada la pone `:nth-child` en `globals.css`, no un
        // índice por props: la card es hijo directo de la grilla y el orden en el
        // DOM ya es el orden en que se leen. Además, si el retardo viniera de un
        // prop, cambiar el orden del catálogo re-renderizaría todas las cards y
        // el `memo` de abajo dejaría de evitar trabajo.
        'animate-card-in',
        // El hover es solo contorno + la luz de arriba. Sin `translate` ni
        // `shadow`: en una grilla de cientos de cards, cada sombra proyectada es
        // una capa de composición y el desplazamiento hace que la fila de abajo
        // "salte" al pasar el mouse. La card no se mueve del lugar.
        'active:scale-[0.99]',
        // Contenedor para que el nombre y el precio se achiquen con la CARD, no
        // con la ventana. No son lo mismo: el ancho de la card es una función
        // del nº de columnas, y al cruzar 1280px aparece la quinta, así que la
        // card se angosta justo cuando la ventana se agranda. Con breakpoints de
        // viewport la tipografía iría al revés. `inline-size` (y no `size`) para
        // no contener el alto: la card lo sigue determinando su contenido.
        '@container',
        conAviso
          ? cn(
              'border-amber-300 bg-amber-50/40',
              'hover:border-amber-400',
              'dark:border-amber-900/60 dark:bg-amber-950/20 dark:hover:border-amber-700/70',
            )
          : cn(
              'border-slate-200 bg-white',
              'hover:border-emerald-500/30',
              'dark:border-slate-800 dark:bg-[#111827] dark:hover:border-emerald-500/30',
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
          className="h-full w-full object-cover"
        />
        <StockStatusBadge producto={producto} />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1 px-2.5 pt-2.5 pb-2.5">
        {/* El nombre es el único texto de la card que se recorta en dos líneas,
            así que necesita el overflow vertical: con el `truncate` de una línea
            el nombre se cortaba sin forma de leerlo entero.

            La altura va en `2lh`, NO en `min-h`. El `-webkit-line-clamp` solo
            recorta bien si la caja tiene la altura DEFINIDA. Con `min-height`
            la caja queda más alta que las dos líneas del clamp, elipsis sale en
            la línea 2 y el resto del nombre asoma cortado abajo. `2lh` son
            exactamente dos líneas, y como la unidad es la línea del propio
            elemento, el alto se acomoda solo a los tres peldaños de tipografía
            de abajo sin repetir el número mágico en cada uno.

            El precio queda alineado al fondo por `mt-auto`, no por este alto. */}
        <TruncatedText
          text={producto.nombre}
          lines={2}
          className="h-[2lh] font-display text-[13px] font-semibold leading-[1.25] text-slate-900 @max-[200px]:text-[12px] @max-[160px]:text-[11px] dark:text-slate-100"
        >
          <HighlightMatch text={producto.nombre} query={terminoConsulta} />
        </TruncatedText>

        {metadatos && (
          <TruncatedText
            text={metadatos}
            className="min-w-0 text-[11px] leading-tight text-slate-500 dark:text-slate-400"
          >
            <HighlightMatch text={metadatos} query={terminoConsulta} />
          </TruncatedText>
        )}

        <span className="mt-auto font-display text-[17px] font-bold tracking-tight tabular-nums text-slate-900 @max-[200px]:text-[16px] @max-[160px]:text-[15px] dark:text-slate-100">
          {formatearMoneda(producto.precio)}
        </span>
      </span>
    </button>
  )
}

export const PosProductCard = memo(PosProductCardComponent)
