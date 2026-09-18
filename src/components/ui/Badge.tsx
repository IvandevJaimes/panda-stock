import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type BadgeVariant = 'default' | 'expired' | 'warning'

export type { BadgeVariant }

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
  /** Muestra un punto de estado a la izquierda del texto */
  dot?: boolean
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-transparent text-slate-400 dark:text-slate-500',
  expired: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
}

const dots: Partial<Record<BadgeVariant, string>> = {
  expired: 'bg-rose-500',
  warning: 'bg-amber-500',
}

export function Badge({
  variant = 'default',
  dot = false,
  children,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    >
      {dot && variant !== 'default' && (
        <span className={cn('h-1.5 w-1.5 rounded-full', dots[variant])} aria-hidden="true" />
      )}
      {children}
    </span>
  )
}