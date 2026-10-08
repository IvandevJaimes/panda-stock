import { contextBridge, ipcRenderer } from "electron";
import type {
  AbonoInput,
  AjusteStockInput,
  AperturaCajaInput,
  CargoManualInput,
  CierreCajaInput,
  ClienteInput,
  CrearMovimientoInput,
  FiltrosCuentaCorriente,
  FiltrosMovimientos,
  FiltrosProducto,
  FiltrosReportes,
  FiltrosVentas,
  FiltrosDevoluciones,
  NuevoEmpleado,
  NuevoLote,
  NegocioInput,
  NegocioSetupInput,
  VentaCompletaInput,
  ProcesarDevolucionInput,
} from "./db/types.ts";
import type { ExportarExcelInput } from "./exportaciones.types.ts";

import { webFrame } from "electron";

// Ajusta el zoom al 85% o 90% de inmediato
webFrame.setZoomFactor(0.85);

// Opcional: si quieres evitar que hagan zoom accidental con Ctrl + rueda / pinch
webFrame.setVisualZoomLevelLimits(1, 1);

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  seguridad: {
    verifyPin: (pin: string) => ipcRenderer.invoke("seguridad:verify-pin", pin),
    changePin: (pinActual: string, pinNuevo: string) =>
      ipcRenderer.invoke("seguridad:change-pin", pinActual, pinNuevo),
    tieneContrasena: () => ipcRenderer.invoke("seguridad:tiene-contrasena"),
    crearContrasena: (pinNuevo: string) =>
      ipcRenderer.invoke("seguridad:crear-contrasena", pinNuevo),
  },
  negocio: {
    get: () => ipcRenderer.invoke("negocio:get"),
    update: (data: NegocioInput) => ipcRenderer.invoke("negocio:update", data),
    setup: (data: NegocioSetupInput) =>
      ipcRenderer.invoke("negocio:setup", data),
  },
  empleados: {
    getAll: () => ipcRenderer.invoke("empleados:get-all"),
    create: (data: NuevoEmpleado) =>
      ipcRenderer.invoke("empleados:create", data),
    toggle: (id: number, activo: boolean) =>
      ipcRenderer.invoke("empleados:toggle", id, activo),
  },
  categorias: {
    getAll: () => ipcRenderer.invoke("categorias:get-all"),
    create: (nombre: string) => ipcRenderer.invoke("categorias:create", nombre),
    update: (id: number, nombre: string) =>
      ipcRenderer.invoke("categorias:update", id, nombre),
    delete: (id: number) => ipcRenderer.invoke("categorias:delete", id),
  },
  marcas: {
    getAll: () => ipcRenderer.invoke("marcas:get-all"),
    create: (nombre: string) => ipcRenderer.invoke("marcas:create", nombre),
    update: (id: number, nombre: string) =>
      ipcRenderer.invoke("marcas:update", id, nombre),
    delete: (id: number) => ipcRenderer.invoke("marcas:delete", id),
  },
  productos: {
    scan: (codigo: string) => ipcRenderer.invoke("productos:scan", codigo),
    verificarCodigos: (codigos: string[], excluirProductoId?: number | null) =>
      ipcRenderer.invoke("productos:verificar-codigos", codigos, excluirProductoId),
    getAll: (filtros?: FiltrosProducto) =>
      ipcRenderer.invoke("productos:get-all", filtros),
    getMasVendidos: (limite: number) =>
      ipcRenderer.invoke("productos:mas-vendidos", limite),
    getById: (id: number) => ipcRenderer.invoke("productos:get-by-id", id),
    create: (data: Record<string, unknown>) =>
      ipcRenderer.invoke("productos:create", data),
    update: (id: number, data: Record<string, unknown>) =>
      ipcRenderer.invoke("productos:update", id, data),
    delete: (id: number) => ipcRenderer.invoke("productos:delete", id),
    toggle: (id: number, activo: boolean) =>
      ipcRenderer.invoke("productos:toggle", id, activo),
    setImage: (productoId: number, data: ArrayBuffer, extension: string) =>
      ipcRenderer.invoke("productos:set-image", productoId, data, extension),
    removeImage: (productoId: number) =>
      ipcRenderer.invoke("productos:remove-image", productoId),
    getAlerts: () => ipcRenderer.invoke("productos:get-alerts"),
  },
  lotes: {
    getByProducto: (productoId: number) =>
      ipcRenderer.invoke("lotes:get-by-producto", productoId),
    create: (data: NuevoLote) => ipcRenderer.invoke("lotes:create", data),
    getExpiring: (diasLimite: number) =>
      ipcRenderer.invoke("lotes:get-expiring", diasLimite),
    update: (id: number, data: { fechaVence?: string | null; costoUnitario?: number; cantidadActual?: number; motivo?: string }) =>
      ipcRenderer.invoke("lotes:update", id, data),
    delete: (id: number) => ipcRenderer.invoke("lotes:delete", id),
  },
  cajas: {
    getActive: () => ipcRenderer.invoke("cajas:get-active"),
    getUltimosResponsables: () => ipcRenderer.invoke("cajas:get-ultimos-responsables"),
    getUltima: () => ipcRenderer.invoke("cajas:get-ultima"),
    open: (data: AperturaCajaInput) => ipcRenderer.invoke("cajas:open", data),
    getSummary: (cajaId: number) => ipcRenderer.invoke("cajas:get-summary", cajaId),
    close: (data: CierreCajaInput) => ipcRenderer.invoke("cajas:close", data),
  },
  ventas: {
    process: (venta: VentaCompletaInput) =>
      ipcRenderer.invoke("ventas:process", venta),
    getAll: (filtros?: FiltrosVentas) =>
      ipcRenderer.invoke("ventas:get-all", filtros),
    getDetail: (idVenta: number) =>
      ipcRenderer.invoke("ventas:get-detail", idVenta),
    getRecientes: (limite: number) =>
      ipcRenderer.invoke("ventas:get-recientes", limite),
  },
  devoluciones: {
    getVentas: (filtros?: FiltrosDevoluciones) =>
      ipcRenderer.invoke("devoluciones:get-ventas", filtros),
    getVentaDetail: (ventaId: number) =>
      ipcRenderer.invoke("devoluciones:get-venta-detail", ventaId),
    getHistorial: (filtros?: FiltrosDevoluciones) =>
      ipcRenderer.invoke("devoluciones:get-historial", filtros),
    process: (input: ProcesarDevolucionInput) =>
      ipcRenderer.invoke("devoluciones:process", input),
  },
  movimientos: {
    getAll: (filtros?: FiltrosMovimientos) =>
      ipcRenderer.invoke("movimientos:get-all", filtros),
    ajuste: (data: AjusteStockInput) =>
      ipcRenderer.invoke("movimientos:ajuste", data),
    crear: (data: CrearMovimientoInput) =>
      ipcRenderer.invoke("movimientos:crear", data),
  },
  reportes: {
    getSummary: (filtros?: FiltrosReportes) =>
      ipcRenderer.invoke("reportes:summary", filtros),
    exportarExcel: (input: ExportarExcelInput) =>
      ipcRenderer.invoke("reportes:exportar-excel", input),
  },
  cuentasCorrientes: {
    getClientes: (opciones?: { incluirInactivos?: boolean }) =>
      ipcRenderer.invoke("cuentas-corrientes:clientes", opciones),
    crearCliente: (data: ClienteInput) =>
      ipcRenderer.invoke("cuentas-corrientes:cliente-crear", data),
    actualizarCliente: (id: number, data: ClienteInput) =>
      ipcRenderer.invoke("cuentas-corrientes:cliente-actualizar", id, data),
    archivarCliente: (id: number) =>
      ipcRenderer.invoke("cuentas-corrientes:cliente-archivar", id),
    getMovimientos: (filtros?: FiltrosCuentaCorriente) =>
      ipcRenderer.invoke("cuentas-corrientes:movimientos", filtros),
    getResumen: () => ipcRenderer.invoke("cuentas-corrientes:resumen"),
    registrarAbono: (data: AbonoInput) =>
      ipcRenderer.invoke("cuentas-corrientes:abono", data),
    registrarCargo: (data: CargoManualInput) =>
      ipcRenderer.invoke("cuentas-corrientes:cargo", data),
  },
  datosPrueba: {
    hay: () => ipcRenderer.invoke("datosPrueba:hay"),
    generar: () => ipcRenderer.invoke("datosPrueba:generar"),
    borrar: () => ipcRenderer.invoke("datosPrueba:borrar"),
  },
  app: {
    /** El main avisa que intentó cerrarse la app con la caja abierta. */
    onPedirCierre: (callback: () => void) => {
      ipcRenderer.on("app:pedir-cierre-caja", () => callback());
    },
    salir: () => ipcRenderer.invoke("app:salir"),
  },
});
