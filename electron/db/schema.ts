import { sqliteTable, integer, text, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core'
import type {
  EstadoCaja,
  EstadoVenta,
  MetodoPago,
  TipoMovimientoStock,
  TipoTarifa,
  TipoVenta,
  UnidadMedida,
} from './types.ts'

export const seguridadReportes = sqliteTable('seguridad_reportes', {
  id: integer('id').primaryKey(),
  pinHash: text('pin_hash').notNull(),
  actualizadoEn: text('actualizado_en').notNull(),
})

export const empleados = sqliteTable('empleados', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  creadoEn: text('creado_en').notNull(),
})

export const categorias = sqliteTable('categorias', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull().unique(),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
})

export const marcas = sqliteTable('marcas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull().unique(),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
})

export const productos = sqliteTable(
  'productos',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    categoriaId: integer('categoria_id').references(() => categorias.id),
    marcaId: integer('marca_id').references(() => marcas.id),
    nombre: text('nombre').notNull(),
    codigoInterno: text('codigo_interno').notNull(),
    codigosBarras: text('codigos_barras'),
    tipoVenta: text('tipo_venta').$type<TipoVenta>().notNull().default('unidad'),
    unidadMedida: text('unidad_medida').$type<UnidadMedida>().notNull().default('unidad'),
    costo: real('costo').notNull().default(0),
    porcentajeGanancia: real('porcentaje_ganancia').notNull().default(0),
    precioVenta: real('precio_venta').notNull().default(0),
    precioMayoreo: real('precio_mayoreo').notNull().default(0),
    stockActual: real('stock_actual').notNull().default(0),
    stockMinimo: real('stock_minimo').notNull().default(0),
    vencimiento: text('vencimiento'),
    activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
    creadoEn: text('creado_en').notNull(),
    actualizadoEn: text('actualizado_en'),
  },
  (table) => [uniqueIndex('productos_codigo_interno_unique').on(table.codigoInterno)],
)

export const lotes = sqliteTable(
  'lotes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productoId: integer('producto_id')
      .notNull()
      .references(() => productos.id),
    numeroLote: text('numero_lote'),
    fechaIngreso: text('fecha_ingreso').notNull(),
    fechaVence: text('fecha_vence'),
    costoUnitario: real('costo_unitario').notNull().default(0),
    cantidadInicial: real('cantidad_inicial').notNull(),
    cantidadActual: real('cantidad_actual').notNull(),
    creadoEn: text('creado_en').notNull(),
  },
  (table) => [index('lotes_producto_id_idx').on(table.productoId)],
)

export const cajas = sqliteTable('cajas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  empleadoId: integer('empleado_id')
    .notNull()
    .references(() => empleados.id),
  montoInicial: real('monto_inicial').notNull().default(0),
  montoEsperado: real('monto_esperado'),
  montoReal: real('monto_real'),
  diferencia: real('diferencia'),
  estado: text('estado').$type<EstadoCaja>().notNull().default('abierta'),
  fechaApertura: text('fecha_apertura'),
  fechaCierre: text('fecha_cierre'),
  observaciones: text('observaciones'),
})

export const ventas = sqliteTable('ventas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cajaId: integer('caja_id').references(() => cajas.id),
  empleadoId: integer('empleado_id')
    .notNull()
    .references(() => empleados.id),
  subtotal: real('subtotal').notNull().default(0),
  descuento: real('descuento').notNull().default(0),
  impuesto: real('impuesto').notNull().default(0),
  total: real('total').notNull(),
  estado: text('estado').$type<EstadoVenta>().notNull().default('completada'),
  fechaHora: text('fecha_hora').notNull(),
})

export const detalleVentas = sqliteTable('detalle_ventas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ventaId: integer('venta_id')
    .notNull()
    .references(() => ventas.id),
  productoId: integer('producto_id').references(() => productos.id),
  loteId: integer('lote_id').references(() => lotes.id),
  tipoTarifa: text('tipo_tarifa').$type<TipoTarifa>().notNull().default('minorista'),
  descripcionItem: text('descripcion_item').notNull(),
  cantidad: real('cantidad').notNull(),
  precioUnitario: real('precio_unitario').notNull(),
  costoUnitario: real('costo_unitario').notNull(),
  subtotal: real('subtotal').notNull(),
})

export const pagos = sqliteTable('pagos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ventaId: integer('venta_id')
    .notNull()
    .references(() => ventas.id),
  metodo: text('metodo').$type<MetodoPago>().notNull(),
  monto: real('monto').notNull(),
  referencia: text('referencia'),
  fechaHora: text('fecha_hora').notNull(),
})

export const movimientosStock = sqliteTable(
  'movimientos_stock',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productoId: integer('producto_id')
      .notNull()
      .references(() => productos.id),
    loteId: integer('lote_id').references(() => lotes.id),
    ventaId: integer('venta_id').references(() => ventas.id),
    tipo: text('tipo').$type<TipoMovimientoStock>().notNull(),
    cantidad: real('cantidad').notNull(),
    stockAnterior: real('stock_anterior'),
    stockPosterior: real('stock_posterior'),
    motivo: text('motivo'),
    fechaHora: text('fecha_hora').notNull(),
  },
  (table) => [index('movimientos_stock_producto_id_idx').on(table.productoId)],
)