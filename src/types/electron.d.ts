import type {
  AbonoInput,
  AjusteStockInput,
  AnularVentaInput,
  AperturaCajaInput,
  Caja,
  CajaConResponsable,
  CajaSummary,
  CargoManualInput,
  Categoria,
  CierreCajaInput,
  Cliente,
  ClienteConSaldo,
  ClienteInput,
  ConflictoCodigo,
  CrearMovimientoInput,
  Empleado,
  FiltrosCuentaCorriente,
  FiltrosDevoluciones,
  FiltrosMovimientos,
  FiltrosProducto,
  FiltrosReportes,
  FiltrosVentas,
  Lote,
  Marca,
  MovimientoCuentaCorriente,
  MovimientoStock,
  Negocio,
  NegocioInput,
  NegocioSetupInput,
  NuevoEmpleado,
  NuevoLote,
  Producto,
  ProductoConLoteActivo,
  MasVendido,
  ReportesSummary,
  ResumenCuentasCorrientes,
  Venta,
  VentaCompletaInput,
  VentaDetalle,
  VentaHistorial,
  VentaResult,
  ProcesarDevolucionInput,
  ResultadoAnulacion,
  ResultadoDevolucion,
  VentaDevolucionDetalle,
  VentaDevolucionResumen,
  DevolucionCompleta,
  ClaveProteccion,
  ProteccionesSeguridad,
  ResultadoSeguro,
} from '../../electron/db/types'
import type { ExportarExcelInput } from '../../electron/exportaciones.types'
import type { ResultadoDatosPrueba } from '../../electron/db/testdata.repository'
import type { ConfiguracionCopias, EstadoDestinoCopias, TipoDestinoCopias } from '../../electron/db/types'
import type { EstadoLicencia, ResultadoLicencia } from '../../electron/licencia/tipos'

export {}

declare global {
  interface Window {
    electronAPI: {
      platform: string
      licencia: {
        huella: () => Promise<string>
        estado: () => Promise<ResultadoLicencia<EstadoLicencia>>
        activar: (texto: string) => Promise<ResultadoLicencia<EstadoLicencia>>
        completada: () => Promise<void>
      }
      seguridad: {
        verifyPin: (pin: string, scope?: ClaveProteccion) => Promise<ResultadoSeguro<boolean>>
        changePin: (pinActual: string, pinNuevo: string) => Promise<ResultadoSeguro<boolean>>
        tieneContrasena: () => Promise<boolean>
        getRecoveryId: () => Promise<string>
        resetearConClave: (codigo: string, pinNuevo: string) => Promise<ResultadoSeguro<boolean>>
        crearContrasena: (pinNuevo: string) => Promise<ResultadoSeguro<boolean>>
        quitarContrasena: (pinActual: string) => Promise<ResultadoSeguro<boolean>>
        getProtecciones: (seed: ProteccionesSeguridad) => Promise<ResultadoSeguro<ProteccionesSeguridad>>
        setProtecciones: (protecciones: ProteccionesSeguridad, pin?: string) => Promise<ResultadoSeguro<ProteccionesSeguridad>>
      }
      negocio: {
        get: () => Promise<Negocio | null>
        update: (data: NegocioInput) => Promise<Negocio>
        setup: (data: NegocioSetupInput) => Promise<Negocio>
      }
      empleados: {
        getAll: () => Promise<Empleado[]>
        create: (data: NuevoEmpleado) => Promise<Empleado>
        toggle: (id: number, activo: boolean) => Promise<void>
      }
      categorias: {
        getAll: () => Promise<Categoria[]>
        create: (nombre: string) => Promise<Categoria>
        update: (id: number, nombre: string) => Promise<void>
        delete: (id: number, pin?: string) => Promise<ResultadoSeguro<void>>
      }
      marcas: {
        getAll: () => Promise<Marca[]>
        create: (nombre: string) => Promise<Marca>
        update: (id: number, nombre: string) => Promise<void>
        delete: (id: number, pin?: string) => Promise<ResultadoSeguro<void>>
      }
      productos: {
        scan: (codigo: string) => Promise<ProductoConLoteActivo | null>
        verificarCodigos: (codigos: string[], excluirProductoId?: number | null) => Promise<ConflictoCodigo[]>
        getAll: (filtros?: FiltrosProducto) => Promise<ProductoConLoteActivo[]>
        getMasVendidos: (limite: number) => Promise<MasVendido[]>
        getById: (id: number) => Promise<Producto | null>
        create: (data: Record<string, unknown>) => Promise<Producto>
        update: (id: number, data: Record<string, unknown>) => Promise<Producto>
        delete: (id: number, pin?: string) => Promise<ResultadoSeguro<void>>
        toggle: (id: number, activo: boolean) => Promise<Producto>
        setImage: (productoId: number, data: ArrayBuffer, extension: string) => Promise<Producto>
        removeImage: (productoId: number) => Promise<Producto>
        getAlerts: () => Promise<Producto[]>
      }
      lotes: {
        getByProducto: (productoId: number) => Promise<Lote[]>
        create: (data: NuevoLote) => Promise<Lote>
        getExpiring: (diasLimite: number) => Promise<Lote[]>
        update: (id: number, data: { fechaVence?: string | null; costoUnitario?: number; cantidadActual?: number; motivo?: string }) => Promise<Lote>
        delete: (id: number, pin?: string) => Promise<ResultadoSeguro<void>>
      }
      cajas: {
        getActive: () => Promise<CajaConResponsable | null>
        getUltimosResponsables: () => Promise<string[]>
        getUltima: () => Promise<(CajaConResponsable & { montoInicial: number }) | null>
        open: (data: AperturaCajaInput) => Promise<CajaConResponsable>
        getSummary: (cajaId: number) => Promise<CajaSummary>
        close: (data: CierreCajaInput) => Promise<Caja>
      }
      ventas: {
        process: (venta: VentaCompletaInput) => Promise<VentaResult>
        getAll: (filtros?: FiltrosVentas) => Promise<Venta[]>
        getDetail: (idVenta: number) => Promise<VentaDetalle | null>
        getRecientes: (limite: number) => Promise<VentaHistorial[]>
        anular: (input: AnularVentaInput) => Promise<ResultadoSeguro<ResultadoAnulacion>>
      }
      devoluciones: {
        getVentas: (filtros?: FiltrosDevoluciones) => Promise<ResultadoSeguro<{ items: VentaDevolucionResumen[]; total: number }>>
        getVentaDetail: (ventaId: number) => Promise<ResultadoSeguro<VentaDevolucionDetalle | null>>
        getHistorial: (filtros?: FiltrosDevoluciones) => Promise<ResultadoSeguro<{ items: DevolucionCompleta[]; total: number }>>
        process: (input: ProcesarDevolucionInput) => Promise<ResultadoSeguro<ResultadoDevolucion>>
      }
      movimientos: {
        getAll: (filtros?: FiltrosMovimientos) => Promise<MovimientoStock[]>
        ajuste: (data: AjusteStockInput) => Promise<void>
      crear: (data: CrearMovimientoInput) => Promise<void>
      }
      reportes: {
        getSummary: (filtros?: FiltrosReportes) => Promise<ResultadoSeguro<ReportesSummary>>
        exportarExcel: (
          input: ExportarExcelInput,
        ) => Promise<ResultadoSeguro<string | null>>
      }
      cuentasCorrientes: {
        getClientes: (opciones?: {
          incluirInactivos?: boolean
        }) => Promise<ResultadoSeguro<ClienteConSaldo[]>>
        crearCliente: (data: ClienteInput) => Promise<ResultadoSeguro<Cliente>>
        actualizarCliente: (id: number, data: ClienteInput) => Promise<ResultadoSeguro<void>>
        toggleCliente: (id: number, activo: boolean) => Promise<ResultadoSeguro<Cliente>>
        eliminarCliente: (id: number, pin?: string) => Promise<ResultadoSeguro<void>>
        getResumen: () => Promise<ResultadoSeguro<ResumenCuentasCorrientes>>
        getMovimientos: (
          filtros?: FiltrosCuentaCorriente,
        ) => Promise<ResultadoSeguro<MovimientoCuentaCorriente[]>>
        registrarAbono: (data: AbonoInput) => Promise<ResultadoSeguro<void>>
        registrarCargo: (data: CargoManualInput) => Promise<ResultadoSeguro<void>>
      }
      datosPrueba: {
        hay: () => Promise<boolean>
        generar: () => Promise<ResultadoDatosPrueba>
        borrar: () => Promise<ResultadoDatosPrueba>
      }
      app: {
        /** Llega cuando se intentó cerrar la app con una caja abierta. */
        onPedirCierre: (callback: () => void) => void
        interfazLista: () => void
        /** Confirma que la caja ya se cerró y deja salir. */
        salir: () => Promise<void>
      }
      copias: {
        obtenerConfiguracion: () => Promise<ConfiguracionCopias>
        verificarDestino: (tipoDestino: TipoDestinoCopias) => Promise<EstadoDestinoCopias>
        seleccionarCarpeta: (tipoDestino: TipoDestinoCopias) => Promise<string | null>
        guardarConfiguracion: (configuracion: ConfiguracionCopias) => Promise<ConfiguracionCopias>
        crear: () => Promise<string>
        seleccionarRestauracion: (tipoDestino: TipoDestinoCopias) => Promise<string | null>
        restaurar: (archivo: string, tipoDestino: TipoDestinoCopias) => Promise<void>
      }
      configuracion: {
        /** El wizard de primer inicio terminó; cierra la ventana y abre la app. */
        completada: () => Promise<void>
      }
    }
  }
}
