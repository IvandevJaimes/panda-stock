import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { FieldError } from './FieldError'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  /** Acción cliqueable posicionada a la derecha del input */
  rightAction?: ReactNode
  /** Acción cliqueable posicionada a la derecha del label */
  labelAction?: ReactNode
  /** Muestra un botón de limpieza circular SOLO cuando el input tiene contenido */
  onClear?: () => void
  /** Clases aplicadas al contenedor raíz del input (para control de layout externo) */
  wrapperClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, id, className, leftIcon, rightIcon, rightAction, labelAction, onClear, wrapperClassName, ...props },
    ref,
  ) => {
    const inputId = id ?? props.name
    const tieneContenido =
      typeof props.value === 'string'
        ? props.value.length > 0
        : props.value !== undefined && props.value !== null
    const mostrarClear = Boolean(onClear && tieneContenido)

    return (
      <div className={cn('flex w-full flex-col gap-1.5', wrapperClassName)}>
        {(label || labelAction) && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={inputId}
              className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              {label}
            </label>
            {labelAction}
          </div>
        )}
        <div className="relative w-full">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'px-4 py-2.5 w-full rounded-xl border bg-white text-sm text-slate-900 outline-none transition-colors duration-150 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:bg-[#111827] dark:text-slate-100 dark:placeholder:text-slate-500',
              leftIcon && 'pl-10',
              (rightIcon || rightAction || mostrarClear) && 'pr-10',
              error ? 'border-red-500' : 'border-slate-200 dark:border-slate-800',
              className,
            )}
            {...props}
          />
          {mostrarClear && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Limpiar campo"
              className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
          {rightAction && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {rightAction}
            </div>
          )}
          {rightIcon && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              {rightIcon}
            </span>
          )}
        </div>
        <FieldError error={error} />
      </div>
    )
  },
)

Input.displayName = 'Input'