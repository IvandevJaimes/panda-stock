import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { SettingsDrawer } from './SettingsDrawer'

/**
 * Layout principal de la aplicación.
 * Estructura: Topbar horizontal fijo arriba + área central con scroll + drawer colapsable a la derecha.
 */
export function AppLayout() {
  return (
    <div className="flex h-screen w-full max-w-full flex-col overflow-hidden bg-[#f4f6f8] text-[#16202c] dark:bg-[#0b0f17] dark:text-[#e8ecf2]">
      <Header />
      <main
        id="main-layout-scroll"
        className="flex-1 transform-gpu overflow-y-auto overscroll-contain px-4 pb-4 will-change-transform md:px-6 md:pb-6"
      >
        <Outlet />
      </main>
      <SettingsDrawer />
    </div>
  )
}