import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Tooltip } from './Tooltip'

type IconButtonVariant = 'ghost' | 'danger' | 'solid'
type IconButtonSize = 'xs' | 'sm' | 'md'
type IconButtonShape = 'circle' | 'square'

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: ReactNode
  variant?: IconButtonVariant
  size?: IconButtonSize
  shape?: IconButtonShape
  /**
   * Si se pasa, el botón se envuelve en un tooltip.
   *
   * El tooltip es texto CORTO y el `aria-label` texto AUTOCONTENIDO, y no es
   * casualidad: el tooltip se lee mirando la fila donde ya se sabe qué producto
   * es, así que "Agregar 1" alcanza; el `aria-label` lo lee un lector de
   * pantalla saltando entre controles, así que necesita el nombre del producto
   * para no ser ambiguo. No es un canal que deba copiar al otro.
   */
  tooltip?: ReactNode
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right'
}

const variants: Record<IconButtonVariant, string> = {
  ghost:
    'text-slate-600 hover:bg-emerald-500/10 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-400',
  danger:
    'text-slate-500 hover:bg-red-500/10 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400',
  solid: 'bg-emerald-500 text-white hover:bg-emerald-600',
}

const sizes: Record<IconButtonSize, string> = {
  xs: 'h-[26px] w-[26px]',
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      variant = 'ghost',
      size = 'sm',
      shape = 'circle',
      tooltip,
      tooltipPlacement = 'top',
      className,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const boton = (
      <button
        ref={ref}
        type={type}
        className={cn(
          'grid shrink-0 cursor-pointer place-items-center transition-colors duration-150',
          'focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 focus-visible:outline-none',
          'dark:focus-visible:ring-offset-slate-900',
          'disabled:pointer-events-none disabled:cursor-default disabled:opacity-40',
          shape === 'circle' ? 'rounded-full' : 'rounded-lg',
          sizes[size],
          variants[variant],
          className,
        )}
        {...props}
      >
        <span aria-hidden="true" className="pointer-events-none grid place-items-center">
          {icon}
        </span>
      </button>
    )

    if (!tooltip) return boton

    // El Tooltip envuelve un <span>, no el <button>: el anillo de foco de
    // focus-visible se dibuja fuera de la caja del botón, y si el padre es el
    // contenedor redondeado con overflow-hidden (como el delQuantityStepper) el
    // shadow queda recortado. Un span intermedio recibe el foco visible sin
    // recortarse. El ref no es el motivo: @tippyjs/react preserva el del hijo.
    return (
      <span className="inline-flex">
        <Tooltip content={tooltip} placement={tooltipPlacement}>
          {boton}
        </Tooltip>
      </span>
    )
  },
)

IconButton.displayName = 'IconButton'
