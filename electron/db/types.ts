export type TipoVenta = 'unidad' | 'caja' | 'combo'
export type UnidadMedida = 'unidad' | 'ml' | 'g'
export type EstadoVenta = 'pendiente' | 'completada' | 'anulada'
export type EstadoCaja = 'abierta' | 'cerrada'
export type ClaveProteccion =
  | 'reportes'
  | 'cuentasCorrientes'
  | 'anularVentas'
  | 'eliminarProductos'
  | 'eliminarLotes'
  | 'eliminarCategorias'
  | 'eliminarMarcas'
  | 'eliminarClientes'
export type ProteccionesSeguridad = Record<ClaveProteccion, boolean>
export const CLAVES_PROTECCION: readonly ClaveProteccion[] = [
  'reportes',
  'cuentasCorrientes',
  'anularVentas',
  'eliminarProductos',
  'eliminarLotes',
  'eliminarCategorias',
  'eliminarMarcas',
  'eliminarClientes',
]
export const PROTECCIONES_INICIALES: ProteccionesSeguridad = {
  reportes: false,
  cuentasCorrientes: false,
  anularVentas: false,
  eliminarProductos: false,
  eliminarLotes: false,
  eliminarCategorias: false,
  eliminarMarcas: false,
  eliminarClientes: false,
}
export type ErrorSeguridadCode = 'AUTHORIZATION_REQUIRED' | 'INVALID_PIN' | 'PIN_LOCKED'
export type ResultadoSeguro<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: ErrorSeguridadCode; message: string; retryAt?: number } }
export type TipoDestinoCopias = 'extraible' | 'pc'

export interface ConfiguracionCopias {
  carpeta: string | null
  carpetas: Record<TipoDestinoCopias, string | null>
  automatica: boolean
  tipoDestino: TipoDestinoCopias
}

export interface EstadoDestinoCopias {
  disponible: boolean
  mensaje: string | null
}
export type MetodoPago =
  | 'efectivo'
  | 'transferencia'
  | 'qr'
  | 'debito'
  | 'credito'
  | 'cuenta_corriente'
export type TipoMovimientoCuentaCorriente = 'cargo' | 'abono' | 'devolucion' | 'reintegro'
export type TipoTarifa = 'minorista' | 'mayoreo'
export type TipoMovimientoStock = 'entrada' | 'venta' | 'ajuste_positivo' | 'ajuste_negativo' | 'merma' | 'devolucion'
export type TipoAjusteStock = 'ajuste_positivo' | 'ajuste_negativo' | 'merma'

export type Negocio = {
  id: number
  nombre: string | null
  logoPath: string | null
  creadoEn: string | null
  actualizadoEn: string
}

export type NegocioInput = {
  nombre?: string | null
  logoPath?: string | null
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
  totalEgresosEfectivo: number
  totalTransferencia: number
  totalQr?: number
  totalTarjeta: number
  /** Ventas del turno cobradas en cuenta corriente. No son plata en la gaveta. */
  totalCuentaCorriente: number
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
  motivoAnulacion?: string | null
  anuladoEn?: string | null
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
  /**
   * Cliente asociado. Solo se usa si algún pago viene como `cuenta_corriente`:
   * sin cliente, ese pago es un cobro sin destinatario y `processSale` lo
   * rechaza.
   */
  clienteId?: number | null
}

export type VentaResult = {
  success: boolean
  ventaId: number
}

export type AnularVentaInput = {
  ventaId: number
  motivo: string
  pin?: string
}

export type ResultadoAnulacion = {
  ventaId: number
  total: number
  unidadesRestituidas: number
  motivo: string
  montoReintegrado: number
  deudaCancelada: number
  reintegros: Array<{ metodo: Exclude<MetodoPago, 'cuenta_corriente'>; monto: number }>
}

export type FiltrosVentas = {
  desde?: string
  hasta?: string
  cajaId?: number
  /** Tope de filas. Sin tope, `getVentas` devuelve el histórico completo. */
  limit?: number
}

export type CambiarProteccionesInput = {
  protecciones: ProteccionesSeguridad
  pin?: string
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
  /** Cliente asociado cuando el ticket incluye un cargo de cuenta corriente. */
  clienteNombre: string | null
  items: VentaHistorialItem[]
}

export type VentaDetalle = {
  venta: Venta
  items: Array<DetalleVenta & { imgPath: string | null }>
  pagos: Pago[]
  clienteNombre: string | null
  clienteNotas: string | null
  empleadoNombre: string | null
  totalCuentaCorriente: number
  abonosCuentaCorriente: number
  saldoCuentaCorriente: number
}

export type MovimientoStock = {
  id: number
  productoId: number | null
  loteId: number | null
  ventaId: number | null
  tipo: TipoMovimientoStock
  cantidad: number
  costoUnitarioReferencia: number | null
  fuenteCostoMerma: 'lote' | 'referencia' | null
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
  desde?: string
  hasta?: string
  limit?: number
}

export type VentaDiaria = {
  /** `YYYY-MM-DD` en hora local, que es como el usuario lee el calendario. */
  fecha: string
  ventas: number
  /** Cantidad de abonos de cuenta corriente recibidos ese día. */
  abonos: number
  unidades: number
  /** Cobros y abonos netos de devoluciones y reintegros. */
  total: number
}

export type ProductoRanking = {
  productoId: number | null
  nombre: string
  /** Unidades vendidas. No es la cantidad de ventas. */
  cantidad: number
  monto: number
}

/** Un tipo de movimiento con su conteo y las unidades que movió en el período. */
export type MovimientoPorTipo = {
  tipo: TipoMovimientoStock
  cantidad: number
  unidades: number
}

/**
 * Movimientos de stock del período, agrupados por tipo.
 *
 * `entradas` y `salidas` son conteos de movimientos, no de unidades: mezclan
 * tipos que suman (entrada, ajuste positivo) con los que restan. Para unidades
 * hay que usar `porTipo`.
 */
export type ResumenMovimientos = {
  cantidad: number
  unidades: number
  entradas: number
  salidas: number
  porTipo: MovimientoPorTipo[]
}

/** Merma de un producto: unidades perdidas y su importe estimado. */
export type ProductoPerdida = {
  productoId: number
  nombre: string
  unidades: number
  unidadesSinValuar: number
  mermasSinValuar: number
  perdido: number
}

export type FuenteCostoMerma = 'lote' | 'referencia' | 'sin_dato'

export type MermaReporte = MovimientoStock & {
  nombreProducto: string
  costoUnitario: number | null
  fuenteCosto: FuenteCostoMerma
  perdidaEstimada: number | null
}

/**
 * Solo `mermas`.
 *
 * Un `ajuste_negativo` no entra: puede ser una corrección de conteo de
 * inventario, no una pérdida real, y sumarlo mezcla cosas distintas. Una
 * `devolucion` tampoco, porque la mercadería vuelve a estar vendible.
 */
export type ResumenPerdidas = {
  cantidadMermas: number
  unidadesPerdidas: number
  cantidadSinValuar: number
  unidadesSinValuar: number
  mermasSinProducto: number
  plataPorCostoLote: number
  plataPorReferencia: number
  plataPerdida: number
  mermas: MermaReporte[]
  porProducto: ProductoPerdida[]
}

/** Corte de caja cerrado, con el arqueo contra lo esperado. */
export type CorteCaja = {
  id: number
  empleadoNombre: string
  montoInicial: number
  montoEsperado: number | null
  montoReal: number | null
  diferencia: number | null
  fechaApertura: string | null
  fechaCierre: string | null
  observaciones: string | null
}

/**
 * Cortes de caja cerrados en el período.
 *
 * Se filtra por `fecha_cierre`, no por `fecha_apertura`: un turno abierto el 31
 * y cerrado el 1 pertenece al día en que se cerró, que es cuando se supo cuánto
 * se cobró.
 */
export type ResumenCortes = {
  cantidad: number
  cortesConDatos: number
  sinDatosArqueo: number
  diferenciaTotal: number
  conDescuadre: number
  cortes: CorteCaja[]
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
  /** Importe vendido neto de devoluciones; incluye los tickets a cuenta corriente. */
  totalVentas: number
  /** Dinero cobrado en el período: pagos y abonos, menos devoluciones y reintegros. */
  totalCobrado: number
  cantVentas: number
  ventasPorMetodo: { metodo: MetodoPago; monto: number }[]
  productosMasVendidos: ProductoRanking[]
  /** Productos ordenados por monto neto vendido. */
  productosMayorIngreso: ProductoRanking[]
  /**
 * Solo los días que tuvieron ventas o movimientos de cobro: el `GROUP BY` de la
 * consulta no puede inventar los huecos de un rango, porque el rango vive en el
 * renderer. Quien grafica tiene que densificar contra los `desde`/`hasta`.
 */
  ventasPorDia: VentaDiaria[]
  movimientos: ResumenMovimientos
  perdidas: ResumenPerdidas
  cortes: ResumenCortes
}

export type FiltrosReportes = {
  desde?: string
  hasta?: string
  /** Cuántos productos traer en cada ranking. Por omisión, 5. */
  topProductos?: number
}

// ── Cuentas corrientes ────────────────────────────────────────────────────────

export type Cliente = {
  id: number
  nombre: string
  telefono: string | null
  notas: string | null
  activo: boolean
  creadoEn: string
}

export type ClienteInput = {
  nombre: string
  telefono?: string | null
  notas?: string | null
}

/**
 * Cliente con su saldo ya resuelto.
 *
 * `totalAbonos` es neto: los reintegros revierten los abonos que se devolvieron.
 * El saldo también descuenta las devoluciones aplicadas a cargos.
 */
export type ClienteConSaldo = Cliente & {
  totalCargos: number
  totalAbonos: number
  /** Saldo luego de aplicar abonos netos y devoluciones; nunca queda negativo. */
  saldo: number
  cantidadMovimientos: number
  ultimoMovimiento: string | null
}

export type MovimientoCuentaCorrienteItem = DetalleVenta & {
  imgPath: string | null
}

export type MovimientoCuentaCorriente = {
  id: number
  clienteId: number
  tipo: TipoMovimientoCuentaCorriente
  monto: number
  ventaId: number | null
  metodo: MetodoPago | null
  cajaId: number | null
  nota: string | null
  fechaHora: string
  /** Denormalizado para pintar la tabla en una sola consulta. */
  clienteNombre: string
  /** Total de la venta origen, cuando el cargo viene de una venta. */
  ventaTotal: number | null
  /** Permite excluir anulaciones del listado de deudas cobrables sin ocultarlas del historial. */
  ventaAnulada?: boolean
  /** Saldo pendiente de este cargo después de aplicar abonos y devoluciones. */
  saldoPendiente?: number
  /** Productos congelados en el detalle de la venta que originó el cargo. */
  items?: MovimientoCuentaCorrienteItem[]
  abonoOrigenId?: number | null
}

export type FiltrosCuentaCorriente = {
  clienteId?: number
  desde?: string
  hasta?: string
  /** Tope de filas. Sin tope, devuelve el historial completo del cliente. */
  limit?: number
}

export type ResumenCuentasCorrientes = {
  /** Suma de los saldos de todos los clientes: la plata que hay que cobrar. */
  totalPorCobrar: number
  clientesConDeuda: number
  clientesActivos: number
  totalCargos: number
  totalAbonos: number
  totalDevoluciones: number
  totalReintegros: number
}

export type AbonoInput = {
  clienteId: number
  monto: number
  metodo: MetodoPago
  /** Movimiento de deuda seleccionado; permite validar el tope en el main process. */
  deudaId?: number | null
  /** Ticket al que se imputa el cobro cuando se cobra una deuda de venta. */
  ventaId?: number | null
  /** Gaveta donde entra la plata cuando el control por turno está activo. */
  cajaId?: number | null
  nota?: string | null
}

/** Cargo manual: deuda que no viene de una venta del mostrador. */
export type CargoManualInput = {
  clienteId: number
  monto: number
  nota?: string | null
}
