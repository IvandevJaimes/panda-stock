import { Outlet } from 'react-router-dom'
import { useTheme } from '../../hooks/useTheme'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

/**
 * Layout principal de la aplicación.
 * Estructura: Sidebar fijo lateral + columna principal (Header + contenido con scroll independiente).
 * Los glows decorativos replican el fondo de la plantilla.
 */
export function AppLayout() {
  useTheme()

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[#f4f6f8] text-[#16202c] dark:bg-[#0b0f14] dark:text-[#e8ecf2]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-[900px] bg-[radial-gradient(900px_500px_at_85%_-10%,rgba(5,150,105,0.06),transparent_60%)] dark:bg-[radial-gradient(900px_500px_at_85%_-10%,rgba(16,185,129,0.07),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[700px] bg-[radial-gradient(700px_420px_at_-10%_0%,rgba(37,99,235,0.05),transparent_55%)] dark:bg-[radial-gradient(700px_420px_at_-10%_0%,rgba(96,165,250,0.05),transparent_55%)]"
      />

      <div className="relative z-10 flex h-full w-full min-w-0">
        <Sidebar />
        <main className="flex h-full min-w-0 flex-1 flex-col">
          <Header />
          <div className="flex-1 overflow-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}