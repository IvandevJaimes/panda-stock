import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from './app/router'
import { useUIStore } from './stores/ui.store'
import { useNegocioStore } from './stores/negocio.store'
import { negocioService } from './services/negocio.service'
import { useScannerInit } from './hooks/useBarcodeScanner'
import { StockAlertSound } from './components/ui/alerts/StockAlertSound'
import { detectExpiryAlerts } from './services/expiryDetectionService'
import { seguridadService } from './services/seguridad.service'
import { PROTECCIONES_INICIALES } from './types/security'
import { useSettingsStore } from './stores/settings.store'

function App() {
  const theme = useUIStore((state) => state.theme)
  const setNegocio = useNegocioStore((state) => state.setNegocio)

  // Inicialización global del lector de códigos de barras USB.
  useScannerInit()

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
  }, [theme])

  useEffect(() => {
    window.electronAPI.app.interfazLista()
  }, [])

  useEffect(() => {
    let activo = true
    negocioService
      .get()
      .then((negocio) => {
        if (activo && negocio) setNegocio(negocio)
      })
      .catch(() => {})
    return () => {
      activo = false
    }
  }, [setNegocio])

  useEffect(() => {
    const store = useSettingsStore.getState()
    const protecciones = store.proteccionesSeedLocal ?? PROTECCIONES_INICIALES
    Promise.all([seguridadService.getProtecciones(protecciones), seguridadService.tieneContrasena()])
      .then(([proteccionesDb, tieneContrasena]) => {
        useSettingsStore.getState().hidratarSeguridad(proteccionesDb, tieneContrasena)
      })
      .catch(() => {
        const todasProtegidas = Object.fromEntries(
          Object.keys(PROTECCIONES_INICIALES).map((clave) => [clave, true]),
        ) as typeof PROTECCIONES_INICIALES
        useSettingsStore.getState().hidratarSeguridad(todasProtegidas, true)
      })
  }, [])

  useEffect(() => {
    detectExpiryAlerts().catch((err) => {
      console.warn('Error detectando vencimientos:', err)
    })
  }, [])

  return (
    <>
      <StockAlertSound />
      <RouterProvider router={router} />
      <Toaster position="bottom-left" theme={theme} richColors />
      <Toaster
        id="stock"
        position="top-center"
        offset={{ top: 20 }}
        theme={theme}
        gap={6}
      />
    </>
  )
}

export default App
