import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  /** Acción cliqueable posicionada a la derecha del input */
  rightAction?: ReactNode
  /** Clases aplicadas al contenedor raíz del input (para control de layout externo) */
  wrapperClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, id, className, leftIcon, rightIcon, rightAction, wrapperClassName, ...props },
    ref,
  ) => {
    const inputId = id ?? props.name

    return (
      <div className={cn('flex w-full flex-col gap-1.5', wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {label}
          </label>
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
              (rightIcon || rightAction) && 'pr-10',
              error ? 'border-red-500' : 'border-slate-200 dark:border-slate-800',
              className,
            )}
            {...props}
          />
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
        {error && (
          <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'