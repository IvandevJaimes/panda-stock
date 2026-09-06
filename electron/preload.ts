import { contextBridge, ipcRenderer } from 'electron'
import type { VentaInput } from './db/types.ts'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  db: {
    scanProduct: (codigo: string) => ipcRenderer.invoke('db:scan-product', codigo),
    processSale: (venta: VentaInput) => ipcRenderer.invoke('db:process-sale', venta),
  },
  reports: {
    verifyPin: (pin: string) => ipcRenderer.invoke('db:verify-pin', pin),
    changePin: (pinActual: string, pinNuevo: string) =>
      ipcRenderer.invoke('db:change-pin', pinActual, pinNuevo),
  },
})