import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
} from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { initDatabase } from "./db/index.ts";
import {
  changePin,
  closeCaja,
  createAjusteStock,
  crearMovimientoStock,
  createCategoria,
  createEmpleado,
  createLote,
  createMarca,
  createProducto,
  deleteCategoria,
  deleteMarca,
  deleteProducto,
  getActiveCaja,
  getAlertasStock,
  getCajaSummary,
  getCategorias,
  getEmpleados,
  getLotesByProducto,
  getLotesPorVencer,
  getMarcas,
  getMovimientosStock,
  getProductoById,
  getProductos,
  getReportesSummary,
  getVentaDetalle,
  getVentas,
  openCaja,
  processSale,
  scanProductByCode,
  toggleEmpleado,
  updateCategoria,
  updateMarca,
  updateProducto,
  verifyPin,
} from "./db/repository.ts";
import type {
  AjusteStockInput,
  AperturaCajaInput,
  CierreCajaInput,
  FiltrosMovimientos,
  FiltrosProducto,
  FiltrosReportes,
  FiltrosVentas,
  NuevoEmpleado,
  NuevoLote,
  VentaCompletaInput,
} from "./db/types.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 480,
    minHeight: 700,
    resizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../dist-electron/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Sin barra de menú nativa (solo menú de aplicación en macOS si aplica).
  win.setMenu(null);

  // DevTools solo en desarrollo, alternadas con F12.
  win.webContents.on("before-input-event", (_event, input) => {
    if (input.type === "keyDown" && input.key === "F12" && isDev) {
      _event.preventDefault();
      win.webContents.toggleDevTools();
    }
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

function registerIpcHandlers() {
  ipcMain.handle("seguridad:verify-pin", (_event, pin: string) =>
    verifyPin(pin),
  );
  ipcMain.handle(
    "seguridad:change-pin",
    (_event, pinActual: string, pinNuevo: string) =>
      changePin(pinActual, pinNuevo),
  );

  ipcMain.handle("empleados:get-all", () => getEmpleados());
  ipcMain.handle("empleados:create", (_event, data: NuevoEmpleado) =>
    createEmpleado(data),
  );
  ipcMain.handle("empleados:toggle", (_event, id: number, activo: boolean) =>
    toggleEmpleado(id, activo),
  );

  ipcMain.handle("categorias:get-all", () => getCategorias());
  ipcMain.handle("categorias:create", (_event, nombre: string) =>
    createCategoria(nombre),
  );
  ipcMain.handle("categorias:update", (_event, id: number, nombre: string) =>
    updateCategoria(id, nombre),
  );
  ipcMain.handle("categorias:delete", (_event, id: number) =>
    deleteCategoria(id),
  );

  ipcMain.handle("marcas:get-all", () => getMarcas());
  ipcMain.handle("marcas:create", (_event, nombre: string) =>
    createMarca(nombre),
  );
  ipcMain.handle("marcas:update", (_event, id: number, nombre: string) =>
    updateMarca(id, nombre),
  );
  ipcMain.handle("marcas:delete", (_event, id: number) => deleteMarca(id));

  ipcMain.handle("productos:scan", (_event, codigo: string) =>
    scanProductByCode(codigo),
  );
  ipcMain.handle("productos:get-all", (_event, filtros?: FiltrosProducto) =>
    getProductos(filtros),
  );
  ipcMain.handle("productos:get-by-id", (_event, id: number) =>
    getProductoById(id),
  );
  ipcMain.handle("productos:create", (_event, data) => createProducto(data));
  ipcMain.handle("productos:update", (_event, id: number, data) =>
    updateProducto(id, data),
  );
  ipcMain.handle("productos:delete", (_event, id: number) =>
    deleteProducto(id),
  );
  ipcMain.handle("productos:get-alerts", () => getAlertasStock());

  ipcMain.handle("lotes:get-by-producto", (_event, productoId: number) =>
    getLotesByProducto(productoId),
  );
  ipcMain.handle("lotes:create", (_event, data: NuevoLote) => createLote(data));
  ipcMain.handle("lotes:get-expiring", (_event, diasLimite: number) =>
    getLotesPorVencer(diasLimite),
  );

  ipcMain.handle("cajas:get-active", () => getActiveCaja());
  ipcMain.handle("cajas:open", (_event, data: AperturaCajaInput) =>
    openCaja(data),
  );
  ipcMain.handle("cajas:get-summary", (_event, cajaId: number) =>
    getCajaSummary(cajaId),
  );
  ipcMain.handle("cajas:close", (_event, data: CierreCajaInput) =>
    closeCaja(data),
  );

  ipcMain.handle("ventas:process", (_event, venta: VentaCompletaInput) =>
    processSale(venta),
  );
  ipcMain.handle("ventas:get-all", (_event, filtros?: FiltrosVentas) =>
    getVentas(filtros),
  );
  ipcMain.handle("ventas:get-detail", (_event, idVenta: number) =>
    getVentaDetalle(idVenta),
  );

  ipcMain.handle(
    "movimientos:get-all",
    (_event, filtros?: FiltrosMovimientos) => getMovimientosStock(filtros),
  );
  ipcMain.handle("movimientos:ajuste", (_event, data: AjusteStockInput) =>
    createAjusteStock(data),
  );

  ipcMain.handle("movimientos:crear", (_event, data) =>
    crearMovimientoStock(data),
  );

  ipcMain.handle("reportes:summary", (_event, filtros?: FiltrosReportes) =>
    getReportesSummary(filtros),
  );
}

app.whenReady().then(() => {
  initDatabase();
  registerIpcHandlers();

  // Remueve el menú de aplicación global (también en desarrollo).
  Menu.setApplicationMenu(null);

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
