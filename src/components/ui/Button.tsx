import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'icon'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  rounded?: 'lg' | 'full'
}

const variants: Record<Variant, string> = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-500/30',
  secondary:
    'bg-slate-800 text-white hover:bg-slate-700 focus-visible:ring-slate-500/30 dark:bg-slate-700 dark:hover:bg-slate-600',
  outline:
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400/30 dark:border-slate-700 dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-slate-800',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/30 shadow-xs dark:bg-red-600 dark:hover:bg-red-500',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-10 w-10 px-0',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      children,
      className,
      rounded = 'lg',
      disabled,
      ...props
    },
    ref,
  ) => {
    const sinTexto = !children && (icon || loading)
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex cursor-pointer items-center justify-center gap-2 font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          rounded === 'full' && (sinTexto || size === 'icon')
            ? 'rounded-full'
            : 'rounded-xl',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          icon
        )}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'