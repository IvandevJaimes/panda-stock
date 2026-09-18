import { useId, useMemo, useEffect, useState, type ChangeEvent, type DragEvent } from 'react'
import { ImagePlus, RefreshCw, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { FieldError } from './FieldError'

export type ImageDropzoneProps = {
  value?: File | string | null
  onChange?: (file: File | null) => void
  onBlur?: () => void
  error?: string
  shape?: 'circle' | 'square'
  className?: string
}

export function ImageDropzone({
  value,
  onChange,
  onBlur,
  error,
  shape = 'square',
  className,
}: ImageDropzoneProps) {
  const inputId = useId()
  const [isDragging, setIsDragging] = useState(false)

  const previewUrl = useMemo(() => {
    if (value instanceof File) return URL.createObjectURL(value)
    if (typeof value === 'string' && value.trim()) return value
    return null
  }, [value])

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const hasPreview = previewUrl !== null

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    e.target.value = ''
    onChange?.(file)
    onBlur?.()
  }

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0] ?? null
    if (file) onChange?.(file)
  }

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      <div className="relative">
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragEnter={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'group relative flex w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed text-center transition-colors duration-150',
            shape === 'circle' ? 'aspect-square rounded-full' : 'aspect-[4/3]',
            hasPreview
              ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40'
              : 'border-emerald-500/40 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-950/20',
            isDragging &&
              'border-emerald-500 bg-emerald-100/70 dark:border-emerald-400 dark:bg-emerald-950/40',
            error && 'border-red-400 dark:border-red-500',
          )}
        >
          {hasPreview ? (
            <>
              <img
                key={previewUrl}
                src={previewUrl}
                alt="Vista previa del logo"
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-slate-900/70 to-transparent py-2 text-[11px] font-semibold text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <RefreshCw size={12} aria-hidden="true" />
                Cambiar imagen
              </span>
            </>
          ) : (
            <>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ImagePlus size={22} aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Arrastrá una imagen o tocá para elegir
              </span>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                PNG, JPG o WebP &middot; máx. 5 MB
              </span>
            </>
          )}
        </label>

        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-hidden="true"
          tabIndex={-1}
          className="sr-only"
          onChange={handleChange}
        />

        {hasPreview && (
          <button
            type="button"
            onClick={() => onChange?.(null)}
            aria-label="Quitar imagen"
            className="absolute right-2 top-2 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-slate-900/70 text-white shadow-sm backdrop-blur transition-colors duration-150 hover:bg-red-600"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      <FieldError error={error} />
    </div>
  )
}