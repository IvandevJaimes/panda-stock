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
  createContrasena,
  removeContrasena,
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
  getUltimosResponsables,
  getUltimaCaja,
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
  getVentasDevolucion,
  getVentaDevolucionDetalle,
  getHistorialDevoluciones,
  getVentasRecientes,
  openCaja,
  processSale,
  anularVenta,
  processDevolucion,
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
  tieneContrasena,
  getRecoveryId,
  resetearContrasenaConClave,
  getProtecciones,
  setProtecciones,
  requiereProteccion,
  verificarCodigosEnUso,
  getClientes,
  createCliente,
  updateCliente,
  archivarCliente,
  getMovimientosCuentaCorriente,
  getResumenCuentasCorrientes,
  registrarAbono,
  registrarCargoManual,
} from "./db/repository.ts";
import {
  borrarDatosPrueba,
  generarDatosPrueba,
  hayDatosPrueba,
} from "./db/testdata.repository.ts";
import { exportarExcel } from "./exportaciones.ts";
import type { ExportarExcelInput } from "./exportaciones.types.ts";
import type {
  AjusteStockInput,
  AbonoInput,
  AnularVentaInput,
  AperturaCajaInput,
  CargoManualInput,
  ClienteInput,
  CierreCajaInput,
  FiltrosCuentaCorriente,
  FiltrosMovimientos,
  FiltrosProducto,
  FiltrosReportes,
  FiltrosVentas,
  FiltrosDevoluciones,
  ProcesarDevolucionInput,
  NegocioInput,
  NegocioSetupInput,
  NuevoEmpleado,
  NuevoLote,
  VentaCompletaInput,
  ClaveProteccion,
  ProteccionesSeguridad,
  ResultadoSeguro,
} from "./db/types.ts";
import { ErrorAutorizacion } from "./db/security.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev = !app.isPackaged;
const accesosVerificados = new Map<number, Set<ClaveProteccion>>();

function resultadoSeguro<T>(accion: () => T): ResultadoSeguro<T> {
  try {
    return { ok: true, value: accion() };
  } catch (error) {
    if (error instanceof ErrorAutorizacion) {
      return {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.retryAt === undefined ? {} : { retryAt: error.retryAt }),
        },
      };
    }
    throw error;
  }
}

function requerirAccesoVerificado(idWebContents: number, proteccion: ClaveProteccion): void {
  if (!requiereProteccion(proteccion)) return;
  if (accesosVerificados.get(idWebContents)?.has(proteccion)) return;
  throw new ErrorAutorizacion('AUTHORIZATION_REQUIRED', 'Ingresá la contraseña para acceder a esta sección');
}

function esSeedProtecciones(valor: unknown): valor is ProteccionesSeguridad {
  if (typeof valor !== 'object' || valor === null) return false;
  const claves: ClaveProteccion[] = [
    'reportes', 'cuentasCorrientes', 'anularVentas', 'eliminarProductos',
    'eliminarLotes', 'eliminarCategorias', 'eliminarMarcas',
  ];
  const registro = valor as Record<string, unknown>;
  return claves.every((clave) => typeof registro[clave] === 'boolean');
}

function esClaveProteccion(valor: unknown): valor is ClaveProteccion {
  return typeof valor === 'string' && [
    'reportes', 'cuentasCorrientes', 'anularVentas', 'eliminarProductos',
    'eliminarLotes', 'eliminarCategorias', 'eliminarMarcas',
  ].includes(valor)
}

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

// `configuracionCompletada` evita abrir la ventana principal dos veces cuando
// el wizard termina (maneja + `closed`).
let ventanaConfiguracion: BrowserWindow | null = null;
let configuracionCompletada = false;

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
      devTools: isDev,
    },
  });

  // Sin barra de menú nativa (solo menú de aplicación en macOS si aplica).
  win.setMenu(null);

  // Cerrar la ventana dispara `close`; el `before-quit` de más abajo cubre el
  // `app.quit()` que dispara `window-all-closed` en Linux y Windows. Hacen falta
  // los dos: `close` alcanza cuando el cajero aprieta la X, y `before-quit` cuando
  // el SO le pide salir a la app entera.
  win.on("close", (evento) => interceptarCierreSiHayCaja(evento, win));
  win.webContents.on("did-start-navigation", (_event, _url, _inPlace, isMainFrame) => {
    if (isMainFrame) accesosVerificados.delete(win.webContents.id);
  });
  win.webContents.on("destroyed", () => accesosVerificados.delete(win.webContents.id));

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

  if (isDev) {
    win.webContents.on("before-input-event", (event, input) => {
      if (input.type === "keyDown" && input.key === "F12") {
        event.preventDefault();
        win.webContents.toggleDevTools();
      }
    });
  }

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

/**
 * Ventana aparte del primer inicio: bienvenida + pasos de configuración.
 * No es un modal: es una ventana propia, más chica, que se reemplaza por la
 * ventana principal apenas el wizard confirma la configuración.
 */
function createSetupWindow() {
  if (ventanaConfiguracion && !ventanaConfiguracion.isDestroyed()) {
    ventanaConfiguracion.focus();
    return;
  }

  configuracionCompletada = false;

  const win = new BrowserWindow({
    width: 800,
    height: 680,
    minWidth: 560,
    minHeight: 560,
    resizable: true,
    autoHideMenuBar: true,
    title: "Panda Stock — Configuración inicial",
    webPreferences: {
      preload: path.join(__dirname, "../dist-electron/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: isDev,
    },
  });

  win.setMenu(null);

  win.on("closed", () => {
    ventanaConfiguracion = null;
    if (configuracionCompletada) return;
    if (negocioConfigurado()) createWindow();
    else app.quit();
  });

  win.webContents.on("console-message", (_evento, nivel, mensaje, linea, origen) => {
    escribirLog("renderer-setup", `[${nivel}] ${mensaje} (${origen}:${linea})`);
  });

  // El renderer detecta `?vista=configuracion` y monta la ventana de inicio
  // en lugar de la app completa (src/main.tsx).
  if (isDev) {
    win.loadURL("http://localhost:5173/?vista=configuracion");
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"), {
      query: { vista: "configuracion" },
    });
  }

  ventanaConfiguracion = win;
}

function negocioConfigurado(): boolean {
  const nombre = getNegocio()?.nombre;
  return typeof nombre === "string" && nombre.trim().length >= 2;
}

function registerIpcHandlers() {
  ipcMain.handle("seguridad:verify-pin", (event, pin: string, scope?: ClaveProteccion) =>
    resultadoSeguro(() => {
      if (scope !== undefined && !esClaveProteccion(scope)) {
        throw new Error("La sección protegida no es válida")
      }
      const validado = verifyPin(pin);
      if (!validado) throw new ErrorAutorizacion('INVALID_PIN', 'La contraseña es incorrecta');
      if (scope) {
        const scopes = accesosVerificados.get(event.sender.id) ?? new Set<ClaveProteccion>();
        scopes.add(scope);
        accesosVerificados.set(event.sender.id, scopes);
      }
      return true;
    }),
  );
  ipcMain.handle(
    "seguridad:change-pin",
    (_event, pinActual: string, pinNuevo: string) =>
      resultadoSeguro(() => {
        const cambio = changePin(pinActual, pinNuevo);
        if (cambio) accesosVerificados.clear();
        return cambio;
      }),
  );
  ipcMain.handle("seguridad:tiene-contrasena", () => tieneContrasena());
  ipcMain.handle("seguridad:get-recovery-id", () => getRecoveryId());
  ipcMain.handle("seguridad:resetear-con-clave", (_event, codigo: string, pinNuevo: string) =>
    resultadoSeguro(() => {
      const reseteada = resetearContrasenaConClave(codigo, pinNuevo);
      if (reseteada) accesosVerificados.clear();
      return reseteada;
    }),
  );
  ipcMain.handle("seguridad:crear-contrasena", (_event, pinNuevo: string) =>
    resultadoSeguro(() => {
      const creada = createContrasena(pinNuevo);
      if (creada) accesosVerificados.clear();
      return creada;
    }),
  );
  ipcMain.handle("seguridad:quitar-contrasena", (_event, pinActual: string) =>
    resultadoSeguro(() => {
      const quitada = removeContrasena(pinActual);
      if (quitada) accesosVerificados.clear();
      return quitada;
    }),
  );
  ipcMain.handle("seguridad:get-protecciones", (_event, seed: unknown) =>
    resultadoSeguro(() => {
      if (!esSeedProtecciones(seed)) throw new Error("La configuración de protecciones no es válida");
      return getProtecciones(seed);
    }),
  );
  ipcMain.handle("seguridad:set-protecciones", (_event, protecciones: ProteccionesSeguridad, pin?: string) =>
    resultadoSeguro(() => {
      if (!esSeedProtecciones(protecciones)) throw new Error("La configuración de protecciones no es válida");
      const guardadas = setProtecciones({ protecciones, pin });
      accesosVerificados.clear();
      return guardadas;
    }),
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
    } else if (data.logo === null) {
      logoPath = null;
    }

    return updateNegocio({ nombre, logoPath });
  });

  // El wizard de primer inicio terminó: se abre la ventana principal y se
  // cierra la de configuración.
  ipcMain.handle("configuracion:completada", () => {
    if (configuracionCompletada) return;
    configuracionCompletada = true;
    createWindow();
    if (ventanaConfiguracion && !ventanaConfiguracion.isDestroyed()) {
      ventanaConfiguracion.close();
    }
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
  ipcMain.handle("categorias:delete", (_event, id: number, pin?: string) =>
    resultadoSeguro(() => deleteCategoria(id, pin)),
  );

  ipcMain.handle("marcas:get-all", () => getMarcas());
  ipcMain.handle("marcas:create", (_event, nombre: string) =>
    createMarca(nombre),
  );
  ipcMain.handle("marcas:update", (_event, id: number, nombre: string) =>
    updateMarca(id, nombre),
  );
  ipcMain.handle("marcas:delete", (_event, id: number, pin?: string) =>
    resultadoSeguro(() => deleteMarca(id, pin)),
  );

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
  ipcMain.handle("productos:delete", (_event, id: number, pin?: string) =>
    resultadoSeguro(() => deleteProducto(id, pin)),
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
  ipcMain.handle("lotes:delete", (_event, id: number, pin?: string) =>
    resultadoSeguro(() => deleteLote(id, pin)),
  );

  ipcMain.handle("cajas:get-active", () => getActiveCaja());
  ipcMain.handle("cajas:get-ultimos-responsables", () => getUltimosResponsables());
  ipcMain.handle("cajas:get-ultima", () => getUltimaCaja());
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
  ipcMain.handle("ventas:anular", (_event, input: AnularVentaInput) =>
    resultadoSeguro(() => anularVenta(input)),
  );

  ipcMain.handle("devoluciones:get-ventas", (event, filtros?: FiltrosDevoluciones) =>
    resultadoSeguro(() => {
      requerirAccesoVerificado(event.sender.id, 'reportes');
      return getVentasDevolucion(filtros);
    }),
  );
  ipcMain.handle("devoluciones:get-venta-detail", (event, ventaId: number) =>
    resultadoSeguro(() => {
      requerirAccesoVerificado(event.sender.id, 'reportes');
      return getVentaDevolucionDetalle(ventaId);
    }),
  );
  ipcMain.handle("devoluciones:get-historial", (event, filtros?: FiltrosDevoluciones) =>
    resultadoSeguro(() => {
      requerirAccesoVerificado(event.sender.id, 'reportes');
      return getHistorialDevoluciones(filtros);
    }),
  );
  ipcMain.handle("devoluciones:process", (_event, input: ProcesarDevolucionInput) =>
    resultadoSeguro(() => processDevolucion(input)),
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

  ipcMain.handle("reportes:summary", (event, filtros?: FiltrosReportes) =>
    resultadoSeguro(() => {
      requerirAccesoVerificado(event.sender.id, 'reportes');
      return getReportesSummary(filtros);
    }),
  );

  ipcMain.handle("reportes:exportar-excel", (event, input: ExportarExcelInput) =>
    resultadoSeguro(() => {
      requerirAccesoVerificado(event.sender.id, 'reportes');
      return exportarExcel(input);
    }),
  );

  ipcMain.handle("cuentas-corrientes:clientes", (event, opciones?: { incluirInactivos?: boolean }) =>
    resultadoSeguro(() => {
      requerirAccesoVerificado(event.sender.id, 'cuentasCorrientes');
      return getClientes(opciones);
    }),
  );
  ipcMain.handle("cuentas-corrientes:cliente-crear", (event, data: ClienteInput) =>
    resultadoSeguro(() => {
      requerirAccesoVerificado(event.sender.id, 'cuentasCorrientes');
      return createCliente(data);
    }),
  );
  ipcMain.handle("cuentas-corrientes:cliente-actualizar", (event, id: number, data: ClienteInput) =>
    resultadoSeguro(() => {
      requerirAccesoVerificado(event.sender.id, 'cuentasCorrientes');
      return updateCliente(id, data);
    }),
  );
  ipcMain.handle("cuentas-corrientes:cliente-archivar", (event, id: number) =>
    resultadoSeguro(() => {
      requerirAccesoVerificado(event.sender.id, 'cuentasCorrientes');
      return archivarCliente(id);
    }),
  );
  ipcMain.handle("cuentas-corrientes:movimientos", (event, filtros?: FiltrosCuentaCorriente) =>
    resultadoSeguro(() => {
      requerirAccesoVerificado(event.sender.id, 'cuentasCorrientes');
      return getMovimientosCuentaCorriente(filtros);
    }),
  );
  ipcMain.handle("cuentas-corrientes:resumen", (event) =>
    resultadoSeguro(() => {
      requerirAccesoVerificado(event.sender.id, 'cuentasCorrientes');
      return getResumenCuentasCorrientes();
    }),
  );
  ipcMain.handle("cuentas-corrientes:abono", (event, data: AbonoInput) =>
    resultadoSeguro(() => {
      requerirAccesoVerificado(event.sender.id, 'cuentasCorrientes');
      return registrarAbono(data);
    }),
  );
  ipcMain.handle("cuentas-corrientes:cargo", (event, data: CargoManualInput) =>
    resultadoSeguro(() => {
      requerirAccesoVerificado(event.sender.id, 'cuentasCorrientes');
      return registrarCargoManual(data);
    }),
  );

  ipcMain.handle("datosPrueba:hay", () => hayDatosPrueba());

  ipcMain.handle("datosPrueba:generar", () => generarDatosPrueba());

  ipcMain.handle("datosPrueba:borrar", () => borrarDatosPrueba());

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

  if (negocioConfigurado()) {
    createWindow();
  } else {
    createSetupWindow();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (negocioConfigurado()) {
        createWindow();
      } else {
        createSetupWindow();
      }
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
