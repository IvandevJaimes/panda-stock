import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { SOMBRA_CARD } from './estilos'

type ReporteKpiCardProps = {
  icon: ReactNode
  iconBgClass: string
  title: string
  value: string | number
  valueClassName?: string
  subtitle: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export function ReporteKpiCard({
  icon,
  iconBgClass,
  title,
  value,
  valueClassName,
  subtitle,
  action,
  className,
}: ReporteKpiCardProps) {
  return (
    <article
      className={cn(
        'flex min-h-32 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-[#111827] sm:p-5',
        SOMBRA_CARD,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{title}</p>
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', iconBgClass)}>
          {icon}
        </span>
      </div>
      <div className="mt-3 min-w-0">
        <p className={cn(
          'truncate font-display text-2xl font-bold leading-tight tabular-nums text-slate-900 dark:text-white sm:text-[1.75rem]',
          valueClassName,
        )}>
          {value}
        </p>
        <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:text-emerald-400 dark:hover:text-emerald-300 dark:focus-visible:ring-offset-[#111827]"
          >
            {action.label}
            <ArrowRight size={13} aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  )
}
