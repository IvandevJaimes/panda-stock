import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from './app/router'
import { useUIStore } from './stores/ui.store'
import { useNegocioStore } from './stores/negocio.store'
import { negocioService } from './services/negocio.service'
import { BusinessSetupModal } from './features/onboarding/BusinessSetupModal'
import { useScannerInit } from './hooks/useBarcodeScanner'

function App() {
  const theme = useUIStore((state) => state.theme)
  const setNegocio = useNegocioStore((state) => state.setNegocio)
  const [verificando, setVerificando] = useState(true)
  const [onboardingAbierto, setOnboardingAbierto] = useState(false)

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
        if (!activo) return
        const configurado = Boolean(negocio?.nombre?.trim())
        if (configurado && negocio) setNegocio(negocio)
        setOnboardingAbierto(!configurado)
      })
      .catch(() => {
        if (activo) setOnboardingAbierto(false)
      })
      .finally(() => {
        if (activo) setVerificando(false)
      })

    return () => {
      activo = false
    }
  }, [setNegocio])

  return (
    <>
      <RouterProvider router={router} />
      {!verificando && (
        <BusinessSetupModal
          isOpen={onboardingAbierto}
          onSuccess={(negocio) => {
            setNegocio(negocio)
            setOnboardingAbierto(false)
          }}
        />
      )}
      <Toaster position="bottom-left" theme={theme} richColors />
    </>
  )
}

export default App