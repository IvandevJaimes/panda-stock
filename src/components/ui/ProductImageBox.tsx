import { useRef, useState, type ChangeEvent } from 'react'
import { ImagePlus, Loader2, MoreVertical, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../../lib/cn'
import { buildAssetUrl } from '../../lib/assets'
import { getProductPlaceholderLarge } from '../../lib/productPlaceholder'
import { productosService } from '../../services/productos.service'
import { Tooltip } from './Tooltip'
import { ConfirmModal } from './ConfirmModal'
import { ImageLightbox } from '../ui/ImageLightbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './DropdownMenu'
import type { Producto } from '../../../electron/db/types'

export interface ProductImageBoxProps {
  productoId: number
  nombre: string
  imgPath?: string | null
  /** Se invoca con el producto actualizado tras cambiar o borrar la imagen. */
  onChanged?: (producto: Producto) => void
  className?: string
}

/**
 * Cuadro de imagen de producto reutilizable y editable.
 * Con foto: botón de 3 puntos en la esquina que abre un menú con
 * "Cambiar imagen" / "Eliminar imagen" (esta última con ConfirmModal).
 * Sin foto: muestra el placeholder grande y el botón "Poner imagen".
 */
export function ProductImageBox({
  productoId,
  nombre,
  imgPath: imgPathProp,
  onChanged,
  className,
}: ProductImageBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [imgPath, setImgPath] = useState<string | null>(imgPathProp ?? null)
  const [prevImgPathProp, setPrevImgPathProp] = useState<string | null | undefined>(
    imgPathProp,
  )
  const [procesando, setProcesando] = useState(false)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)
  const [lightboxAbierto, setLightboxAbierto] = useState(false)

  // Sincroniza el estado interno cuando la prop cambia sin tocar efectos
  // (patrón "ajustar estado durante el render" recomendado por React).
  if (imgPathProp !== prevImgPathProp) {
    setPrevImgPathProp(imgPathProp)
    setImgPath(imgPathProp ?? null)
  }

  const tieneImagen = Boolean(imgPath)

  async function elegirArchivo(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0] ?? null
    e.target.value = ''
    if (!archivo) return
    setProcesando(true)
    try {
      const producto = await productosService.setImage(productoId, archivo)
      setImgPath(producto.imgPath ?? null)
      onChanged?.(producto)
      toast.success('Imagen actualizada')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'No se pudo actualizar la imagen',
      )
    } finally {
      setProcesando(false)
    }
  }

  function manejarBorrar() {
    setConfirmarBorrado(false)
    setProcesando(true)
    void (async () => {
      try {
        const producto = await productosService.removeImage(productoId)
        setImgPath(null)
        onChanged?.(producto)
        toast.success('Imagen eliminada')
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'No se pudo eliminar la imagen',
        )
      } finally {
        setProcesando(false)
      }
    })()
  }

  const botonClases =
    'grid h-9 w-9 cursor-pointer select-none place-items-center rounded-full border shadow-md backdrop-blur-md transition-colors disabled:cursor-not-allowed disabled:opacity-60 ' +
    'border-slate-300/80 bg-white text-slate-600 shadow-slate-900/10 hover:bg-slate-100 ' +
    'dark:border-white/25 dark:bg-slate-900/85 dark:text-white dark:shadow-black/40 dark:hover:bg-slate-800'

  return (
    <div
      className={cn(
        'relative shrink-0 rounded-2xl border border-slate-300/70 bg-slate-200/60 dark:border-slate-700/60 dark:bg-slate-800/60',
        className,
      )}
    >
      {/* Clip de la imagen adentro del redondeo: el contenedor externo NO tiene
          overflow-hidden para que los botones puedan sobresalir por la esquina.
          Click sobre la foto abre el lightbox (solo cuando hay imagen real). */}
      <div
        className="absolute inset-0 overflow-hidden rounded-2xl"
        onClick={tieneImagen ? () => setLightboxAbierto(true) : undefined}
      >
        <img
          src={buildAssetUrl(imgPath) ?? getProductPlaceholderLarge(productoId)}
          alt={tieneImagen ? nombre : `${nombre} sin foto`}
          loading="lazy"
          draggable={false}
          className={cn(
            'h-full w-full object-cover transition-transform duration-200',
            tieneImagen &&
              'cursor-pointer hover:scale-[1.04] hover:ring-2 hover:ring-inset hover:ring-emerald-500/60',
          )}
        />
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
        onChange={elegirArchivo}
      />

      {/* Botones circulares montados sobre la esquina: medio adentro, medio afuera */}
      <div className="absolute -right-2.5 -top-2.5 flex flex-col items-center gap-1.5">
        {tieneImagen ? (
          <DropdownMenu placement="bottom-end">
            <Tooltip content="Opciones de imagen" placement="left">
              <DropdownMenuTrigger
                type="button"
                disabled={procesando}
                aria-label="Opciones de imagen"
                className={botonClases}
              >
                {procesando ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <MoreVertical className="h-4 w-4" aria-hidden />
                )}
              </DropdownMenuTrigger>
            </Tooltip>
            <DropdownMenuContent>
              <DropdownMenuItem
                icon={<RefreshCw className="h-4 w-4" />}
                onClick={() => inputRef.current?.click()}
              >
                Cambiar imagen
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={<Trash2 className="h-4 w-4" />}
                variant="danger"
                onClick={() => setConfirmarBorrado(true)}
              >
                Eliminar imagen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Tooltip content="Poner imagen" placement="left">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={procesando}
              aria-label="Poner imagen"
              className={botonClases}
            >
              {procesando ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <ImagePlus className="h-4 w-4" aria-hidden />
              )}
            </button>
          </Tooltip>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmarBorrado}
        onClose={() => setConfirmarBorrado(false)}
        onConfirm={manejarBorrar}
        title="Eliminar imagen"
        description="¿Seguro que querés eliminar la imagen de este producto?"
      />

      <ImageLightbox
        open={lightboxAbierto}
        onClose={() => setLightboxAbierto(false)}
        src={buildAssetUrl(imgPath) ?? ''}
        alt={nombre}
      />
    </div>
  )
}