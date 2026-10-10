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