import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from './app/router'
import { useUIStore } from './stores/ui.store'

function App() {
  const theme = useUIStore((state) => state.theme)

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" theme={theme} richColors />
    </>
  )
}

export default App
