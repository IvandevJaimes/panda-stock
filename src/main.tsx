import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './globals.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ui/ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// Overlay global FUERA de React: captura errores y promesas rechazadas que
// React no alcanza a reportar y los muestra en pantalla (no queda blanca).
function instalarOverlayErrores() {
  const contenedor = document.createElement('div')
  contenedor.id = 'panda-error-overlay'
  contenedor.style.cssText =
    'position:fixed;bottom:12px;left:12px;right:12px;z-index:999999;' +
    'max-width:min(720px,calc(100vw - 24px));pointer-events:auto;' +
    'background:#b91c1c;color:#fff;font:12px/1.5 ui-monospace,monospace;' +
    'padding:10px 14px;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.5);' +
    'white-space:pre-wrap;word-break:break-word;display:none;'

  const mostrar = (mensaje: string) => {
    contenedor.textContent = `⛔ ${mensaje}`
    contenedor.style.display = 'block'
    if (!document.getElementById('panda-error-overlay')) {
      document.body.appendChild(contenedor)
    }
  }

  window.addEventListener('error', (evento) => {
    const origen = evento.filename ? ` (${evento.filename}:${evento.lineno ?? '?'})` : ''
    mostrar(`${evento.message}${origen}`)
  })

  window.addEventListener('unhandledrejection', (evento) => {
    const razon = evento.reason
    mostrar(razon instanceof Error ? razon.message : String(razon))
  })
}

instalarOverlayErrores()