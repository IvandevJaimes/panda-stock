import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { TippyProps } from '@tippyjs/react'
import { Tooltip } from './Tooltip'
import { cn } from '../../lib/cn'

interface TruncatedTextProps {
  text: string
  className?: string
  placement?: TippyProps['placement']
  children?: ReactNode
  lines?: 1 | 2 | 3
}

/**
 * Clases literales a propósito: Tailwind escanea el fuente, no el runtime, así
 * que un `line-clamp-${lines}`-template no se generaría nunca y el clamp
 * silenciosamente no aplicaría.
 */
const clampPorLineas = {
  1: 'truncate',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
} as const

export function TruncatedText({
  text,
  className,
  placement,
  children,
  lines = 1,
}: TruncatedTextProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)
  const multilinea = lines > 1

  const checkTruncated = useCallback(() => {
    const el = ref.current
    if (!el) return
    // Una sola línea se desborda en el eje horizontal; con `line-clamp` el texto
    // se envuelve y lo que se recorta es en vertical. Medir el eje equivocado
    // devuelve `false` siempre y el tooltip nunca aparece: el `min-h` reservado
    // mantiene el alto, pero `scrollWidth` queda igual a `clientWidth` porque
    // cada línea entra a lo ancho.
    setIsTruncated(
      multilinea ? el.scrollHeight > el.clientHeight : el.scrollWidth > el.clientWidth,
    )
  }, [multilinea])

  useEffect(() => {
    checkTruncated()
    window.addEventListener('resize', checkTruncated)
    return () => window.removeEventListener('resize', checkTruncated)
  }, [text, checkTruncated])

  const span = (
    <span
      ref={ref}
      onMouseEnter={checkTruncated}
      // `block` solo en una línea: `line-clamp-*` necesita `display: -webkit-box`
      // y las dos clases pelearían por la misma propiedad.
      className={cn(multilinea ? clampPorLineas[lines] : 'block truncate', className)}
    >
      {children ?? text}
    </span>
  )

  if (!isTruncated) return span

  return (
    <Tooltip content={text} placement={placement}>
      {span}
    </Tooltip>
  )
}