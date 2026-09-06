import { Outlet } from 'react-router-dom'
import { useTheme } from '../../hooks/useTheme'
import { Header } from './Header'
import { Navigation } from './Navigation'

export function AppLayout() {
  useTheme()

  return (
    <div className="flex h-screen w-full bg-white text-gray-900 dark:bg-[#0b0f14] dark:text-gray-50">
      <aside className="flex h-full w-60 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex h-14 items-center border-b border-gray-200 px-6 dark:border-gray-800">
          <span className="font-display text-lg font-bold text-primary">
            PANDA
          </span>
          <span className="font-display text-lg font-light text-gray-400 dark:text-gray-500">
            STOCK
          </span>
        </div>
        <Navigation />
      </aside>
      <main className="flex h-full min-w-0 flex-1 flex-col">
        <Header />
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
