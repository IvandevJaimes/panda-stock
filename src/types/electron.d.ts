import type {
  AjusteStockInput,
  AperturaCajaInput,
  Caja,
  CajaSummary,
  Categoria,
  CierreCajaInput,
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
  NuevoEmpleado,
  NuevoLote,
  Producto,
  ProductoConLoteActivo,
  ReportesSummary,
  Venta,
  VentaCompletaInput,
  VentaDetalle,
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
        scan: (codigo: string) => Promise<Producto | null>
        getAll: (filtros?: FiltrosProducto) => Promise<ProductoConLoteActivo[]>
        getById: (id: number) => Promise<Producto | null>
        create: (data: Record<string, unknown>) => Promise<Producto>
        update: (id: number, data: Record<string, unknown>) => Promise<Producto>
        delete: (id: number) => Promise<void>
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
        getActive: () => Promise<Caja | null>
        open: (data: AperturaCajaInput) => Promise<Caja>
        getSummary: (cajaId: number) => Promise<CajaSummary>
        close: (data: CierreCajaInput) => Promise<Caja>
      }
      ventas: {
        process: (venta: VentaCompletaInput) => Promise<VentaResult>
        getAll: (filtros?: FiltrosVentas) => Promise<Venta[]>
        getDetail: (idVenta: number) => Promise<VentaDetalle | null>
      }
      movimientos: {
        getAll: (filtros?: FiltrosMovimientos) => Promise<MovimientoStock[]>
        ajuste: (data: AjusteStockInput) => Promise<void>
      crear: (data: CrearMovimientoInput) => Promise<void>
      }
      reportes: {
        getSummary: (filtros?: FiltrosReportes) => Promise<ReportesSummary>
      }
    }
  }
}