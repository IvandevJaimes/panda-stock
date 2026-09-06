import type { ScanProductResult, VentaInput, VentaResult } from '../../electron/db/types'

export {}

declare global {
  interface Window {
    electronAPI: {
      platform: string
      db: {
        scanProduct: (codigo: string) => Promise<ScanProductResult | null>
        processSale: (venta: VentaInput) => Promise<VentaResult>
      }
      reports: {
        verifyPin: (pin: string) => Promise<boolean>
        changePin: (pinActual: string, pinNuevo: string) => Promise<boolean>
      }
    }
  }
}