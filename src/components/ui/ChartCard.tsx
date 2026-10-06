import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type ChartCardProps = {
  title: string
  description?: string
  icon?: ReactNode
  /** Acciones a la derecha del encabezado (leyenda propia, selector, etc.). */
  acciones?: ReactNode
  children: ReactNode
  className?: string
  /**
   * Alto del área del gráfico, en px.
   *
   * Es obligatorio y va en px a propósito. `ResponsiveContainer` de Recharts
   * mide el padre con `ResizeObserver`, y un padre con `h-full` dentro de una
   * cadena de flex termina con altura 0: el gráfico no se ve y no hay error.
   * El layout del POS (columna flex con `min-h-0`) es exactamente ese caso.
   */
  alto?: number
}

/**
 * Envoltura de los gráficos de Reportes.
 *
 * Solo maquetación: el borde, el fondo y el padding son los mismos que las
 * `KpiCard` de Inventario, para que las dos secciones se lean como una sola
 * pantalla.
 */
export function ChartCard({
  title,
  description,
  icon,
  acciones,
  children,
  className,
  alto = 280,
}: ChartCardProps) {
  return (
    <section
      className={cn(
        'w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-xs',
        'dark:border-slate-800/80 dark:bg-[#111827]',
        className,
      )}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {icon && (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
        </div>
        {acciones && <div className="shrink-0">{acciones}</div>}
      </header>

      {/*
        `overflow-hidden` recorta el SVG de Recharts cuando el eje X apila
        etiquetas. El wrapper `relative` + hijo `h-full` es lo que le da a
        `ResponsiveContainer` una altura que medir.
      */}
      <div className="relative w-full overflow-hidden" style={{ height: alto }}>
        <div className="h-full w-full">{children}</div>
      </div>
    </section>
  )
}