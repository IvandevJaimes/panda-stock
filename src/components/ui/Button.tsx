import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: React.ReactNode
}

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover disabled:opacity-50',
  secondary:
    'bg-secondary text-white hover:bg-secondary/80 disabled:opacity-50',
  ghost:
    'bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10',
  danger:
    'bg-red-500 text-white hover:bg-red-600 disabled:opacity-50',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading = false, icon, children, disabled, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium transition-colors ${
          variants[variant]
        } ${sizes[size]}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="animate-spin" size={16} aria-hidden="true" />
        ) : (
          icon
        )}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'
