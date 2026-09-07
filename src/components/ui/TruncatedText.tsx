import { useEffect, useRef, useState } from 'react'
import type { TippyProps } from '@tippyjs/react'
import { Tooltip } from './Tooltip'
import { cn } from '../../lib/cn'

interface TruncatedTextProps {
  text: string
  className?: string
  placement?: TippyProps['placement']
}

export function TruncatedText({ text, className, placement }: TruncatedTextProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  const checkTruncated = () => {
    const el = ref.current
    if (!el) return
    setIsTruncated(el.scrollWidth > el.clientWidth)
  }

  useEffect(() => {
    checkTruncated()
    window.addEventListener('resize', checkTruncated)
    return () => window.removeEventListener('resize', checkTruncated)
  }, [text])

  const span = (
    <span
      ref={ref}
      onMouseEnter={checkTruncated}
      className={cn('block truncate', className)}
    >
      {text}
    </span>
  )

  if (!isTruncated) return span

  return (
    <Tooltip content={text} placement={placement}>
      {span}
    </Tooltip>
  )
}