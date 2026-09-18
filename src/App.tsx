import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from './app/router'
import { useUIStore } from './stores/ui.store'

function App() {
  const theme = useUIStore((state) => state.theme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
  }, [theme])

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="bottom-left" theme={theme} richColors />
    </>
  )
}

export default App