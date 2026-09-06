import { useEffect } from 'react'
import { useUIStore } from '../stores/ui.store'

/** Aplica el tema actual al elemento <html> una vez montada la app. */
export function useTheme() {
  const theme = useUIStore((state) => state.theme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
  }, [theme])

  return theme
}
