import { Outlet } from 'react-router-dom'
import { useTheme } from '../../hooks/useTheme'
import { Header } from './Header'
import { RightSidebar } from './RightSidebar'

/**
 * Layout principal de la aplicación.
 * Estructura: Topbar horizontal fijo arriba + área central con scroll + drawer colapsable a la derecha.
 */
export function AppLayout() {
  useTheme()

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#f4f6f8] text-[#16202c] dark:bg-[#0b0f17] dark:text-[#e8ecf2]">
      <Header />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <Outlet />
      </main>
      <RightSidebar />
    </div>
  )
}