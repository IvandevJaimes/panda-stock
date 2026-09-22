import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../../lib/cn'
import { MIME_A_EXTENSION, MAX_LOGO_SIZE } from '../../features/onboarding/business.schema'
import { Tooltip } from './Tooltip'
import { ImageLightbox } from './ImageLightbox'

export interface ProductImageFieldProps {
  /** Archivo pendiente de subir (null = sin foto). */
  value: File | null
  onChange: (archivo: File | null) => void
  className?: string
}

const botonClases =
  'grid h-9 w-9 cursor-pointer select-none place-items-center rounded-full border shadow-md backdrop-blur-md transition-colors disabled:cursor-not-allowed disabled:opacity-60 ' +
  'border-slate-300/80 bg-white text-slate-600 shadow-slate-900/10 hover:bg-slate-100 ' +
  'dark:border-white/25 dark:bg-slate-900/85 dark:text-white dark:shadow-black/40 dark:hover:bg-slate-800'

/**
 * Campo controlado de foto de producto para formularios de alta, donde todavía no
 * existe un producto en la base (a diferencia de ProductImageBox, que persiste por
 * IPC contra un producto ya creado). Sin placeholder, con un "+" para elegir
 * archivo y botones directos de cambiar/eliminar (sin dropdown ni confirmación).
 */
export function ProductImageField({
  value,
  onChange,
  className,
}: ProductImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [valorPrevio, setValorPrevio] = useState(value)
  const urlsRef = useRef<string[]>([])
  const [lightboxAbierto, setLightboxAbierto] = useState(false)

  // Sincroniza el preview cuando la prop cambia desde afuera (ej. reset del form
  // a null al abrir el modal) sin tocar efectos ni refs: patrón "ajustar estado
  // durante el render" de React. Los cambios a File se hacen siempre por handlers.
  if (value !== valorPrevio) {
    setValorPrevio(value)
    if (value === null) setPreview(null)
  }

  // Revoca las object URLs al desmontar para no acumular memoria.
  useEffect(() => {
    return () => {
      for (const url of urlsRef.current) URL.revokeObjectURL(url)
      urlsRef.current = []
    }
  }, [])

  function manejarSeleccion(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0] ?? null
    e.target.value = ''
    if (!archivo) return

    if (!(archivo.type in MIME_A_EXTENSION)) {
      toast.error('La imagen debe ser PNG, JPG o WebP')
      return
    }
    if (archivo.size > MAX_LOGO_SIZE) {
      toast.error('La imagen no puede superar los 5 MB')
      return
    }

    const url = URL.createObjectURL(archivo)
    urlsRef.current.push(url)
    setPreview(url)
    onChange(archivo)
  }

  function manejarQuitar() {
    setPreview(null)
    onChange(null)
  }

  const tieneImagen = value !== null && preview !== null

  return (
    <div
      className={cn(
        'relative shrink-0 rounded-2xl border border-slate-300/70 bg-slate-200/60 dark:border-slate-700/60 dark:bg-slate-800/60',
        className,
      )}
    >
      {tieneImagen ? (
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl"
          onClick={() => setLightboxAbierto(true)}
        >
          <img
            src={preview}
            alt="Foto del producto"
            draggable={false}
            className="h-full w-full cursor-pointer object-cover transition-transform duration-200 hover:scale-[1.04] hover:ring-2 hover:ring-inset hover:ring-emerald-500/60"
          />
        </div>
      ) : (
        <Tooltip content="Agregar foto" placement="top">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label="Agregar foto"
            className="grid h-full w-full cursor-pointer select-none place-items-center rounded-2xl border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-emerald-500 hover:text-emerald-500 dark:border-slate-700 dark:text-slate-500 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
          >
            <ImagePlus className="h-8 w-8" aria-hidden />
          </button>
        </Tooltip>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
        onChange={manejarSeleccion}
      />

      {tieneImagen && (
        <div className="absolute -right-2.5 -top-2.5 flex flex-col items-center gap-1.5">
          <Tooltip content="Cambiar foto" placement="left">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              aria-label="Cambiar foto"
              className={botonClases}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
            </button>
          </Tooltip>
          <Tooltip content="Quitar foto" placement="left">
            <button
              type="button"
              onClick={manejarQuitar}
              aria-label="Quitar foto"
              className={botonClases}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </Tooltip>
        </div>
      )}

      <ImageLightbox
        open={lightboxAbierto}
        onClose={() => setLightboxAbierto(false)}
        src={preview ?? ''}
        alt="Foto del producto"
      />
    </div>
  )
}