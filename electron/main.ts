import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  protocol,
} from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { appendFileSync } from "node:fs";
import { initDatabase } from "./db/index.ts";
import {
  ensureAssetsFolders,
  registerPandaAssetProtocol,
  saveLogoFile,
  saveProductImage,
  deleteAssetFile,
} from "./assets.ts";
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
  getMasVendidos,
  getNegocio,
  getReportesSummary,
  getVentaDetalle,
  getVentas,
  getVentasRecientes,
  openCaja,
  processSale,
  scanProductByCode,
  toggleEmpleado,
  toggleProducto,
  updateCategoria,
  updateMarca,
  updateProducto,
  updateLote,
  deleteLote,
  updateNegocio,
  verifyPin,
  verificarCodigosEnUso,
} from "./db/repository.ts";
import type {
  AjusteStockInput,
  AperturaCajaInput,
  CierreCajaInput,
  FiltrosMovimientos,
  FiltrosProducto,
  FiltrosReportes,
  FiltrosVentas,
  NegocioInput,
  NegocioSetupInput,
  NuevoEmpleado,
  NuevoLote,
  VentaCompletaInput,
} from "./db/types.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev = !app.isPackaged;

/**
 * La app no sale con la caja abierta. El arqueo es lo único que deja constancia
 * de cuánto efectivo había y cuánto quedó, así que dejarlo abierto al cerrar es
 * perder el cierre de ese turno para siempre: la fila queda `abierta`, sin
 * responsable de conteo y sin diferencia, y la próxima sesión abre una caja
 * nueva sin que nadie sepa que esta quedó sin cerrar.
 *
 * El flag existe para el segundo intento: cuando el renderer ya cerró la caja y
 * pide salir, `getActiveCaja()` puede seguir devolviendo la fila por un tick de
 * lectura, y sin este flag el cierre volvería a interceptarse a sí mismo.
 */
let salidaPermitida = false;

/**
 * Interrumpe el cierre y le pide al renderer que muestre el aviso. Si no queda
 * ninguna ventana no hay a quién avisar y, mucho peor, nadie para resolverlo: en
 * ese caso se deja salir, que es preferible a una app que no cierra nunca.
 */
function interceptarCierreSiHayCaja(
  evento: Electron.Event,
  ventana: BrowserWindow | null,
) {
  if (salidaPermitida) return;

  if (!ventana || ventana.isDestroyed()) return;
  if (BrowserWindow.getAllWindows().length === 0) return;
  if (!getActiveCaja()) return;

  evento.preventDefault();
  ventana.webContents.send("app:pedir-cierre-caja");
}

// Log de diagnóstico tipo "mejor esfuerzo" en userData. Nunca rompe el main.
function escribirLog(tag: string, mensaje: string): void {
  try {
    appendFileSync(
      path.join(app.getPath("userData"), "panda-stock.log"),
      `[${new Date().toISOString()}] [${tag}] ${mensaje}\n`,
    );
  } catch {
    // ignorado
  }
}

// Registro el esquema custom panda-asset:// antes del arranque de la app para poder
// servir los assets locales (logo del negocio, imágenes de productos) al renderer.
protocol.registerSchemesAsPrivileged([
  {
    scheme: "panda-asset",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
    },
  },
]);

function createWindow() {
  let reintentoCarga = false;
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

  // Cerrar la ventana dispara `close`; el `before-quit` de más abajo cubre el
  // `app.quit()` que dispara `window-all-closed` en Linux y Windows. Hacen falta
  // los dos: `close` alcanza cuando el cajero aprieta la X, y `before-quit` cuando
  // el SO le pide salir a la app entera.
  win.on("close", (evento) => interceptarCierreSiHayCaja(evento, win));

  // Volcado de errores del renderer a userData/panda-stock.log para diagnosticar
  // desde la VM sin DevTools.
  win.webContents.on("console-message", (_evento, nivel, mensaje, linea, origen) => {
    escribirLog("renderer", `[${nivel}] ${mensaje} (${origen}:${linea})`);
  });
  win.webContents.on("did-fail-load", (_evento, codigo, descripcion, url) => {
    escribirLog("load", `${codigo} ${descripcion} ${url}`);
  });
  win.webContents.on("render-process-gone", (_evento, detalles) => {
    escribirLog("gone", JSON.stringify(detalles));
    if (detalles.reason === "crashed" || detalles.reason === "oom") {
      if (!reintentoCarga) {
        reintentoCarga = true;
        setTimeout(() => {
          escribirLog("gone", "recargando ventana tras crash del renderer");
          win.reload();
        }, 1000);
      }
    }
  });

  // DevTools solo en desarrollo, alternadas con F12.
  win.webContents.on("before-input-event", (_event, input) => {
    if (input.type === "keyDown" && input.key === "F12") {
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

  ipcMain.handle("negocio:get", () => getNegocio());
  ipcMain.handle("negocio:update", (_event, data: NegocioInput) =>
    updateNegocio(data),
  );
  ipcMain.handle("negocio:setup", (_event, data: NegocioSetupInput) => {
    const nombre = (data.nombre ?? "").trim();
    if (nombre.length < 2) {
      throw new Error("El nombre del negocio debe tener al menos 2 caracteres");
    }

    let logoPath: string | null | undefined;
    if (data.logo) {
      logoPath = saveLogoFile(data.logo.data, data.logo.extension);
    }

    return updateNegocio({ nombre, logoPath });
  });

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
  ipcMain.handle(
    "productos:verificar-codigos",
    (_event, codigos: string[], excluirProductoId?: number | null) =>
      verificarCodigosEnUso(codigos, excluirProductoId),
  );
  ipcMain.handle("productos:get-all", (_event, filtros?: FiltrosProducto) =>
    getProductos(filtros),
  );
  ipcMain.handle("productos:mas-vendidos", (_event, limite: number) =>
    getMasVendidos(limite),
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
  ipcMain.handle("productos:toggle", (_event, id: number, activo: boolean) =>
    toggleProducto(id, activo),
  );
  ipcMain.handle(
    "productos:set-image",
    (_event, productoId: number, data: ArrayBuffer, extension: string) => {
      const imgPath = saveProductImage(data, extension, productoId);
      return updateProducto(productoId, { imgPath });
    },
  );
  ipcMain.handle("productos:remove-image", (_event, productoId: number) => {
    const producto = getProductoById(productoId);
    if (producto?.imgPath) deleteAssetFile(producto.imgPath);
    return updateProducto(productoId, { imgPath: null });
  });
  ipcMain.handle("productos:get-alerts", () => getAlertasStock());

  ipcMain.handle("lotes:get-by-producto", (_event, productoId: number) =>
    getLotesByProducto(productoId),
  );
  ipcMain.handle("lotes:create", (_event, data: NuevoLote) => createLote(data));
  ipcMain.handle("lotes:get-expiring", (_event, diasLimite: number) =>
    getLotesPorVencer(diasLimite),
  );
  ipcMain.handle("lotes:update", (_event, id: number, data: { fechaVence?: string | null; costoUnitario?: number; cantidadActual?: number; motivo?: string }) =>
    updateLote(id, data),
  );
  ipcMain.handle("lotes:delete", (_event, id: number) => deleteLote(id));

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
  ipcMain.handle("ventas:get-recientes", (_event, limite: number) =>
    getVentasRecientes(limite),
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

  // El renderer confirma que ya no hay caja abierta y pide salir. `app.quit()`
  // vuelve a pasar por `before-quit`, así que el flag tiene que estar puesto antes.
  ipcMain.handle("app:salir", () => {
    salidaPermitida = true;
    app.quit();
  });
}

app.whenReady().then(() => {
  initDatabase();
  ensureAssetsFolders();
  registerPandaAssetProtocol();
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

app.on("before-quit", (evento) => {
  interceptarCierreSiHayCaja(evento, BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
