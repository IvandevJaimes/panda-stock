import { useEffect, useState } from 'react'
import { Bell, Moon, Sun } from 'lucide-react'
import { cajasService } from '../../services/cajas.service'
import { useSettingsStore } from '../../stores/settings.store'
import { useUIStore } from '../../stores/ui.store'
import { cn } from '../../lib/cn'

export function Header() {
  const theme = useUIStore((state) => state.theme)
  const toggleTheme = useUIStore((state) => state.toggleTheme)
  const storeName = useSettingsStore((state) => state.storeName)
  const [cajaAbierta, setCajaAbierta] = useState(false)

  useEffect(() => {
    let activo = true
    cajasService
      .getActive()
      .then((caja) => {
        if (activo) setCajaAbierta(caja !== null)
      })
      .catch(() => {
        if (activo) setCajaAbierta(false)
      })
    return () => {
      activo = false
    }
  }, [])

  return (
    <header
      className={cn(
        'flex h-14 shrink-0 items-center gap-4 px-6',
        'border-b border-[#e3e8ee] bg-[rgba(255,255,255,0.86)] backdrop-blur-[14px]',
        'dark:border-[#212b37] dark:bg-[rgba(11,15,20,0.82)]',
      )}
    >
      {/* ── Nombre del local ── */}
      <div className="flex flex-col leading-tight">
        <h1 className="font-display text-[17px] font-bold tracking-[-0.01em] text-[#16202c] dark:text-[#e8ecf2]">
          {storeName}
        </h1>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c99a9] dark:text-[#66707e]">
          Punto de venta
        </span>
      </div>

      {/* ── Acciones ── */}
      <div className="ml-auto flex items-center gap-2">
        {/* Indicador de caja abierta */}
        {cajaAbierta && (
          <span
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3.5 py-2',
              'border-[rgba(5,150,105,0.30)] bg-[rgba(5,150,105,0.10)]',
              'font-display text-[13px] font-semibold text-[#047857]',
              'dark:border-[rgba(16,185,129,0.35)] dark:bg-[rgba(16,185,129,0.12)] dark:text-[#34d399]',
            )}
          >
            <span
              className={cn(
                'h-2 w-2 shrink-0 animate-pulse rounded-full',
                'bg-[#059669] shadow-[0_0_0_4px_rgba(5,150,105,0.10)]',
                'dark:bg-[#10b981] dark:shadow-[0_0_0_4px_rgba(16,185,129,0.14)]',
              )}
            />
            Caja abierta
          </span>
        )}

        {/* Campana de notificaciones */}
        <button
          className={cn(
            'relative grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl',
            'border border-[#e3e8ee] bg-white text-[#5a687a] transition-all duration-150',
            'hover:border-[#d5dce4] hover:bg-[#f1f4f7] hover:text-[#16202c]',
            'dark:border-[#212b37] dark:bg-[#121821] dark:text-[#a6b0bf]',
            'dark:hover:border-[#2b3745] dark:hover:bg-[#181f2a] dark:hover:text-[#e8ecf2]',
          )}
          aria-label="Notificaciones"
        >
          <Bell size={19} />
        </button>

        {/* Toggle de tema */}
        <button
          onClick={toggleTheme}
          aria-label="Cambiar tema"
          className={cn(
            'grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl',
            'border border-[#e3e8ee] bg-[#f8fafc] text-[#5a687a] transition-all duration-150',
            'hover:border-[#d5dce4] hover:bg-[#f1f4f7] hover:text-[#16202c]',
            'dark:border-[#212b37] dark:bg-[#181f2a] dark:text-[#a6b0bf]',
            'dark:hover:border-[#2b3745] dark:hover:bg-[#1e2733] dark:hover:text-[#e8ecf2]',
          )}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  )
}