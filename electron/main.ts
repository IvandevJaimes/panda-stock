import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { initDatabase } from './db/index.ts'
import {
  changeReportPin,
  processSale,
  scanProductByCode,
  verifyReportPin,
} from './db/repository.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const isDev = !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, '../dist-electron/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function registerIpcHandlers() {
  ipcMain.handle('db:scan-product', (_event, codigo: string) => scanProductByCode(codigo))
  ipcMain.handle('db:verify-pin', (_event, pin: string) => verifyReportPin(pin))
  ipcMain.handle('db:change-pin', (_event, pinActual: string, pinNuevo: string) =>
    changeReportPin(pinActual, pinNuevo),
  )
  ipcMain.handle('db:process-sale', (_event, venta) => processSale(venta))
}

app.whenReady().then(() => {
  initDatabase()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})