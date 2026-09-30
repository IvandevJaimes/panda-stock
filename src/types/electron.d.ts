import type {
  AjusteStockInput,
  AperturaCajaInput,
  Caja,
  CajaConResponsable,
  CajaSummary,
  Categoria,
  CierreCajaInput,
  ConflictoCodigo,
  CrearMovimientoInput,
  Empleado,
  FiltrosMovimientos,
  FiltrosProducto,
  FiltrosReportes,
  FiltrosVentas,
  Lote,
  Marca,
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
  Venta,
  VentaCompletaInput,
  VentaDetalle,
  VentaHistorial,
  VentaResult,
} from '../../electron/db/types'

export {}

declare global {
  interface Window {
    electronAPI: {
      platform: string
      seguridad: {
        verifyPin: (pin: string) => Promise<boolean>
        changePin: (pinActual: string, pinNuevo: string) => Promise<boolean>
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
        delete: (id: number) => Promise<void>
      }
      marcas: {
        getAll: () => Promise<Marca[]>
        create: (nombre: string) => Promise<Marca>
        update: (id: number, nombre: string) => Promise<void>
        delete: (id: number) => Promise<void>
      }
      productos: {
        scan: (codigo: string) => Promise<ProductoConLoteActivo | null>
        verificarCodigos: (codigos: string[], excluirProductoId?: number | null) => Promise<ConflictoCodigo[]>
        getAll: (filtros?: FiltrosProducto) => Promise<ProductoConLoteActivo[]>
        getMasVendidos: (limite: number) => Promise<MasVendido[]>
        getById: (id: number) => Promise<Producto | null>
        create: (data: Record<string, unknown>) => Promise<Producto>
        update: (id: number, data: Record<string, unknown>) => Promise<Producto>
        delete: (id: number) => Promise<void>
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
        delete: (id: number) => Promise<void>
      }
      cajas: {
        getActive: () => Promise<CajaConResponsable | null>
        open: (data: AperturaCajaInput) => Promise<CajaConResponsable>
        getSummary: (cajaId: number) => Promise<CajaSummary>
        close: (data: CierreCajaInput) => Promise<Caja>
      }
      ventas: {
        process: (venta: VentaCompletaInput) => Promise<VentaResult>
        getAll: (filtros?: FiltrosVentas) => Promise<Venta[]>
        getDetail: (idVenta: number) => Promise<VentaDetalle | null>
        getRecientes: (limite: number) => Promise<VentaHistorial[]>
      }
      movimientos: {
        getAll: (filtros?: FiltrosMovimientos) => Promise<MovimientoStock[]>
        ajuste: (data: AjusteStockInput) => Promise<void>
      crear: (data: CrearMovimientoInput) => Promise<void>
      }
      reportes: {
        getSummary: (filtros?: FiltrosReportes) => Promise<ReportesSummary>
      }
      app: {
        /** Llega cuando se intentó cerrar la app con una caja abierta. */
        onPedirCierre: (callback: () => void) => void
        /** Confirma que la caja ya se cerró y deja salir. */
        salir: () => Promise<void>
      }
    }
  }
}