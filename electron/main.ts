import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  protocol,
} from "electron";
import type { OpenDialogOptions } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { appendFileSync } from "node:fs";
import { getDbPath, initDatabase } from "./db/index.ts";
import {
  crearCopiaSeguridad,
  guardarConfiguracionCopias,
  obtenerConfiguracionCopias,
  restaurarCopiaSeguridad,
  validarCarpetaDestino,
  validarCopiaParaRestaurar,
  verificarDestinoCopias,
} from "./db/copias-seguridad.ts";
import type { ConfiguracionCopias, TipoDestinoCopias } from "./db/types.ts";
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
  getVentasRecientes,
  openCaja,
  processSale,
  anularVenta,
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
  configuracionInicialMostrada,
  marcarConfiguracionInicialMostrada,
  getRecoveryId,
  resetearContrasenaConClave,
  getProtecciones,
  setProtecciones,
  requiereProteccion,
  verificarCodigosEnUso,
  getClientes,
  createCliente,
  updateCliente,
  toggleCliente,
  eliminarCliente,
  getMovimientosCuentaCorriente,
  getResumenCuentasCorrientes,
  registrarAbono,
  registrarCargoManual,
} from "./db/repository.ts";
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
import {
  existeLicencia,
  guardarLicencia,
  leerLicencia,
  leerVersionLicencia,
  prepararDirectorioLicencia,
} from "./licencia/almacen.ts";
import { obtenerDatosHuella } from "./licencia/huella.ts";
import { validarLicencia } from "./licencia/verificador.ts";
import {
  esLicenciaFirmada,
  esRegistroDesconocido,
  type ErrorLicenciaCode,
  type EstadoLicencia,
  type ResultadoLicencia,
} from "./licencia/tipos.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRELOAD_PATH = path.join(__dirname, "preload.cjs");
declare const __PANDA_STOCK_LICENCIA_DEFAULT__: "on" | "off";

const isDev = !app.isPackaged;
const DURACION_MINIMA_SPLASH_MS = 1_000;
let ventanaPrincipal: BrowserWindow | null = null;
let ventanaCarga: BrowserWindow | null = null;
let ventanaConfiguracion: BrowserWindow | null = null;
let ventanaLicencia: BrowserWindow | null = null;
let inicioSplashMs = 0;
const ventanasPendientesDeRevelar = new WeakSet<BrowserWindow>();
let configuracionCompletada = false;
let copiaAutomaticaEnCurso = false;
let omitirCopiaAutomatica = false;

const tieneInstanciaUnica = app.requestSingleInstanceLock();
if (!tieneInstanciaUnica) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const ventana =
      (ventanaPrincipal?.isVisible() ? ventanaPrincipal : null) ??
      (ventanaConfiguracion?.isVisible() ? ventanaConfiguracion : null) ??
      ventanaLicencia ??
      ventanaCarga ??
      ventanaPrincipal ??
      ventanaConfiguracion;
    if (!ventana || ventana.isDestroyed()) return;
    if (ventana.isMinimized()) ventana.restore();
    ventana.show();
    ventana.focus();
  });
}

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

class ErrorLicenciaOperacion extends Error {
  readonly code: ErrorLicenciaCode

  constructor(code: ErrorLicenciaCode, message: string) {
    super(message)
    this.name = "ErrorLicenciaOperacion"
    this.code = code
  }
}

function resultadoLicencia<T>(accion: () => T): ResultadoLicencia<T> {
  try {
    return { ok: true, value: accion() };
  } catch (error) {
    if (error instanceof ErrorLicenciaOperacion) {
      return { ok: false, error: { code: error.code, message: error.message } };
    }
    return {
      ok: false,
      error: {
        code: "ALMACENAMIENTO",
        message: "No se pudo leer o guardar la licencia en este equipo.",
      },
    };
  }
}

const MENSAJES_LICENCIA: Record<ErrorLicenciaCode, string> = {
  FIRMA_INVALIDA: "La firma de la licencia no es válida.",
  EQUIPO_NO_COINCIDE: "La licencia fue emitida para otro equipo.",
  VERSION_NO_SOPORTADA: "Esta licencia usa una versión que Panda Stock no reconoce.",
  ESTRUCTURA_INVALIDA: "El contenido de la licencia no tiene un formato válido.",
  ALMACENAMIENTO: "No se pudo leer o guardar la licencia en este equipo.",
};

function licenciaActivada(): boolean {
  const override = process.env.PANDA_STOCK_LICENCIA;
  if (override === "on") return true;
  const ejecucionDevSinLicencia = isDev &&
    process.env.npm_lifecycle_event === "dev" &&
    typeof __PANDA_STOCK_LICENCIA_DEFAULT__ !== "undefined" &&
    __PANDA_STOCK_LICENCIA_DEFAULT__ === "off";
  return !ejecucionDevSinLicencia;
}

function directorioLicencia(): string {
  const directorio = path.join(app.getPath("userData"), "licencia");
  prepararDirectorioLicencia(directorio);
  return directorio;
}

function urlInterfazDesarrollo(vista?: string): string {
  const url = new URL(process.env.VITE_DEV_SERVER_URL || "http://localhost:5173");
  if (vista) url.searchParams.set("vista", vista);
  return url.toString();
}

function crearEstadoInvalido(
  huella: string,
  motivo: ErrorLicenciaCode,
  advertencia?: string,
): EstadoLicencia {
  return {
    estado: "invalida",
    motivo,
    huella,
    ...(advertencia ? { advertencia } : {}),
  };
}

function obtenerEstadoLicencia(): EstadoLicencia {
  const carpeta = directorioLicencia();
  const identidad = obtenerDatosHuella(carpeta);
  if (!existeLicencia(carpeta)) {
    return {
      estado: "ausente",
      huella: identidad.huella,
      ...(identidad.advertencia ? { advertencia: identidad.advertencia } : {}),
    };
  }

  const licencia = leerLicencia(carpeta);
  if (!licencia) {
    const version = leerVersionLicencia(carpeta);
    const motivo: ErrorLicenciaCode = version !== null && version !== 1
      ? "VERSION_NO_SOPORTADA"
      : "ESTRUCTURA_INVALIDA";
    return crearEstadoInvalido(identidad.huella, motivo, identidad.advertencia);
  }

  const resultado = validarLicencia(licencia, identidad.huella);
  if (!resultado.valida) {
    return crearEstadoInvalido(identidad.huella, resultado.motivo, identidad.advertencia);
  }

  return {
    estado: "valida",
    huella: identidad.huella,
    licenciado: licencia.licenciado,
    licenciaId: licencia.licenseId,
    emitidaEn: licencia.emitidaEn,
    venceEn: null,
    ...(identidad.advertencia ? { advertencia: identidad.advertencia } : {}),
  };
}

function activarLicencia(texto: string): EstadoLicencia {
  if (typeof texto !== "string" || texto.length > 20_000) {
    throw new ErrorLicenciaOperacion("ESTRUCTURA_INVALIDA", MENSAJES_LICENCIA.ESTRUCTURA_INVALIDA);
  }

  let documento: unknown;
  try {
    documento = JSON.parse(texto);
  } catch {
    throw new ErrorLicenciaOperacion("ESTRUCTURA_INVALIDA", MENSAJES_LICENCIA.ESTRUCTURA_INVALIDA);
  }
  if (esRegistroDesconocido(documento) && typeof documento.v === "number" && documento.v !== 1) {
    throw new ErrorLicenciaOperacion("VERSION_NO_SOPORTADA", MENSAJES_LICENCIA.VERSION_NO_SOPORTADA);
  }
  if (!esLicenciaFirmada(documento)) {
    throw new ErrorLicenciaOperacion("ESTRUCTURA_INVALIDA", MENSAJES_LICENCIA.ESTRUCTURA_INVALIDA);
  }

  const carpeta = directorioLicencia();
  const identidad = obtenerDatosHuella(carpeta);
  const validacion = validarLicencia(documento, identidad.huella);
  if (!validacion.valida) {
    throw new ErrorLicenciaOperacion(validacion.motivo, MENSAJES_LICENCIA[validacion.motivo]);
  }

  try {
    guardarLicencia(validacion.licencia, carpeta);
  } catch {
    throw new ErrorLicenciaOperacion("ALMACENAMIENTO", MENSAJES_LICENCIA.ALMACENAMIENTO);
  }
  return obtenerEstadoLicencia();
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
    'eliminarLotes', 'eliminarCategorias', 'eliminarMarcas', 'eliminarClientes',
  ];
  const registro = valor as Record<string, unknown>;
  return claves.every((clave) => typeof registro[clave] === 'boolean');
}

function esClaveProteccion(valor: unknown): valor is ClaveProteccion {
  return typeof valor === 'string' && [
    'reportes', 'cuentasCorrientes', 'anularVentas', 'eliminarProductos',
    'eliminarLotes', 'eliminarCategorias', 'eliminarMarcas', 'eliminarClientes',
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

/**
 * Interrumpe el cierre y le pide al renderer que muestre el aviso. Si no queda
 * ninguna ventana no hay a quién avisar y, mucho peor, nadie para resolverlo: en
 * ese caso se deja salir, que es preferible a una app que no cierra nunca.
 */
function interceptarCierreSiHayCaja(
  evento: Electron.Event,
  ventana: BrowserWindow | null,
) : boolean {
  if (salidaPermitida) return false;

  if (!ventana || ventana.isDestroyed()) return false;
  if (BrowserWindow.getAllWindows().length === 0) return false;
  try {
    if (!getActiveCaja()) return false;
  } catch (error) {
    escribirLog(
      "cierre",
      `No se pudo consultar la caja activa durante el cierre: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }

  evento.preventDefault();
  ventana.webContents.send("app:pedir-cierre-caja");
  return true;
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

function registrarErrorPreload(ventana: BrowserWindow, nombre: string): void {
  ventana.webContents.on("preload-error", (_evento, rutaPreload, error) => {
    const detalle = error.stack?.split("\n")[0] ?? error.message;
    escribirLog("preload-error", `${nombre}: ${rutaPreload}: ${detalle}`);
  });
}

// Registro el esquema custom panda-asset:// antes del arranque de la app para poder
// servir los assets locales (logo del negocio, imágenes de productos) al renderer.
if (tieneInstanciaUnica) {
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
}

function createWindow() {
  let reintentoCarga = false;
  let intentosCarga = 0;
  const urlDesarrollo = urlInterfazDesarrollo();
  const archivoInterfaz = path.join(__dirname, "../dist/index.html");
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 480,
    minHeight: 700,
    resizable: true,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: isDev,
    },
  });

  registrarErrorPreload(win, "principal");

  // Sin barra de menú nativa (solo menú de aplicación en macOS si aplica).
  win.setMenu(null);
  ventanaPrincipal = win;
  const idWebContents = win.webContents.id;

  win.on("closed", () => {
    if (ventanaPrincipal === win) ventanaPrincipal = null;
  });

  // Cerrar la ventana dispara `close`; el `before-quit` de más abajo cubre el
  // `app.quit()` que dispara `window-all-closed` en Linux y Windows. Hacen falta
  // los dos: `close` alcanza cuando el cajero aprieta la X, y `before-quit` cuando
  // el SO le pide salir a la app entera.
  win.on("close", (evento) => interceptarCierreSiHayCaja(evento, win));
  win.webContents.on("did-start-navigation", (_event, _url, _inPlace, isMainFrame) => {
    if (isMainFrame) accesosVerificados.delete(idWebContents);
  });
  win.webContents.on("destroyed", () => accesosVerificados.delete(idWebContents));

  // Volcado de errores del renderer a userData/panda-stock.log para diagnosticar
  // desde la VM sin DevTools.
  win.webContents.on("console-message", (_evento, nivel, mensaje, linea, origen) => {
    escribirLog("renderer", `[${nivel}] ${mensaje} (${origen}:${linea})`);
  });
  win.webContents.on("did-fail-load", (_evento, codigo, descripcion, url, esMarcoPrincipal) => {
    escribirLog("load", `${codigo} ${descripcion} ${url}`);
    if (!esMarcoPrincipal || codigo === -3) return;
    if (intentosCarga >= 15) {
      escribirLog("load", `Se agotaron los reintentos para cargar ${url}`);
      dialog.showErrorBox(
        "No se pudo cargar Panda Stock",
        "La interfaz no pudo iniciarse. Cerrá la aplicación y volvé a abrirla.",
      );
      app.exit(1);
      return;
    }

    intentosCarga += 1;
    const espera = Math.min(intentosCarga * 500, 3000);
    setTimeout(() => {
      if (win.isDestroyed()) return;
      const carga = isDev
        ? win.loadURL(urlDesarrollo)
        : win.loadFile(archivoInterfaz);
      void carga.catch((error: unknown) => {
        escribirLog("load", error instanceof Error ? error.message : String(error));
      });
    }, espera);
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

  const carga = isDev ? win.loadURL(urlDesarrollo) : win.loadFile(archivoInterfaz);
  void carga.catch((error: unknown) => {
    escribirLog("load", error instanceof Error ? error.message : String(error));
  });
}

function createSplashWindow() {
  if (ventanaCarga && !ventanaCarga.isDestroyed()) {
    ventanaCarga.focus();
    return;
  }

  const win = new BrowserWindow({
    width: 360,
    height: 300,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    center: true,
    show: true,
    transparent: true,
    hasShadow: false,
    backgroundColor: "#0b0f17",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: false,
    },
  });

  ventanaCarga = win;
  inicioSplashMs = Date.now();
  win.on("closed", () => {
    if (ventanaCarga === win) {
      ventanaCarga = null;
      inicioSplashMs = 0;
    }
  });

  if (isDev) {
    void win.loadURL(urlInterfazDesarrollo("carga")).catch((error: unknown) => {
      escribirLog("load-splash", error instanceof Error ? error.message : String(error));
    });
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"), {
      query: { vista: "carga" },
    });
  }
}

function revelarVentana(win: BrowserWindow) {
  if (win.isDestroyed()) return;

  if (ventanaCarga && !ventanaCarga.isDestroyed() && inicioSplashMs > 0) {
    const esperaRestante = DURACION_MINIMA_SPLASH_MS - (Date.now() - inicioSplashMs);
    if (esperaRestante > 0) {
      if (ventanasPendientesDeRevelar.has(win)) return;
      ventanasPendientesDeRevelar.add(win);
      setTimeout(() => {
        ventanasPendientesDeRevelar.delete(win);
        revelarVentana(win);
      }, esperaRestante);
      return;
    }
  }

  win.show();
  win.focus();

  if (ventanaCarga && !ventanaCarga.isDestroyed()) {
    const splash = ventanaCarga;
    ventanaCarga = null;
    splash.close();
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

  marcarConfiguracionInicialMostrada();
  configuracionCompletada = false;

  const win = new BrowserWindow({
    width: 800,
    height: 680,
    minWidth: 560,
    minHeight: 560,
    resizable: true,
    show: false,
    autoHideMenuBar: true,
    title: "Panda Stock — Configuración inicial",
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: isDev,
    },
  });

  registrarErrorPreload(win, "configuración inicial");

  win.setMenu(null);
  win.once("ready-to-show", () => revelarVentana(win));
  win.webContents.once("did-finish-load", () => revelarVentana(win));

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
    void win.loadURL(urlInterfazDesarrollo("configuracion")).catch((error: unknown) => {
      escribirLog("load-setup", error instanceof Error ? error.message : String(error));
    });
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"), {
      query: { vista: "configuracion" },
    });
  }

  ventanaConfiguracion = win;
}

function createLicenseWindow() {
  if (ventanaLicencia && !ventanaLicencia.isDestroyed()) {
    ventanaLicencia.focus();
    return;
  }

  const win = new BrowserWindow({
    width: 760,
    height: 720,
    minWidth: 560,
    minHeight: 620,
    resizable: true,
    show: false,
    autoHideMenuBar: true,
    title: "Panda Stock — Activación",
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: isDev,
    },
  });

  registrarErrorPreload(win, "activación");

  win.setMenu(null);
  ventanaLicencia = win;
  win.once("ready-to-show", () => revelarVentana(win));
  win.webContents.once("did-finish-load", () => revelarVentana(win));
  let intentosCarga = 0;
  win.on("closed", () => {
    if (ventanaLicencia === win) ventanaLicencia = null;
  });
  win.webContents.on("console-message", (_evento, nivel, mensaje, linea, origen) => {
    escribirLog("renderer-licencia", `[${nivel}] ${mensaje} (${origen}:${linea})`);
  });
  win.webContents.on("did-fail-load", (_evento, codigo, descripcion, url, esMarcoPrincipal) => {
    escribirLog("load-licencia", `${codigo} ${descripcion} ${url}`);
    if (!esMarcoPrincipal || codigo === -3) return;
    if (intentosCarga >= 3) {
      revelarVentana(win);
      dialog.showErrorBox(
        "No se pudo cargar la activación",
        "No se pudo abrir la pantalla de licencia. Cerrá la aplicación y volvé a iniciar el modo de desarrollo.",
      );
      app.exit(1);
      return;
    }

    intentosCarga += 1;
    setTimeout(() => {
      if (win.isDestroyed()) return;
      void (isDev
        ? win.loadURL(urlInterfazDesarrollo("licencia"))
        : win.loadFile(path.join(__dirname, "../dist/index.html"), { query: { vista: "licencia" } })
      ).catch((error: unknown) => {
        escribirLog("load-licencia", error instanceof Error ? error.message : String(error));
      });
    }, intentosCarga * 500);
  });

  if (isDev) {
    void win.loadURL(urlInterfazDesarrollo("licencia")).catch((error: unknown) => {
      escribirLog("load-licencia", error instanceof Error ? error.message : String(error));
    });
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"), {
      query: { vista: "licencia" },
    });
  }
}

function negocioConfigurado(): boolean {
  const nombre = getNegocio()?.nombre;
  return typeof nombre === "string" && nombre.trim().length >= 2;
}

function debeMostrarConfiguracionInicial(): boolean {
  return !negocioConfigurado() || (!tieneContrasena() && !configuracionInicialMostrada());
}

function abrirVentanaDeInicio(): void {
  if (debeMostrarConfiguracionInicial()) createSetupWindow();
  else createWindow();
}

function abrirVentanaPermitida(): void {
  try {
    if (licenciaActivada() && obtenerEstadoLicencia().estado !== "valida") {
      createLicenseWindow();
      return;
    }
    abrirVentanaDeInicio();
  } catch {
    escribirLog("licencia", "No se pudo comprobar el estado de la licencia durante el inicio.");
    dialog.showErrorBox(
      "No se pudo iniciar Panda Stock",
      "No se pudo comprobar la licencia de este equipo. Revisá los permisos de la carpeta de datos y volvé a abrir la aplicación.",
    );
    app.exit(1);
  }
}

function registerIpcHandlers() {
  ipcMain.on("app:interfaz-lista", (event) => {
    if (!ventanaPrincipal || ventanaPrincipal.isDestroyed()) return;
    if (event.sender.id !== ventanaPrincipal.webContents.id) return;
    revelarVentana(ventanaPrincipal);
  });

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

  ipcMain.handle("licencia:huella", () => obtenerDatosHuella(directorioLicencia()).huella);
  ipcMain.handle("licencia:estado", () => resultadoLicencia(() => obtenerEstadoLicencia()));
  ipcMain.handle("licencia:activar", (_event, texto: string) =>
    resultadoLicencia(() => activarLicencia(texto)),
  );
  ipcMain.handle("licencia:completada", (event) => {
    if (!ventanaLicencia || ventanaLicencia.isDestroyed() || event.sender.id !== ventanaLicencia.webContents.id) {
      throw new Error("La ventana de activación ya no está disponible.");
    }
    if (licenciaActivada() && obtenerEstadoLicencia().estado !== "valida") {
      throw new Error("Activá una licencia válida antes de continuar.");
    }
    abrirVentanaDeInicio();
    const ventanaAnterior = ventanaLicencia;
    ventanaLicencia = null;
    ventanaAnterior.close();
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
  ipcMain.handle("cuentas-corrientes:cliente-toggle", (event, id: number, activo: boolean) =>
    resultadoSeguro(() => {
      requerirAccesoVerificado(event.sender.id, 'cuentasCorrientes');
      return toggleCliente(id, activo);
    }),
  );
  ipcMain.handle("cuentas-corrientes:cliente-eliminar", (event, id: number, pin?: string) =>
    resultadoSeguro(() => {
      requerirAccesoVerificado(event.sender.id, 'cuentasCorrientes');
      return eliminarCliente(id, pin);
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

  ipcMain.handle("copias:get-configuracion", () => obtenerConfiguracionCopias());
  ipcMain.handle("copias:verificar-destino", (_event, tipoDestino: TipoDestinoCopias) => {
    if (tipoDestino !== "pc" && tipoDestino !== "extraible") {
      throw new Error("El destino de las copias no es válido.");
    }
    return verificarDestinoCopias(tipoDestino);
  });
  ipcMain.handle("copias:seleccionar-carpeta", async (_event, tipoDestino: TipoDestinoCopias) => {
    if (tipoDestino !== "pc" && tipoDestino !== "extraible") {
      throw new Error("El destino de las copias no es válido.");
    }
    const ventana = ventanaPrincipal ?? ventanaConfiguracion ?? undefined;
    const opciones: OpenDialogOptions = {
      title: tipoDestino === "extraible" ? "Elegir carpeta de unidad extraíble" : "Elegir carpeta de esta PC",
      properties: ["openDirectory"],
    };
    const { canceled, filePaths } = ventana
      ? await dialog.showOpenDialog(ventana, opciones)
      : await dialog.showOpenDialog(opciones);
    if (canceled || !filePaths[0]) return null;
    return validarCarpetaDestino(filePaths[0], tipoDestino);
  });
  ipcMain.handle("copias:guardar-configuracion", (_event, configuracion: ConfiguracionCopias) => {
    if (
      typeof configuracion?.automatica !== "boolean" ||
      (configuracion.carpeta !== null && typeof configuracion.carpeta !== "string") ||
      typeof configuracion.carpetas !== "object" || configuracion.carpetas === null ||
      (configuracion.carpetas.pc !== null && typeof configuracion.carpetas.pc !== "string") ||
      (configuracion.carpetas.extraible !== null && typeof configuracion.carpetas.extraible !== "string") ||
      (configuracion.tipoDestino !== "pc" && configuracion.tipoDestino !== "extraible")
    ) {
      throw new Error("La configuración de copias no es válida.");
    }
    return guardarConfiguracionCopias(configuracion);
  });
  ipcMain.handle("copias:crear", () => crearCopiaSeguridad());
  ipcMain.handle("copias:seleccionar-restauracion", async (_event, tipoDestino: TipoDestinoCopias) => {
    if (tipoDestino !== "pc" && tipoDestino !== "extraible") {
      throw new Error("El destino de las copias no es válido.");
    }
    const configuracion = obtenerConfiguracionCopias();
    if (tipoDestino === "extraible") {
      if (!configuracion.carpeta) throw new Error("Elegí una carpeta de la unidad extraíble antes de restaurar.");
      validarCarpetaDestino(configuracion.carpeta, "extraible", false);
    }
    const ventana = ventanaPrincipal ?? ventanaConfiguracion ?? undefined;
    const opciones: OpenDialogOptions = {
      title: "Seleccionar copia de seguridad",
      properties: ["openFile"],
      filters: [{ name: "Base de datos de Panda Stock", extensions: ["db"] }],
      ...(configuracion.carpeta && configuracion.tipoDestino === tipoDestino
        ? { defaultPath: configuracion.carpeta }
        : {}),
    };
    const { canceled, filePaths } = ventana
      ? await dialog.showOpenDialog(ventana, opciones)
      : await dialog.showOpenDialog(opciones);
    if (canceled || !filePaths[0]) return null;
    validarCopiaParaRestaurar(filePaths[0]);
    return filePaths[0];
  });
  ipcMain.handle("copias:restaurar", async (_event, archivo: string, tipoDestino: TipoDestinoCopias) => {
    if (typeof archivo !== "string" || !path.isAbsolute(archivo)) {
      throw new Error("La ruta de la copia seleccionada no es válida.");
    }
    if (tipoDestino !== "pc" && tipoDestino !== "extraible") {
      throw new Error("El destino de las copias no es válido.");
    }
    if (tipoDestino === "extraible") {
      const configuracion = obtenerConfiguracionCopias();
      if (!configuracion.carpeta) throw new Error("Elegí una carpeta de la unidad extraíble antes de restaurar.");
      validarCarpetaDestino(configuracion.carpeta, "extraible", false);
    }
    if (getActiveCaja()) {
      throw new Error("Cerrá la caja antes de restaurar una copia de seguridad.");
    }
    await restaurarCopiaSeguridad(archivo);
    omitirCopiaAutomatica = true;
    salidaPermitida = true;
    app.relaunch();
    // El renderer puede cancelar `app.quit()` durante `beforeunload` y dejar
    // bloqueado el proceso que mantiene el lock de instancia única.
    app.exit(0);
  });

  // El renderer confirma que ya no hay caja abierta y pide salir. `app.quit()`
  // vuelve a pasar por `before-quit`, así que el flag tiene que estar puesto antes.
  ipcMain.handle("app:salir", () => {
    salidaPermitida = true;
    app.quit();
  });
}

if (tieneInstanciaUnica) {
  app.whenReady().then(() => {
    createSplashWindow();

    try {
      initDatabase();
    } catch (error) {
      const detalle = error instanceof Error ? error.stack ?? error.message : String(error);
      escribirLog("inicio", `Base: ${getDbPath()}\n${detalle}`);
      dialog.showErrorBox(
        "No se pudo iniciar Panda Stock",
        `No se pudieron cargar los datos.\n\nArchivo de datos: ${getDbPath()}\n\nDetalle: ${error instanceof Error ? error.message : String(error)}\n\nRegistro de diagnóstico: panda-stock.log en la carpeta de datos de la app.`,
      );
      app.exit(1);
      return;
    }

    ensureAssetsFolders();
    registerPandaAssetProtocol();
    registerIpcHandlers();

    // Remueve el menú de aplicación global (también en desarrollo).
    Menu.setApplicationMenu(null);

    abrirVentanaPermitida();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        abrirVentanaPermitida();
      }
    });
  });

  app.on("before-quit", (evento) => {
    const enfocada = BrowserWindow.getFocusedWindow();
    const ventana =
      (enfocada !== ventanaCarga ? enfocada : null) ??
      ventanaPrincipal ??
      ventanaConfiguracion ??
      null;
    const cierreInterceptado = interceptarCierreSiHayCaja(evento, ventana);
    if (copiaAutomaticaEnCurso) {
      evento.preventDefault();
      return;
    }
    if (cierreInterceptado || omitirCopiaAutomatica) return;

    let configuracion: ConfiguracionCopias;
    try {
      configuracion = obtenerConfiguracionCopias();
    } catch {
      return;
    }
    if (!configuracion.automatica || !configuracion.carpeta) return;

    evento.preventDefault();
    copiaAutomaticaEnCurso = true;
    void crearCopiaSeguridad(configuracion)
      .catch((error: unknown) => {
        escribirLog(
          "copia-automatica",
          error instanceof Error ? error.message : String(error),
        );
      })
      .finally(() => {
        copiaAutomaticaEnCurso = false;
        omitirCopiaAutomatica = true;
        app.quit();
      });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
