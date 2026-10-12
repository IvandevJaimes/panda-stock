import { contextBridge, ipcRenderer } from "electron";
import type {
  AbonoInput,
  AjusteStockInput,
  AnularVentaInput,
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
  ClaveProteccion,
  ProteccionesSeguridad,
  ResultadoSeguro,
  ConfiguracionCopias,
  EstadoDestinoCopias,
  TipoDestinoCopias,
  ResultadoAnulacion,
  ResultadoDevolucion,
  ReportesSummary,
  Cliente,
  ClienteConSaldo,
  MovimientoCuentaCorriente,
  ResumenCuentasCorrientes,
  VentaDevolucionResumen,
  VentaDevolucionDetalle,
  DevolucionCompleta,
} from "./db/types.ts";
import type { ExportarExcelInput } from "./exportaciones.types.ts";
import type { EstadoLicencia, ResultadoLicencia } from "./licencia/tipos.ts";

import { webFrame } from "electron";

// Ajusta el zoom al 85% o 90% de inmediato
webFrame.setZoomFactor(0.85);

// Opcional: si quieres evitar que hagan zoom accidental con Ctrl + rueda / pinch
webFrame.setVisualZoomLevelLimits(1, 1);

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  licencia: {
    huella: (): Promise<string> => ipcRenderer.invoke("licencia:huella"),
    estado: (): Promise<ResultadoLicencia<EstadoLicencia>> => ipcRenderer.invoke("licencia:estado"),
    activar: (texto: string): Promise<ResultadoLicencia<EstadoLicencia>> =>
      ipcRenderer.invoke("licencia:activar", texto),
    completada: (): Promise<void> => ipcRenderer.invoke("licencia:completada"),
  },
  seguridad: {
    verifyPin: (pin: string, scope?: ClaveProteccion): Promise<ResultadoSeguro<boolean>> =>
      ipcRenderer.invoke("seguridad:verify-pin", pin, scope),
    changePin: (pinActual: string, pinNuevo: string) =>
      ipcRenderer.invoke("seguridad:change-pin", pinActual, pinNuevo),
    tieneContrasena: () => ipcRenderer.invoke("seguridad:tiene-contrasena"),
    getRecoveryId: () => ipcRenderer.invoke("seguridad:get-recovery-id"),
    resetearConClave: (codigo: string, pinNuevo: string) =>
      ipcRenderer.invoke("seguridad:resetear-con-clave", codigo, pinNuevo),
    crearContrasena: (pinNuevo: string) =>
      ipcRenderer.invoke("seguridad:crear-contrasena", pinNuevo),
    quitarContrasena: (pinActual: string) =>
      ipcRenderer.invoke("seguridad:quitar-contrasena", pinActual),
    getProtecciones: (seed: ProteccionesSeguridad): Promise<ResultadoSeguro<ProteccionesSeguridad>> =>
      ipcRenderer.invoke("seguridad:get-protecciones", seed),
    setProtecciones: (protecciones: ProteccionesSeguridad, pin?: string): Promise<ResultadoSeguro<ProteccionesSeguridad>> =>
      ipcRenderer.invoke("seguridad:set-protecciones", protecciones, pin),
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
    delete: (id: number, pin?: string): Promise<ResultadoSeguro<void>> => ipcRenderer.invoke("categorias:delete", id, pin),
  },
  marcas: {
    getAll: () => ipcRenderer.invoke("marcas:get-all"),
    create: (nombre: string) => ipcRenderer.invoke("marcas:create", nombre),
    update: (id: number, nombre: string) =>
      ipcRenderer.invoke("marcas:update", id, nombre),
    delete: (id: number, pin?: string): Promise<ResultadoSeguro<void>> => ipcRenderer.invoke("marcas:delete", id, pin),
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
    delete: (id: number, pin?: string): Promise<ResultadoSeguro<void>> => ipcRenderer.invoke("productos:delete", id, pin),
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
    delete: (id: number, pin?: string): Promise<ResultadoSeguro<void>> => ipcRenderer.invoke("lotes:delete", id, pin),
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
    anular: (input: AnularVentaInput): Promise<ResultadoSeguro<ResultadoAnulacion>> =>
      ipcRenderer.invoke("ventas:anular", input),
  },
  devoluciones: {
    getVentas: (filtros?: FiltrosDevoluciones): Promise<ResultadoSeguro<{ items: VentaDevolucionResumen[]; total: number }>> =>
      ipcRenderer.invoke("devoluciones:get-ventas", filtros),
    getVentaDetail: (ventaId: number): Promise<ResultadoSeguro<VentaDevolucionDetalle | null>> =>
      ipcRenderer.invoke("devoluciones:get-venta-detail", ventaId),
    getHistorial: (filtros?: FiltrosDevoluciones): Promise<ResultadoSeguro<{ items: DevolucionCompleta[]; total: number }>> =>
      ipcRenderer.invoke("devoluciones:get-historial", filtros),
    process: (input: ProcesarDevolucionInput): Promise<ResultadoSeguro<ResultadoDevolucion>> =>
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
    getSummary: (filtros?: FiltrosReportes): Promise<ResultadoSeguro<ReportesSummary>> =>
      ipcRenderer.invoke("reportes:summary", filtros),
    exportarExcel: (input: ExportarExcelInput): Promise<ResultadoSeguro<string | null>> =>
      ipcRenderer.invoke("reportes:exportar-excel", input),
  },
  cuentasCorrientes: {
    getClientes: (opciones?: { incluirInactivos?: boolean }): Promise<ResultadoSeguro<ClienteConSaldo[]>> =>
      ipcRenderer.invoke("cuentas-corrientes:clientes", opciones),
    crearCliente: (data: ClienteInput): Promise<ResultadoSeguro<Cliente>> =>
      ipcRenderer.invoke("cuentas-corrientes:cliente-crear", data),
    actualizarCliente: (id: number, data: ClienteInput): Promise<ResultadoSeguro<void>> =>
      ipcRenderer.invoke("cuentas-corrientes:cliente-actualizar", id, data),
    toggleCliente: (id: number, activo: boolean): Promise<ResultadoSeguro<Cliente>> =>
      ipcRenderer.invoke("cuentas-corrientes:cliente-toggle", id, activo),
    eliminarCliente: (id: number, pin?: string): Promise<ResultadoSeguro<void>> =>
      ipcRenderer.invoke("cuentas-corrientes:cliente-eliminar", id, pin),
    getMovimientos: (filtros?: FiltrosCuentaCorriente): Promise<ResultadoSeguro<MovimientoCuentaCorriente[]>> =>
      ipcRenderer.invoke("cuentas-corrientes:movimientos", filtros),
    getResumen: (): Promise<ResultadoSeguro<ResumenCuentasCorrientes>> => ipcRenderer.invoke("cuentas-corrientes:resumen"),
    registrarAbono: (data: AbonoInput): Promise<ResultadoSeguro<void>> =>
      ipcRenderer.invoke("cuentas-corrientes:abono", data),
    registrarCargo: (data: CargoManualInput): Promise<ResultadoSeguro<void>> =>
      ipcRenderer.invoke("cuentas-corrientes:cargo", data),
  },
  app: {
    /** El main avisa que intentó cerrarse la app con la caja abierta. */
    onPedirCierre: (callback: () => void) => {
      ipcRenderer.on("app:pedir-cierre-caja", () => callback());
    },
    interfazLista: () => ipcRenderer.send("app:interfaz-lista"),
    salir: () => ipcRenderer.invoke("app:salir"),
  },
  copias: {
    obtenerConfiguracion: (): Promise<ConfiguracionCopias> =>
      ipcRenderer.invoke("copias:get-configuracion"),
    verificarDestino: (tipoDestino: TipoDestinoCopias): Promise<EstadoDestinoCopias> =>
      ipcRenderer.invoke("copias:verificar-destino", tipoDestino),
    seleccionarCarpeta: (tipoDestino: TipoDestinoCopias): Promise<string | null> =>
      ipcRenderer.invoke("copias:seleccionar-carpeta", tipoDestino),
    guardarConfiguracion: (configuracion: ConfiguracionCopias): Promise<ConfiguracionCopias> =>
      ipcRenderer.invoke("copias:guardar-configuracion", configuracion),
    crear: (): Promise<string> => ipcRenderer.invoke("copias:crear"),
    seleccionarRestauracion: (tipoDestino: TipoDestinoCopias): Promise<string | null> =>
      ipcRenderer.invoke("copias:seleccionar-restauracion", tipoDestino),
    restaurar: (archivo: string, tipoDestino: TipoDestinoCopias): Promise<void> =>
      ipcRenderer.invoke("copias:restaurar", archivo, tipoDestino),
  },
  configuracion: {
    /** El wizard de primer inicio terminó; el main cierra la ventana y abre la app. */
    completada: () => ipcRenderer.invoke("configuracion:completada"),
  },
});
