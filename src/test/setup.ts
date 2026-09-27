import { afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { barcodeScannerService } from '../services/barcode-scanner.service'
import { usePosTicketsStore } from '../stores/pos-tickets.store'
import { useScannerStore } from '../stores/scanner.store'
import { useCajaStore } from '../stores/caja.store'

// jsdom no implementa layout, así que scrollIntoView no existe. Componentes que
// lo usan para traer un elemento a la vista (ej. CustomSelect al abrir el
// dropdown) revientan en tests. Se stubea no-op global.
beforeAll(() => {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView() {}
  }

  // jsdom no implementa `matchMedia` y `useMediaQuery` lo lee en el
  // inicializador del `useState`, así que sin esto el componente revienta en el
  // render. `matches: false` deja los tests en el extremo de escritorio: el POS
  // se renderiza con el panel fijo y sin drawer. El otro extremo se prueba
  // sobreescribiendo el stub con `vi.stubGlobal`.
  if (!window.matchMedia) {
    window.matchMedia = function matchMedia(query: string): MediaQueryList {
      return {
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      } as unknown as MediaQueryList
    }
  }
})

afterEach(() => {
  cleanup()
  barcodeScannerService.destroy()
  useScannerStore.getState().setContext(null, null)
  useScannerStore.getState().setAttached(false)
  // Los tickets persisten en localStorage, así que sin esto cada test hereda
  // las líneas del anterior y falla por estado ajeno.
  localStorage.clear()
  usePosTicketsStore.getState().vaciarPersistencia()
  // La caja abierta se lee de la base y vive en el store: un test que abra una
  // caja dejaría al siguiente creyendo que puede cobrar, que es justo el estado
  // que los tests del cobro necesitan controlar.
  useCajaStore.setState({ caja: null, cargado: true })
})