import { Package } from 'lucide-react'
import { useSrcConFallback } from '../../hooks/useSrcConFallback'
import { buildAssetUrl } from '../../lib/assets'
import { getProductPlaceholderLarge } from '../../lib/productPlaceholder'
import type { Producto } from '../../../electron/db/types'

export function ProductoDetalleBasico({
  producto,
  nombreProducto,
}: {
  producto: Producto | null
  nombreProducto: string
}) {
  const fallback = getProductPlaceholderLarge(producto?.id ?? `reporte-${nombreProducto}`)
  const imagen = useSrcConFallback(
    producto ? buildAssetUrl(producto.imgPath) ?? fallback : fallback,
    fallback,
  )

  return (
    <section className="flex items-start gap-3">
      {producto ? (
        <img
          src={imagen.src}
          onError={imagen.onError}
          alt={producto.imgPath ? producto.nombre : `${nombreProducto} sin foto`}
          loading="lazy"
          draggable={false}
          className="h-20 w-20 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
        />
      ) : (
        <span className="grid h-20 w-20 shrink-0 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500">
          <Package className="h-7 w-7" strokeWidth={1.75} aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Producto afectado
        </p>
        <h3 className="mt-1 break-words font-display text-base font-bold text-slate-900 dark:text-white">
          {producto?.nombre ?? nombreProducto}
          {producto?.variante && (
            <span className="ml-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
              · {producto.variante}
            </span>
          )}
        </h3>
        {producto?.codigoInterno && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Código {producto.codigoInterno}
          </p>
        )}
      </div>
    </section>
  )
}
