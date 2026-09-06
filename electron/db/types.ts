export type TipoVenta = 'unidad' | 'granel' | 'kit'
export type UnidadMedida = 'unidad' | 'ml' | 'g'
export type EstadoVenta = 'completada' | 'anulada'
export type EstadoCaja = 'abierta' | 'cerrada'
export type MetodoPago = 'efectivo' | 'transferencia' | 'debito' | 'credito' | 'cuenta_corriente'
export type TipoTarifa = 'minorista' | 'mayoreo'
export type TipoMovimientoStock = 'entrada' | 'venta' | 'ajuste_positivo' | 'ajuste_negativo' | 'merma' | 'devolucion'

export type ScanProductResult = {
  id: number
  categoriaId: number | null
  marcaId: number | null
  nombre: string
  codigoInterno: string
  codigosBarras: string | null
  tipoVenta: TipoVenta
  unidadMedida: UnidadMedida
  costo: number
  porcentajeGanancia: number
  precioVenta: number
  precioMayoreo: number
  stockActual: number
  stockMinimo: number
  vencimiento: string | null
  activo: boolean
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
  referencia: string | null
}

export type VentaInput = {
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
  ventaId: number
}