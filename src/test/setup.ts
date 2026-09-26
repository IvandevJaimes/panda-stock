import { afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { barcodeScannerService } from '../services/barcode-scanner.service'
import { useScannerStore } from '../stores/scanner.store'

// jsdom no implementa layout, así que scrollIntoView no existe. Componentes que
// lo usan para traer un elemento a la vista (ej. CustomSelect al abrir el
// dropdown) revientan en tests. Se stubea no-op global.
beforeAll(() => {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView() {}
  }
})

afterEach(() => {
  cleanup()
  barcodeScannerService.destroy()
  useScannerStore.getState().setContext(null, null)
  useScannerStore.getState().setAttached(false)
})