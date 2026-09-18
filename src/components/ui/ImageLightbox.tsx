import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

export type ImageLightboxProps = {
  open: boolean
  onClose: () => void
  src: string
  alt?: string
  className?: string
}

export function ImageLightbox({
  open,
  onClose,
  src,
  alt = 'Imagen en pantalla completa',
  className,
}: ImageLightboxProps) {
  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.body.classList.add('overflow-hidden')

    const scrollContainer = document.getElementById('main-layout-scroll')
    if (scrollContainer) {
      scrollContainer.classList.add('!overflow-hidden')
    }

    document.addEventListener('keydown', onKey)

    return () => {
      document.body.classList.remove('overflow-hidden')
      if (scrollContainer) {
        scrollContainer.classList.remove('!overflow-hidden')
      }
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/80 animate-entry-fade backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      <button
        onClick={onClose}
        aria-label="Cerrar vista de imagen"
        className="absolute right-4 top-4 z-10 grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors duration-150 hover:bg-white/25"
      >
        <X size={22} aria-hidden="true" />
      </button>

      <img
        src={src}
        alt={alt}
        draggable={false}
        className={cn(
          'relative z-[1] max-h-[92vh] max-w-[92vw] rounded-lg object-contain shadow-2xl animate-entry-up',
          className,
        )}
      />
    </div>,
    document.body,
  )
}