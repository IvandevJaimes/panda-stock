import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { barcodeScannerService } from '../services/barcode-scanner.service'
import { useScannerStore } from '../stores/scanner.store'

afterEach(() => {
  cleanup()
  barcodeScannerService.destroy()
  useScannerStore.getState().setContext(null, null)
  useScannerStore.getState().setAttached(false)
})