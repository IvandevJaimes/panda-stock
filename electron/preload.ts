import { contextBridge, ipcRenderer } from "electron";
import type {
  AjusteStockInput,
  AperturaCajaInput,
  CierreCajaInput,
  CrearMovimientoInput,
  FiltrosMovimientos,
  FiltrosProducto,
  FiltrosReportes,
  FiltrosVentas,
  NuevoEmpleado,
  NuevoLote,
  NegocioInput,
  NegocioSetupInput,
  VentaCompletaInput,
} from "./db/types.ts";

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
    getAll: (filtros?: FiltrosProducto) =>
      ipcRenderer.invoke("productos:get-all", filtros),
    getById: (id: number) => ipcRenderer.invoke("productos:get-by-id", id),
    create: (data: Record<string, unknown>) =>
      ipcRenderer.invoke("productos:create", data),
    update: (id: number, data: Record<string, unknown>) =>
      ipcRenderer.invoke("productos:update", id, data),
    delete: (id: number) => ipcRenderer.invoke("productos:delete", id),
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
    open: (data: AperturaCajaInput) => ipcRenderer.invoke("cajas:open", data),
    getSummary: (cajaId: number) =>
      ipcRenderer.invoke("cajas:get-summary", cajaId),
    close: (data: CierreCajaInput) => ipcRenderer.invoke("cajas:close", data),
  },
  ventas: {
    process: (venta: VentaCompletaInput) =>
      ipcRenderer.invoke("ventas:process", venta),
    getAll: (filtros?: FiltrosVentas) =>
      ipcRenderer.invoke("ventas:get-all", filtros),
    getDetail: (idVenta: number) =>
      ipcRenderer.invoke("ventas:get-detail", idVenta),
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
  },
});
