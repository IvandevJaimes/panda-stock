import { Moon, Sun } from 'lucide-react'
import { useUIStore } from '../../stores/ui.store'
import { useSettingsStore } from '../../stores/settings.store'

export function Header() {
  const theme = useUIStore((state) => state.theme)
  const toggleTheme = useUIStore((state) => state.toggleTheme)
  const storeName = useSettingsStore((state) => state.storeName)

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-900">
      <div>
        <h1 className="font-display text-lg font-semibold text-gray-900 dark:text-gray-50">
          {storeName}
        </h1>
      </div>
      <button
        onClick={toggleTheme}
        className="cursor-pointer rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
        aria-label="Cambiar tema"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  )
}
