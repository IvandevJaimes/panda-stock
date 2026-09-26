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
      {/*
        `overflow-x-clip` porque `overflow-y-auto` solo no alcanza: por spec, si
        un eje no es `visible` el otro computa a `auto`, así que `<main>` es
        scroll container en los dos ejes. Los drawers `fixed` que se esconden
        con `translate-x-full` quedan 420px fuera del borde derecho y abrían una
        barra horizontal que atravesaba la página entera.

        `clip` y no `hidden` a propósito: `hidden` crea un scroll container y
        rompe el `sticky top-0` de Inventario. `clip` recorta sin ser scrollport.
      */}
      <main
        id="main-layout-scroll"
        className="flex-1 transform-gpu overflow-x-clip overflow-y-auto overscroll-contain px-4 pb-4 will-change-transform md:px-6 md:pb-6"
      >
        <Outlet />
      </main>
      <SettingsDrawer />
    </div>
  )
}