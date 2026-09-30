export type TipoVenta = 'unidad' | 'caja' | 'combo'
export type UnidadMedida = 'unidad' | 'ml' | 'g'
export type EstadoVenta = 'completada' | 'anulada'
export type EstadoCaja = 'abierta' | 'cerrada'
export type MetodoPago = 'efectivo' | 'transferencia' | 'debito' | 'credito' | 'cuenta_corriente'
export type TipoTarifa = 'minorista' | 'mayoreo'
export type TipoMovimientoStock = 'entrada' | 'venta' | 'ajuste_positivo' | 'ajuste_negativo' | 'merma' | 'devolucion'
export type TipoAjusteStock = 'ajuste_positivo' | 'ajuste_negativo' | 'merma'

export type Negocio = {
  id: number
  nombre: string | null
  logoPath: string | null
  actualizadoEn: string
}

export type NegocioInput = {
  nombre?: string | null
  logoPath?: string | null
  password?: string
}

export type NegocioLogoUpload = {
  /** Bytes de la imagen viajando por IPC (structured clone conserva ArrayBuffer). */
  data: ArrayBuffer
  /** Extensión original del archivo: png | jpg | jpeg | webp. */
  extension: string
}

/** Entrada del onboarding del negocio: nombre obligatorio + logo opcional. */
export type NegocioSetupInput = {
  nombre: string
  logo?: NegocioLogoUpload | null
}

export type Empleado = {
  id: number
  nombre: string
  activo: boolean
  creadoEn: string
}

export type NuevoEmpleado = {
  nombre: string
}

export type Categoria = {
  id: number
  nombre: string
  activo: boolean
}

export type NuevaCategoria = {
  nombre: string
}

export type Marca = {
  id: number
  nombre: string
  activo: boolean
}

export type NuevaMarca = {
  nombre: string
}

export type FiltrosProducto = {
  search?: string | null
  categoriaId?: number | null
  marcaId?: number | null
  bajoStock?: boolean
}

/** Código (interno o de barras) ya asociado a otro producto. */
export type ConflictoCodigo = {
  /** Código en conflicto, ya recortado y normalizado. */
  codigo: string
  /** Nombre del producto que lo tiene asociado. */
  producto: string
}

/** Producto enriquecido con el vencimiento del lote activo (FIFO) para el listado. */
export type ProductoConLoteActivo = Producto & {
  /** Vencimiento del lote activo: primer lote con stock ordenado por fecha de ingreso. */
  loteActivoVencimiento: string | null
}

export type Producto = {
  id: number
  categoriaId: number | null
  marcaId: number | null
  nombre: string
  codigoInterno: string | null
  codigosBarras: string | null
  variante: string | null
  tipoVenta: TipoVenta
  unidadMedida: UnidadMedida
  costo: number
  porcentajeGanancia: number
  precioVenta: number
  stockActual: number
  stockMinimo: number
  vencimiento: string | null
  imgPath: string | null
  activo: boolean
  creadoEn: string
  actualizadoEn: string | null
}

export type NuevoProducto = {
  categoriaId?: number | null
  marcaId?: number | null
  nombre: string
  codigoInterno?: string | null
  codigosBarras?: string | null
  variante?: string | null
  tipoVenta?: TipoVenta
  unidadMedida?: UnidadMedida
  costo?: number
  porcentajeGanancia?: number
  precioVenta?: number
  stockActual?: number
  stockMinimo?: number
  vencimiento?: string | null
  imgPath?: string | null
}

export type Lote = {
  id: number
  productoId: number
  numeroLote: string | null
  fechaIngreso: string
  fechaVence: string | null
  costoUnitario: number
  cantidadInicial: number
  cantidadActual: number
  creadoEn: string
}

export type NuevoLote = {
  productoId: number
  numeroLote?: string | null
  fechaIngreso: string
  fechaVence?: string | null
  costoUnitario?: number
  cantidadInicial: number
}

export type Caja = {
  id: number
  empleadoId: number
  montoInicial: number
  montoEsperado: number | null
  montoReal: number | null
  diferencia: number | null
  estado: EstadoCaja
  fechaApertura: string | null
  fechaCierre: string | null
  observaciones: string | null
}

/**
 * La caja se abre por NOMBRE y no por `empleadoId`: no hay login ni catálogo de
 * empleados al que elegir, así que el nombre escrito es la identidad.
 */
export type AperturaCajaInput = {
  responsable: string
  montoInicial?: number
  observaciones?: string | null
}

export type CierreCajaInput = {
  cajaId: number
  montoReal: number
  observaciones?: string | null
}

/**
 * El nombre del empleado viaja con la caja y no solo en el estado de pantalla: si
 * viviera ahí, al reabrir la app la caja seguiría abierta sin responsable que
 * mostrar.
 */
export type CajaConResponsable = Caja & {
  empleadoNombre: string
}

export type CajaSummary = {
  totalVentas: number
  cantidadVentas: number
  totalEfectivo: number
  totalTransferencia: number
  totalTarjeta: number
  /** Fondo inicial + efectivo cobrado. Mismo número con el que `closeCaja` calcula la diferencia. */
  montoEsperado: number
}

export type Venta = {
  id: number
  cajaId: number | null
  empleadoId: number
  subtotal: number
  descuento: number
  impuesto: number
  total: number
  estado: EstadoVenta
  fechaHora: string
}

export type DetalleVenta = {
  id: number
  ventaId: number
  productoId: number | null
  loteId: number | null
  tipoTarifa: TipoTarifa
  descripcionItem: string
  cantidad: number
  precioUnitario: number
  costoUnitario: number
  subtotal: number
}

export type Pago = {
  id: number
  ventaId: number
  metodo: MetodoPago
  monto: number
  referencia: string | null
  fechaHora: string
}

export type DetalleVentaInput = {
  productoId: number | null
  tipoTarifa: TipoTarifa
  descripcionItem: string
  cantidad: number
  precioUnitario: number
  costoUnitario: number
}

export type PagoInput = {
  metodo: MetodoPago
  monto: number
  referencia?: string | null
}

export type VentaCompletaInput = {
  cajaId: number | null
  empleadoId: number
  subtotal: number
  descuento: number
  impuesto: number
  total: number
  items: DetalleVentaInput[]
  pagos: PagoInput[]
}

export type VentaResult = {
  success: boolean
  ventaId: number
}

export type FiltrosVentas = {
  desde?: string
  hasta?: string
  cajaId?: number
  /** Tope de filas. Sin tope, `getVentas` devuelve el histórico completo. */
  limit?: number
}

/**
 * Producto ranked por unidades vendidas. `unidades` es la suma de `cantidad` de
 * todas sus líneas completadas, no la cantidad de ventas: un producto que se
 * vendió de a tres en tres pesa más que uno que salió dos veces de a una.
 */
export type MasVendido = {
  productoId: number
  unidades: number
}

/**
 * Ítem del historial: la foto y el precio del producto, con la descripción
 * congelada al momento de la venta.
 */
export type VentaHistorialItem = {
  id: number
  productoId: number | null
  descripcionItem: string
  cantidad: number
  precioUnitario: number
  subtotal: number
  /** Del producto ACTUAL, no del histórico: la foto se puede haber cambiado. */
  imgPath: string | null
}

/**
 * Venta con lo que el cajero necesita para reconocerla de un vistazo: qué se
 * llevó, cuántas unidades y cómo se pagó. Sin esto el historial obliga a abrir
 * cada venta una por una solo para descubrir qué contenía.
 */
export type VentaHistorial = Venta & {
  unidades: number
  /** Métodos usados, sin repetir. Una venta con pago mixto trae más de uno. */
  metodos: MetodoPago[]
  items: VentaHistorialItem[]
}

export type VentaDetalle = {
  venta: Venta
  items: DetalleVenta[]
  pagos: Pago[]
}

export type MovimientoStock = {
  id: number
  productoId: number | null
  loteId: number | null
  ventaId: number | null
  tipo: TipoMovimientoStock
  cantidad: number
  stockAnterior: number | null
  stockPosterior: number | null
  motivo: string | null
  fechaHora: string
}

export type NuevoMovimientoStock = {
  productoId: number
  loteId?: number | null
  ventaId?: number | null
  tipo: TipoMovimientoStock
  cantidad: number
  stockAnterior?: number | null
  stockPosterior?: number | null
  motivo?: string | null
}

export type AjusteStockInput = {
  productoId: number
  cantidad: number
  motivo: string
  tipo: TipoAjusteStock
}

export type CrearMovimientoInput = {
  productoId: number
  loteId?: number | null
  tipo: TipoMovimientoStock
  cantidad: number
  motivo?: string | null
  costoUnitario?: number
  numeroLote?: string | null
  fechaVencimiento?: string | null
}

export type FiltrosMovimientos = {
  productoId?: number
  limit?: number
}

export type ReportesSummary = {
  caja: {
    cajaId: number | null
    montoInicial: number
    montoEsperado: number
    montoReal: number | null
    diferencia: number | null
    ventas: number
  }
  totalVentas: number
  cantVentas: number
  ventasPorMetodo: { metodo: MetodoPago; monto: number }[]
  productosMasVendidos: { productoId: number | null; nombre: string; cantidad: number; monto: number }[]
}

export type FiltrosReportes = {
  desde?: string
  hasta?: string
}