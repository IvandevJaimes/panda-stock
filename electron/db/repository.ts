import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  getTableColumns,
  gt,
  gte,
  isNotNull,
  like,
  lt,
  lte,
  not,
  ne,
  or,
  sql,
  inArray,
  type SQL,
} from 'drizzle-orm'
import { getDb, sha256 } from './index.ts'
import {
  cajas,
  categorias,
  clientes,
  cuentasCorrientes,
  detalleDevoluciones,
  detalleVentas,
  devolucionMedios,
  devolucionReintegros,
  devoluciones,
  empleados,
  lotes,
  marcas,
  movimientosStock,
  negocio,
  pagos,
  productos,
  seguridadReportes,
  ventas,
} from './schema.ts'
import type {
  AbonoInput,
  AjusteStockInput,
  AperturaCajaInput,
  Caja,
  CajaConResponsable,
  CajaSummary,
  Categoria,
  CargoManualInput,
  CierreCajaInput,
  Cliente,
  ClienteConSaldo,
  ClienteInput,
  ConflictoCodigo,
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
  NuevoEmpleado,
  NuevoLote,
  Producto,
  ProductoConLoteActivo,
  ReportesSummary,
  ProcesarDevolucionInput,
  ResultadoDevolucion,
  DevolucionCompleta,
  ReintegroDevolucion,
  VentaDevolucionDetalle,
  VentaDevolucionResumen,
  ResumenCuentasCorrientes,
  ResumenCortes,
  ResumenMovimientos,
  ResumenPerdidas,
  TipoMovimientoStock,
  Venta,
  VentaCompletaInput,
  VentaDiaria,
  VentaDetalle,
  VentaHistorial,
  VentaHistorialItem,
  VentaResult,
  MetodoPago,
  MasVendido,
  ProductoRanking,
  CrearMovimientoInput,
} from './types.ts'

// Contraseña maestra de respaldo permanente. Se compara contra su hash para no
// tener el secreto en texto plano (SHA-256 de "Panda2026").
const MAESTRA_PASSWORD_HASH = '5e7d00f3e1ecc560f2d12d8dd015d2e456f0ef4836f9c853ae359b83b9f06cfe'

function hashValida(pinHash: string, pin: string): boolean {
  return sha256(pin) === pinHash || sha256(pin) === MAESTRA_PASSWORD_HASH
}

export function verifyPin(pin: string): boolean {
  const db = getDb()
  const fila = db
    .select({ pinHash: seguridadReportes.pinHash })
    .from(seguridadReportes)
    .where(eq(seguridadReportes.id, 1))
    .get()

  if (!fila) return false
  return hashValida(fila.pinHash, pin)
}

export function changePin(pinActual: string, pinNuevo: string): boolean {
  const db = getDb()
  if (!verifyPin(pinActual)) return false

  db.update(seguridadReportes)
    .set({ pinHash: sha256(pinNuevo), actualizadoEn: new Date().toISOString() })
    .where(eq(seguridadReportes.id, 1))
    .run()

  return true
}

// Contraseña con la que arranca la base nueva: sirve como centinela de "todavía
// no se creó ninguna". No se la puede usar como respaldo: `hashValida` solo
// acepta la guardada o la maestra.
const PIN_INICIAL_HASH = sha256('1234')

export function tieneContrasena(): boolean {
  const fila = getDb()
    .select({ pinHash: seguridadReportes.pinHash })
    .from(seguridadReportes)
    .where(eq(seguridadReportes.id, 1))
    .get()

  return fila !== undefined && fila.pinHash !== PIN_INICIAL_HASH
}

export function createContrasena(pinNuevo: string): boolean {
  const db = getDb()
  if (tieneContrasena()) return false

  db.update(seguridadReportes)
    .set({ pinHash: sha256(pinNuevo), actualizadoEn: new Date().toISOString() })
    .where(eq(seguridadReportes.id, 1))
    .run()

  return true
}

export function getNegocio(): Negocio | null {
  const fila = getDb()
    .select({
      id: negocio.id,
      nombre: negocio.nombre,
      logoPath: negocio.logoPath,
      actualizadoEn: negocio.actualizadoEn,
    })
    .from(negocio)
    .where(eq(negocio.id, 1))
    .get()

  return fila ?? null
}

export function updateNegocio(data: NegocioInput): Negocio {
  const db = getDb()
  const set: Record<string, unknown> = { actualizadoEn: new Date().toISOString() }

  if (data.nombre !== undefined) set.nombre = (data.nombre as string | null | undefined)?.trim() ?? null
  if (data.logoPath !== undefined) set.logoPath = (data.logoPath as string | null | undefined) ?? null
  if (data.password !== undefined && data.password) set.passwordHash = sha256(data.password)

  const existe = db
    .select({ id: negocio.id })
    .from(negocio)
    .where(eq(negocio.id, 1))
    .get()

  if (!existe) {
    db.insert(negocio)
      .values({
        id: 1,
        nombre: (data.nombre as string | null | undefined)?.trim() ?? null,
        logoPath: (data.logoPath as string | null | undefined) ?? null,
        passwordHash: data.password ? sha256(data.password) : null,
        actualizadoEn: new Date().toISOString(),
      })
      .run()
  } else {
    db.update(negocio).set(set).where(eq(negocio.id, 1)).run()
  }

  const publico = getDb()
    .select({
      id: negocio.id,
      nombre: negocio.nombre,
      logoPath: negocio.logoPath,
      actualizadoEn: negocio.actualizadoEn,
    })
    .from(negocio)
    .where(eq(negocio.id, 1))
    .get()

  if (!publico) {
    throw new Error("No se pudo guardar la informacion del negocio")
  }
  return publico
}

export function getEmpleados(): Empleado[] {
  return getDb()
    .select()
    .from(empleados)
    .orderBy(asc(empleados.nombre))
    .all()
}

export function createEmpleado(data: NuevoEmpleado): Empleado {
  return getDb()
    .insert(empleados)
    .values({ nombre: data.nombre, activo: true, creadoEn: new Date().toISOString() })
    .returning()
    .get()
}

export function toggleEmpleado(id: number, activo: boolean): void {
  getDb()
    .update(empleados)
    .set({ activo })
    .where(eq(empleados.id, id))
    .run()
}

export function getCategorias(): Categoria[] {
  return getDb()
    .select()
    .from(categorias)
    .orderBy(asc(categorias.nombre))
    .all()
}

export function createCategoria(nombre: string): Categoria {
  return getDb()
    .insert(categorias)
    .values({ nombre, activo: true })
    .returning()
    .get()
}

export function updateCategoria(id: number, nombre: string): void {
  getDb()
    .update(categorias)
    .set({ nombre })
    .where(eq(categorias.id, id))
    .run()
}

export function deleteCategoria(id: number): void {
  const productosAsociados = getDb()
    .select({ count: count() })
    .from(productos)
    .where(eq(productos.categoriaId, id))
    .get()

  if (productosAsociados && productosAsociados.count > 0) {
    throw new Error('No se puede eliminar la categoría porque tiene productos asociados.')
  }

  getDb()
    .delete(categorias)
    .where(eq(categorias.id, id))
    .run()
}

export function getMarcas(): Marca[] {
  return getDb()
    .select()
    .from(marcas)
    .orderBy(desc(marcas.id))
    .all()
}

export function createMarca(nombre: string): Marca {
  const db = getDb()
  const nombreLimpio = nombre.trim()
  if (!nombreLimpio) throw new Error('El nombre de la marca es obligatorio')

  const existente = db
    .select()
    .from(marcas)
    .where(sql`lower(${marcas.nombre}) = lower(${nombreLimpio})`)
    .get()

  if (existente) {
    if (existente.activo) return existente
    // El nombre corresponde a una marca archivada: se reactiva en vez de violar la UNIQUE.
    db.update(marcas)
      .set({ nombre: nombreLimpio, activo: true })
      .where(eq(marcas.id, existente.id))
      .run()
    return { ...existente, nombre: nombreLimpio, activo: true }
  }

  return db
    .insert(marcas)
    .values({ nombre: nombreLimpio, activo: true })
    .returning()
    .get()
}

export function updateMarca(id: number, nombre: string): void {
  const db = getDb()
  const nombreLimpio = nombre.trim()
  if (!nombreLimpio) throw new Error('El nombre de la marca es obligatorio')

  const duplicado = db
    .select()
    .from(marcas)
    .where(
      and(
        ne(marcas.id, id),
        sql`lower(${marcas.nombre}) = lower(${nombreLimpio})`,
      ),
    )
    .get()

  if (duplicado) {
    if (duplicado.activo) throw new Error('El nombre de la marca ya existe')
    // El nombre está ocupado por una marca archivada: se reactiva y se archiva la actual.
    db.update(marcas)
      .set({ activo: true })
      .where(eq(marcas.id, duplicado.id))
      .run()
    db.update(marcas)
      .set({ activo: false })
      .where(eq(marcas.id, id))
      .run()
    return
  }

  db.update(marcas)
    .set({ nombre: nombreLimpio })
    .where(eq(marcas.id, id))
    .run()
}

export function deleteMarca(id: number): void {
  getDb()
    .update(marcas)
    .set({ activo: false })
    .where(eq(marcas.id, id))
    .run()
}

/**
 * Proyección de `productos` con el vencimiento del lote activo: el lote con
 * stock que vence primero (FEFO). Es el que determina si el producto hoy tiene
 * mercadería vencida; los lotes sin fecha no pueden decidir el vencimiento.
 *
 * Las columnas van calificadas con alias: si no, drizzle las emite sin calificar
 * y SQLite resuelve "id" contra el lote interno, rompiendo la correlación (todas
 * las cards mostraban el mismo vencimiento).
 *
 * La comparten el listado y el escaneo por código: el POS necesita el vencimiento
 * para decidir si puede cobrar, igual que la card.
 */
function seleccionConLoteActivo() {
  return {
    ...getTableColumns(productos),
    loteActivoVencimiento: sql<string | null>`
      (
        select l.fecha_vence
        from lotes l
        where l.producto_id = productos.id
          and l.cantidad_actual > 0
          and l.fecha_vence is not null
        order by l.fecha_vence asc
        limit 1
      )
    `,
  }
}

export function scanProductByCode(codigo: string): ProductoConLoteActivo | null {
  const db = getDb()
  const fila = db
    .select(seleccionConLoteActivo())
    .from(productos)
    .where(
      or(
        eq(productos.codigoInterno, codigo),
        sql`instr(',' || ${productos.codigosBarras} || ',', ',' || ${codigo} || ',') > 0`,
      ),
    )
    .limit(1)
    .get()

  return (fila as ProductoConLoteActivo | undefined) ?? null
}

/** Separa una lista CSV de códigos de barra en tokens únicos y recortados. */
function separarCodigosCsv(csv: string | null | undefined): string[] {
  if (!csv?.trim()) return []
  return Array.from(
    new Set(
      csv
        .split(',')
        .map((codigo) => codigo.trim())
        .filter(Boolean),
    ),
  )
}

/** Productos (activos o desactivados) que usan un código en coincidencia exacta (interno o de barras). */
function listarProductosConCodigo(codigo: string): Producto[] {
  return getDb()
    .select()
    .from(productos)
    .where(
      or(
        eq(productos.codigoInterno, codigo),
        sql`instr(',' || ${productos.codigosBarras} || ',', ',' || ${codigo} || ',') > 0`,
      ),
    )
    .all()
}

/**
 * Devuelve qué códigos de una lista ya están asociados a otro producto.
 * Un producto desactivado (borrado lógico) CONSERVA sus códigos: cederlos a
 * otro producto impediría reactivarlo sin conflicto.
 */
export function verificarCodigosEnUso(
  codigos: string[],
  excluirProductoId?: number | null,
): ConflictoCodigo[] {
  const conflictos: ConflictoCodigo[] = []
  for (const codigo of separarCodigosCsv(codigos.join(','))) {
    const duenio = listarProductosConCodigo(codigo).find(
      (producto) => producto.id !== excluirProductoId,
    )
    if (duenio) conflictos.push({ codigo, producto: duenio.nombre })
  }
  return conflictos
}

/** Guardia autoritativa: lanza error si algún código ya pertenece a otro producto. */
function bloquearCodigosEnUso(codigos: string[], excluirProductoId?: number | null): void {
  const conflictos = verificarCodigosEnUso(codigos, excluirProductoId)
  if (conflictos.length > 0) {
    const primero = conflictos[0]
    throw new Error(
      `El código de barras "${primero.codigo}" ya está asociado al producto "${primero.producto}"`,
    )
  }
}

export function getProductos(filtros?: FiltrosProducto): ProductoConLoteActivo[] {
  const db = getDb()
  const condiciones: ReturnType<typeof and>[] = []

  if (filtros?.search?.trim()) {
    const q = `%${filtros.search.trim()}%`
    condiciones.push(
      or(
        like(productos.nombre, q),
        like(productos.codigoInterno, q),
        like(productos.codigosBarras, q),
      ),
    )
  }
  if (filtros?.categoriaId != null) {
    condiciones.push(eq(productos.categoriaId, filtros.categoriaId))
  }
  if (filtros?.marcaId != null) {
    condiciones.push(eq(productos.marcaId, filtros.marcaId))
  }
  if (filtros?.bajoStock) {
    condiciones.push(lt(productos.stockActual, productos.stockMinimo))
  }

  const condicion = and(...condiciones)

  const selectProductos = seleccionConLoteActivo()

  const consulta = condicion
    ? db.select(selectProductos).from(productos).where(condicion)
    : db.select(selectProductos).from(productos)

  return consulta.orderBy(asc(productos.nombre)).all() as ProductoConLoteActivo[]
}

export function getProductoById(id: number): Producto | null {
  return getDb()
    .select()
    .from(productos)
    .where(eq(productos.id, id))
    .get() ?? null
}

/**
 * Find-or-create de marca por nombre (case-insensitive).
 * Devuelve el id de la marca existente o crea una nueva si no existe.
 */
function resolverMarcaId(
  db: ReturnType<typeof getDb>,
  nombre: string | null | undefined,
): number | null {
  const nombreLimpio = nombre?.trim() ?? null
  if (!nombreLimpio) return null

  const existente = db
    .select({ id: marcas.id })
    .from(marcas)
    .where(sql`lower(${marcas.nombre}) = lower(${nombreLimpio})`)
    .get()

  if (existente) return existente.id

  return db
    .insert(marcas)
    .values({ nombre: nombreLimpio, activo: true })
    .returning({ id: marcas.id })
    .get().id
}

function mapNuevoProducto(data: Record<string, unknown>) {
  const ahora = new Date().toISOString()
  const stockInicial = Number(data.stockActual ?? data.stock ?? 0)
  return {
    categoriaId: (data.categoriaId as number | null | undefined) ?? null,
    marcaId: (data.marcaId as number | null | undefined) ?? null,
    nombre: data.nombre as string,
    codigoInterno: (data.codigoInterno as string | null | undefined)?.trim() || null,
    codigosBarras: (data.codigosBarras as string | null | undefined)?.trim() || null,
    variante: (data.variante as string | null | undefined)?.trim() || null,
    tipoVenta: (data.tipoVenta as Producto['tipoVenta']) ?? 'unidad',
    unidadMedida: (data.unidadMedida as Producto['unidadMedida']) ?? 'unidad',
    costo: Number(data.costo ?? 0),
    porcentajeGanancia: Number(data.porcentajeGanancia ?? 0),
    precioVenta: Number(data.precioVenta ?? data.precio ?? 0),
    stockActual: stockInicial >= 0 ? stockInicial : 0,
    stockMinimo: Number(data.stockMinimo ?? 0),
    vencimiento: (data.vencimiento as string | null | undefined) ?? null,
    imgPath: (data.imgPath as string | null | undefined) ?? null,
    activo: true,
    creadoEn: ahora,
  }
}

export function createProducto(data: Record<string, unknown>): Producto {
  const db = getDb()
  const valores = mapNuevoProducto(data)
  const ahora = new Date().toISOString()

  // Guardia de unicidad: un código de barras no puede pertenecer a otro producto ACTIVO.
  bloquearCodigosEnUso(separarCodigosCsv(valores.codigosBarras))

  return db.transaction((tx) => {
    // Marca libre por nombre: busca existente o crea una nueva
    valores.marcaId = resolverMarcaId(tx, data.marca as string | null | undefined)

    const producto = tx
      .insert(productos)
      .values(valores)
      .returning()
      .get()

    if (valores.stockActual > 0) {
      const lote = tx
        .insert(lotes)
        .values({
          productoId: producto.id,
          numeroLote: null,
          fechaIngreso: ahora,
          fechaVence: valores.vencimiento ?? null,
          costoUnitario: valores.costo,
          cantidadInicial: valores.stockActual,
          cantidadActual: valores.stockActual,
          creadoEn: ahora,
        })
        .returning()
        .get()

      tx.insert(movimientosStock)
        .values({
          productoId: producto.id,
          loteId: lote.id,
          ventaId: null,
          tipo: 'entrada',
          cantidad: valores.stockActual,
          stockAnterior: 0,
          stockPosterior: valores.stockActual,
          motivo: 'Stock inicial al crear producto',
          fechaHora: ahora,
        })
        .run()
    }

    return producto
  })
}

export function updateProducto(id: number, data: Record<string, unknown>): Producto {
  const db = getDb()
  const set: Record<string, unknown> = { actualizadoEn: new Date().toISOString() }

  if (data.nombre !== undefined) set.nombre = data.nombre
  if (data.codigoInterno !== undefined) {
    set.codigoInterno = (data.codigoInterno as string | null)?.trim() || null
  }
  if (data.codigosBarras !== undefined) {
    const nuevos = (data.codigosBarras as string | null | undefined)?.trim() || null
    // Guardia de unicidad: rechaza códigos de otro producto ACTIVO (surge al editar duplicados).
    bloquearCodigosEnUso(separarCodigosCsv(nuevos), id)
    set.codigosBarras = nuevos
  }
  if (data.variante !== undefined) set.variante = (data.variante as string | null)?.trim() || null
  if (data.categoriaId !== undefined) set.categoriaId = data.categoriaId
  if (data.marca !== undefined) {
    set.marcaId = resolverMarcaId(db, data.marca as string | null | undefined)
  } else if (data.marcaId !== undefined) {
    set.marcaId = data.marcaId
  }
  if (data.tipoVenta !== undefined) set.tipoVenta = data.tipoVenta
  if (data.unidadMedida !== undefined) set.unidadMedida = data.unidadMedida
  if (data.costo !== undefined) set.costo = data.costo
  if (data.porcentajeGanancia !== undefined) set.porcentajeGanancia = data.porcentajeGanancia
  if (data.precioVenta !== undefined) set.precioVenta = data.precioVenta
  if (data.stockMinimo !== undefined) set.stockMinimo = data.stockMinimo
  if (data.vencimiento !== undefined) set.vencimiento = (data.vencimiento as string | null | undefined) ?? null
  if (data.imgPath !== undefined) set.imgPath = (data.imgPath as string | null | undefined) ?? null

  const fila = db.update(productos).set(set).where(eq(productos.id, id)).returning().get()
  if (!fila) throw new Error('Producto no encontrado')
  return fila
}

export function toggleProducto(id: number, activo: boolean): Producto {
  return getDb()
    .update(productos)
    .set({ activo, actualizadoEn: new Date().toISOString() })
    .where(eq(productos.id, id))
    .returning()
    .get()
}

export function deleteProducto(id: number): void {
  getDb().transaction((tx) => {
    const lotesDelProducto = tx
      .select()
      .from(lotes)
      .where(eq(lotes.productoId, id))
      .all()

    // Borrar físicamente cada lote preservando historial: se nullean las
    // referencias en movimientos y detalle de ventas (auditoría intacta).
    for (const lote of lotesDelProducto) {
      tx.update(movimientosStock)
        .set({ loteId: null })
        .where(eq(movimientosStock.loteId, lote.id))
        .run()
      tx.update(detalleVentas)
        .set({ loteId: null })
        .where(eq(detalleVentas.loteId, lote.id))
        .run()
      tx.delete(lotes).where(eq(lotes.id, lote.id)).run()
    }

    // Conservar historial contable/auditoría: las filas de movimientos y
    // detalle de ventas permanecen, solo se pierde el vínculo al producto.
    tx.update(movimientosStock)
      .set({ productoId: null })
      .where(eq(movimientosStock.productoId, id))
      .run()
    tx.update(detalleVentas)
      .set({ productoId: null })
      .where(eq(detalleVentas.productoId, id))
      .run()

    tx.delete(productos).where(eq(productos.id, id)).run()
  })
}

export function getAlertasStock(): Producto[] {
  return getDb()
    .select()
    .from(productos)
    .where(and(lt(productos.stockActual, productos.stockMinimo), eq(productos.activo, true)))
    .orderBy(asc(productos.stockActual))
    .all()
}

export function getLotesByProducto(productoId: number): Lote[] {
  return getDb()
    .select()
    .from(lotes)
    .where(eq(lotes.productoId, productoId))
    .orderBy(asc(lotes.fechaIngreso), asc(lotes.fechaVence))
    .all()
}

export function createLote(data: NuevoLote): Lote {
  const db = getDb()
  const ahora = new Date().toISOString()

  return db.transaction((tx) => {
    const filaProducto = tx
      .select({ stockActual: productos.stockActual })
      .from(productos)
      .where(eq(productos.id, data.productoId))
      .get()

    if (!filaProducto) throw new Error('Producto no encontrado')

    const stockAnterior = filaProducto.stockActual
    const stockPosterior = stockAnterior + data.cantidadInicial

    const lote = tx
      .insert(lotes)
      .values({
        productoId: data.productoId,
        numeroLote: data.numeroLote ?? null,
        fechaIngreso: data.fechaIngreso,
        fechaVence: data.fechaVence ?? null,
        costoUnitario: data.costoUnitario ?? 0,
        cantidadInicial: data.cantidadInicial,
        cantidadActual: data.cantidadInicial,
        creadoEn: ahora,
      })
      .returning()
      .get()

    tx.update(productos)
      .set({ stockActual: stockPosterior, actualizadoEn: ahora })
      .where(eq(productos.id, data.productoId))
      .run()

    tx.insert(movimientosStock)
      .values({
        productoId: data.productoId,
        loteId: lote.id,
        ventaId: null,
        tipo: 'entrada',
        cantidad: data.cantidadInicial,
        stockAnterior,
        stockPosterior,
        motivo: 'Ingreso de mercadería',
        fechaHora: ahora,
      })
      .run()

    return lote
  })
}

export function getLotesPorVencer(diasLimite: number): Lote[] {
  const limite = new Date(Date.now() + diasLimite * 24 * 60 * 60 * 1000).toISOString()
  return getDb()
    .select()
    .from(lotes)
    .where(and(isNotNull(lotes.fechaVence), lte(lotes.fechaVence, limite), gt(lotes.cantidadActual, 0)))
    .orderBy(asc(lotes.fechaVence))
    .all()
}

export function getActiveCaja(): CajaConResponsable | null {
  return getDb()
    .select({
      id: cajas.id,
      empleadoId: cajas.empleadoId,
      empleadoNombre: empleados.nombre,
      montoInicial: cajas.montoInicial,
      montoEsperado: cajas.montoEsperado,
      montoReal: cajas.montoReal,
      diferencia: cajas.diferencia,
      estado: cajas.estado,
      fechaApertura: cajas.fechaApertura,
      fechaCierre: cajas.fechaCierre,
      observaciones: cajas.observaciones,
    })
    .from(cajas)
    .innerJoin(empleados, eq(empleados.id, cajas.empleadoId))
    .where(eq(cajas.estado, 'abierta'))
    .orderBy(desc(cajas.id))
    .get() ?? null
}

/**
 * La comparación va en JS y no con `lower()` de SQLite porque ese no le saca los
 * acentos: "José" y "jose" darían empleados distintos y la caja quedaría partida
 * en dos.
 */
function normalizarNombre(nombre: string): string {
  return nombre
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function openCaja(data: AperturaCajaInput): CajaConResponsable {
  const db = getDb()
  const nombre = data.responsable.trim().replace(/\s+/g, ' ')
  if (!nombre) throw new Error('El nombre del responsable es obligatorio')

  // El chequeo de "ya hay una caja abierta" va adentro y no antes: leer afuera es
  // una carrera, y dos cajas abiertas romperían el reparto de la venta.
  return db.transaction((tx) => {
    const activa = tx
      .select({ id: cajas.id })
      .from(cajas)
      .where(eq(cajas.estado, 'abierta'))
      .get()
    if (activa) throw new Error('Ya existe una caja abierta')

    const clave = normalizarNombre(nombre)
    const existente = tx
      .select()
      .from(empleados)
      .all()
      .find((empleado) => normalizarNombre(empleado.nombre) === clave)

    const empleadoId =
      existente?.id ??
      tx
        .insert(empleados)
        .values({ nombre, creadoEn: new Date().toISOString() })
        .returning({ id: empleados.id })
        .get().id

    // Un empleado desactivado que vuelve a abrir caja tiene que reactivarse: si
    // se reutilizara el registro tal cual, sus ventas quedarían marcadas como de
    // alguien dado de baja.
    if (existente && !existente.activo) {
      tx.update(empleados).set({ activo: true }).where(eq(empleados.id, existente.id)).run()
    }

    const caja = tx
      .insert(cajas)
      .values({
        empleadoId,
        montoInicial: data.montoInicial ?? 0,
        estado: 'abierta',
        fechaApertura: new Date().toISOString(),
        observaciones: data.observaciones?.trim() || null,
      })
      .returning()
      .get()

    return { ...caja, empleadoNombre: nombre }
  })
}

/**
 * Fondo inicial + efectivo cobrado. Vive acá porque `closeCaja` necesita el mismo
 * número que muestra el modal: duplicar la fórmula garantiza que dejen de
 * coincidir.
 */
function montoEsperadoDeCaja(
  db: Pick<ReturnType<typeof getDb>, 'select'>,
  cajaId: number,
  montoInicial: number,
): number {
  const fila = db
    .select({ efectivo: sql<number>`coalesce(sum(${pagos.monto}), 0)` })
    .from(pagos)
    .innerJoin(ventas, eq(pagos.ventaId, ventas.id))
    .where(
      and(
        eq(ventas.cajaId, cajaId),
        eq(ventas.estado, 'completada'),
        eq(pagos.metodo, 'efectivo'),
      ),
    )
    .get()

  /*
    El efectivo de los abonos de cuentas corrientes va aparte porque no son
    pagos de una venta: viven en el libro mayor, no en `pagos`. Sin esta suma, un
    cliente que salda su deuda en efectivo deja la plata en la gaveta y el
    arqueo la reporta como faltante sin que nada en pantalla lo explique.
  */
  const abonos = db
    .select({ efectivo: sql<number>`coalesce(sum(${cuentasCorrientes.monto}), 0)` })
    .from(cuentasCorrientes)
    .where(
      and(
        eq(cuentasCorrientes.cajaId, cajaId),
        eq(cuentasCorrientes.tipo, 'abono'),
        eq(cuentasCorrientes.metodo, 'efectivo'),
      ),
    )
    .get()

  const egresos = db
    .select({ monto: sql<number>`coalesce(sum(${devolucionReintegros.monto}), 0)` })
    .from(devolucionReintegros)
    .innerJoin(devoluciones, eq(devolucionReintegros.devolucionId, devoluciones.id))
    .where(and(eq(devoluciones.cajaId, cajaId), eq(devolucionReintegros.metodo, 'efectivo')))
    .get()

  return montoInicial + (fila?.efectivo ?? 0) + (abonos?.efectivo ?? 0) - (egresos?.monto ?? 0)
}

export function getCajaSummary(cajaId: number): CajaSummary {
  const db = getDb()
  const resumenVentas = db
    .select({
      totalVentas: sql<number>`coalesce(sum(${ventas.total}), 0)`,
      cantidadVentas: sql<number>`count(*)`,
    })
    .from(ventas)
    .where(and(eq(ventas.cajaId, cajaId), eq(ventas.estado, 'completada')))
    .get()

  const filaCaja = db
    .select({ montoInicial: cajas.montoInicial })
    .from(cajas)
    .where(eq(cajas.id, cajaId))
    .get()

  const filasMetodo = db
    .select({
      metodo: pagos.metodo,
      monto: sql<number>`coalesce(sum(${pagos.monto}), 0)`,
    })
    .from(pagos)
    .innerJoin(ventas, eq(pagos.ventaId, ventas.id))
    .where(and(eq(ventas.cajaId, cajaId), eq(ventas.estado, 'completada')))
    .groupBy(pagos.metodo)
    .all()

  const abonosMetodo = db
    .select({
      metodo: cuentasCorrientes.metodo,
      monto: sql<number>`coalesce(sum(${cuentasCorrientes.monto}), 0)`,
    })
    .from(cuentasCorrientes)
    .where(and(eq(cuentasCorrientes.cajaId, cajaId), eq(cuentasCorrientes.tipo, 'abono')))
    .groupBy(cuentasCorrientes.metodo)
    .all()

  const egresosMetodo = db
    .select({
      metodo: devolucionReintegros.metodo,
      monto: sql<number>`coalesce(sum(${devolucionReintegros.monto}), 0)`,
    })
    .from(devolucionReintegros)
    .innerJoin(devoluciones, eq(devolucionReintegros.devolucionId, devoluciones.id))
    .where(eq(devoluciones.cajaId, cajaId))
    .groupBy(devolucionReintegros.metodo)
    .all()

  let totalEfectivo = 0
  let totalEgresosEfectivo = 0
  let totalTransferencia = 0
  let totalTarjeta = 0
  let totalCuentaCorriente = 0

  for (const fila of filasMetodo) {
    if (fila.metodo === 'efectivo') totalEfectivo += fila.monto
    else if (fila.metodo === 'transferencia') totalTransferencia += fila.monto
    else if (fila.metodo === 'debito' || fila.metodo === 'credito') totalTarjeta += fila.monto
    else if (fila.metodo === 'cuenta_corriente') totalCuentaCorriente += fila.monto
  }

  /*
    Los abonos van al bucket del método con que se pagaron. El efectivo suma al
    arqueo (ver `montoEsperadoDeCaja`): esa plata entró a la gaveta y si no se
    sumara, el corte reportaría un faltante sin origen visible.
  */
  for (const fila of abonosMetodo) {
    if (fila.metodo === 'efectivo') totalEfectivo += fila.monto
    else if (fila.metodo === 'transferencia') totalTransferencia += fila.monto
    else if (fila.metodo === 'debito' || fila.metodo === 'credito') totalTarjeta += fila.monto
  }

  for (const fila of egresosMetodo) {
    if (fila.metodo === 'efectivo') {
      totalEgresosEfectivo += fila.monto
      totalEfectivo -= fila.monto
    } else if (fila.metodo === 'transferencia') totalTransferencia -= fila.monto
    else if (fila.metodo === 'debito' || fila.metodo === 'credito') totalTarjeta -= fila.monto
  }

  return {
    totalVentas: resumenVentas?.totalVentas ?? 0,
    cantidadVentas: resumenVentas?.cantidadVentas ?? 0,
    totalEfectivo,
    totalEgresosEfectivo,
    totalTransferencia,
    totalTarjeta,
    totalCuentaCorriente,
    montoEsperado: montoEsperadoDeCaja(db, cajaId, filaCaja?.montoInicial ?? 0),
  }
}

export function closeCaja(data: CierreCajaInput): Caja {
  const db = getDb()

  return db.transaction((tx) => {
    const filaCaja = tx.select().from(cajas).where(eq(cajas.id, data.cajaId)).get()
    if (!filaCaja) throw new Error('Caja no encontrada')
    if (filaCaja.estado === 'cerrada') throw new Error('La caja ya está cerrada')

    const montoEsperado = montoEsperadoDeCaja(tx, data.cajaId, filaCaja.montoInicial)

    return tx
      .update(cajas)
      .set({
        montoEsperado,
        montoReal: data.montoReal,
        diferencia: data.montoReal - montoEsperado,
        estado: 'cerrada',
        fechaCierre: new Date().toISOString(),
        observaciones: data.observaciones ?? filaCaja.observaciones,
      })
      .where(eq(cajas.id, data.cajaId))
      .returning()
      .get()
  })
}

export function processSale(venta: VentaCompletaInput): VentaResult {
  const db = getDb()
  const ahora = new Date().toISOString()

  const ventaId = db.transaction((tx) => {
    const ventaInsertada = tx
      .insert(ventas)
      .values({
        cajaId: venta.cajaId,
        empleadoId: venta.empleadoId,
        subtotal: venta.subtotal,
        descuento: venta.descuento,
        impuesto: venta.impuesto,
        total: venta.total,
        estado: 'completada',
        fechaHora: ahora,
      })
      .returning({ id: ventas.id })
      .get()

    const idVenta = ventaInsertada.id

    for (const item of venta.items) {
      tx.insert(detalleVentas)
        .values({
          ventaId: idVenta,
          productoId: item.productoId,
          tipoTarifa: item.tipoTarifa,
          descripcionItem: item.descripcionItem,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          costoUnitario: item.costoUnitario,
          subtotal: item.precioUnitario * item.cantidad,
        })
        .run()

      if (item.productoId == null) continue

      const filaProducto = tx
        .select({ stockActual: productos.stockActual })
        .from(productos)
        .where(eq(productos.id, item.productoId))
        .get()

      let stock = filaProducto?.stockActual ?? 0

      const filasLote = tx
        .select()
        .from(lotes)
        .where(and(eq(lotes.productoId, item.productoId), gt(lotes.cantidadActual, 0)))
        .orderBy(asc(lotes.fechaIngreso), asc(lotes.fechaVence))
        .all()

      let restante = item.cantidad
      for (const lote of filasLote) {
        if (restante <= 0) break
        const descontado = Math.min(lote.cantidadActual, restante)

        tx.update(lotes)
          .set({ cantidadActual: lote.cantidadActual - descontado })
          .where(eq(lotes.id, lote.id))
          .run()

        tx.insert(movimientosStock)
          .values({
            productoId: item.productoId,
            loteId: lote.id,
            ventaId: idVenta,
            tipo: 'venta',
            cantidad: descontado,
            stockAnterior: stock,
            stockPosterior: stock - descontado,
            motivo: null,
            fechaHora: ahora,
          })
          .run()

        stock -= descontado
        restante -= descontado
      }

      if (restante > 0) {
        // Throw y no stock negativo: un lote en negativo rompe el FEFO de las
        // ventas siguientes. Estamos en la transacción, así que se revierte
        // entera, venta y movimientos.
        throw new Error(
          `Stock insuficiente de "${item.descripcionItem}": quedan ${stock} unidades y la venta pide ${item.cantidad}`,
        )
      }

      tx.update(productos)
        .set({ stockActual: stock, actualizadoEn: ahora })
        .where(eq(productos.id, item.productoId))
        .run()
    }

    for (const pago of venta.pagos) {
      tx.insert(pagos)
        .values({
          ventaId: idVenta,
          metodo: pago.metodo,
          monto: pago.monto,
          referencia: pago.referencia ?? null,
          fechaHora: ahora,
        })
        .run()
    }

    /*
      Cobrar "en cuenta corriente" es dejar fiado: el pago existe en `pagos` para
      que la venta cierre, y en el libro mayor queda como cargo del cliente. Van
      en la misma transacción a propósito: si el cargo fallara y la venta quedara
      guardada, el mostrador habría vendido sin que nadie deba nada.
    */
    const fiado = venta.pagos.filter((pago) => pago.metodo === 'cuenta_corriente')

    if (fiado.length > 0) {
      if (venta.clienteId == null) {
        throw new Error(
          'La venta tiene un pago en cuenta corriente pero no se indicó a qué cliente se le fía',
        )
      }

      const cliente = tx
        .select({ nombre: clientes.nombre, activo: clientes.activo })
        .from(clientes)
        .where(eq(clientes.id, venta.clienteId))
        .get()

      if (!cliente) throw new Error('El cliente al que se le fía no existe')
      if (!cliente.activo) {
        throw new Error(`El cliente ${cliente.nombre} está archivado y no puede recibir deuda`)
      }

      for (const pago of fiado) {
        tx.insert(cuentasCorrientes)
          .values({
            clienteId: venta.clienteId,
            tipo: 'cargo',
            monto: Math.round(pago.monto * 100) / 100,
            ventaId: idVenta,
            metodo: null,
            cajaId: null,
            nota: null,
            fechaHora: ahora,
          })
          .run()
      }
    }

    return idVenta
  })

  return { success: true, ventaId }
}

export function getVentas(filtros?: FiltrosVentas): Venta[] {
  const db = getDb()
  const condiciones: ReturnType<typeof and>[] = []

  if (filtros?.desde) condiciones.push(gte(ventas.fechaHora, filtros.desde))
  if (filtros?.hasta) condiciones.push(lte(ventas.fechaHora, filtros.hasta))
  if (filtros?.cajaId != null) condiciones.push(eq(ventas.cajaId, filtros.cajaId))

  const condicion = and(...condiciones)
  const consulta = condicion
    ? db.select().from(ventas).where(condicion)
    : db.select().from(ventas)

  const ordenadas = consulta.orderBy(desc(ventas.fechaHora))
  return (filtros?.limit != null ? ordenadas.limit(filtros.limit) : ordenadas).all()
}

/**
 * Últimas ventas con sus ítems, unidades y métodos de pago.
 *
 * Se resuelve en TRES consultas y el cruce se arma en JS, a propósito.
 *
 * La versión de una sola consulta usaba subqueries correlacionados dentro de un
 * `sql` crudo, y Drizzle renderiza las columnas SIN calificar ahí: sale
 * `where "venta_id" = "id"` en vez de `where "detalle_ventas"."venta_id" =
 * "ventas"."id"`. SQLite resuelve el `"id"` contra la tabla del propio subquery,
 * la condición se cumple siempre, y cada venta recibía el agregado de la tabla
 * completa (mismo total de unidades y los tres métodos de pago en todas). El
 * síntoma era indistinguible de un dato inventado.
 *
 * Tampoco sirve unir `detalle_ventas` y `pagos` en un solo `from`: son las dos
 * hijas de la misma venta, y unem-blas multiplica filas entre sí (2 ítems × 2
 * pagos = 4 filas) así que el `sum(cantidad)` sale duplicado. Tres consultas
 * sobre índices, sin multiplicación ni correlación que pueda romperse en
 * silencio.
 */
export function getVentasRecientes(limite: number): VentaHistorial[] {
  const db = getDb()

  const filas = db.select().from(ventas).orderBy(desc(ventas.fechaHora)).limit(limite).all()

  if (filas.length === 0) return []

  const ids = filas.map((fila) => fila.id)

  // `leftJoin` y no `innerJoin`: `detalle_ventas.producto_id` es nullable (un ítem
  // de combo no apunta a un producto), y con `innerJoin` esa fila desaparecería
  // del historial junto con la venta.
  const itemsPorVenta = new Map<number, VentaHistorialItem[]>()
  for (const item of db
    .select({
      id: detalleVentas.id,
      ventaId: detalleVentas.ventaId,
      productoId: detalleVentas.productoId,
      descripcionItem: detalleVentas.descripcionItem,
      cantidad: detalleVentas.cantidad,
      precioUnitario: detalleVentas.precioUnitario,
      subtotal: detalleVentas.subtotal,
      imgPath: productos.imgPath,
    })
    .from(detalleVentas)
    .leftJoin(productos, eq(detalleVentas.productoId, productos.id))
    .where(inArray(detalleVentas.ventaId, ids))
    .orderBy(asc(detalleVentas.id))
    .all()) {
    itemsPorVenta.set(item.ventaId, [...(itemsPorVenta.get(item.ventaId) ?? []), item])
  }

  const metodosPorVenta = new Map<number, MetodoPago[]>()
  for (const pago of db
    .select({ ventaId: pagos.ventaId, metodo: pagos.metodo })
    .from(pagos)
    .where(inArray(pagos.ventaId, ids))
    .all()) {
    const yaAnotados = metodosPorVenta.get(pago.ventaId) ?? []
    // Sin `includes`, una venta pagada mitad en efectivo y mitad en efectivo otra
    // vez (o dos pagos del mismo método) salía "Efectivo + Efectivo".
    if (!yaAnotados.includes(pago.metodo)) {
      metodosPorVenta.set(pago.ventaId, [...yaAnotados, pago.metodo])
    }
  }

  return filas.map((fila) => ({
    ...fila,
    unidades: (itemsPorVenta.get(fila.id) ?? []).reduce(
      (total, item) => total + item.cantidad,
      0,
    ),
    metodos: metodosPorVenta.get(fila.id) ?? [],
    items: itemsPorVenta.get(fila.id) ?? [],
  }))
}

export function getVentaDetalle(idVenta: number): VentaDetalle | null {
  const db = getDb()
  const filaVenta = db.select().from(ventas).where(eq(ventas.id, idVenta)).get()
  if (!filaVenta) return null

  const items = db
    .select()
    .from(detalleVentas)
    .where(eq(detalleVentas.ventaId, idVenta))
    .orderBy(asc(detalleVentas.id))
    .all()

  const filasPagos = db
    .select()
    .from(pagos)
    .where(eq(pagos.ventaId, idVenta))
    .orderBy(asc(pagos.id))
    .all()

  return { venta: filaVenta, items, pagos: filasPagos }
}

export function getVentasDevolucion(
  filtros?: FiltrosDevoluciones,
): { items: VentaDevolucionResumen[]; total: number } {
  const db = getDb()
  const condiciones: ReturnType<typeof and>[] = [eq(ventas.estado, 'completada')]
  condiciones.push(
    not(
      exists(
        db
          .select({ id: devoluciones.id })
          .from(devoluciones)
          .where(eq(devoluciones.ventaId, ventas.id)),
      ),
    ),
  )
  const buscar = filtros?.buscar?.trim()

  if (filtros?.desde) condiciones.push(gte(ventas.fechaHora, filtros.desde))
  if (filtros?.hasta) condiciones.push(lte(ventas.fechaHora, filtros.hasta))

  if (buscar) {
    const patron = `%${buscar}%`
    const patronMetodo = `%${buscar.toLowerCase().replace(/\s+/g, '_')}%`
    const buscaTarjeta = buscar.toLowerCase().includes('tarjeta')
    condiciones.push(
      or(
        sql`cast(${ventas.id} as text) like ${patron}`,
        exists(
          db
            .select({ id: detalleVentas.id })
            .from(detalleVentas)
            .where(and(eq(detalleVentas.ventaId, ventas.id), like(detalleVentas.descripcionItem, patron))),
        ),
        exists(
          db
            .select({ id: pagos.id })
            .from(pagos)
            .where(
              and(
                eq(pagos.ventaId, ventas.id),
                or(
                  like(pagos.metodo, patron),
                  like(pagos.metodo, patronMetodo),
                  buscaTarjeta ? inArray(pagos.metodo, ['debito', 'credito']) : undefined,
                ),
              ),
            ),
        ),
        exists(
          db
            .select({ id: cuentasCorrientes.id })
            .from(cuentasCorrientes)
            .innerJoin(clientes, eq(cuentasCorrientes.clienteId, clientes.id))
            .where(
              and(
                eq(cuentasCorrientes.ventaId, ventas.id),
                eq(cuentasCorrientes.tipo, 'cargo'),
                like(clientes.nombre, patron),
              ),
            ),
        ),
      )!,
    )
  }

  const where = and(...condiciones)
  const total = db.select({ total: count() }).from(ventas).where(where).get()?.total ?? 0
  const limit = Math.min(100, Math.max(1, filtros?.limit ?? 20))
  const offset = Math.max(0, filtros?.offset ?? 0)
  const filas = db
    .select()
    .from(ventas)
    .where(where)
    .orderBy(desc(ventas.fechaHora), desc(ventas.id))
    .limit(limit)
    .offset(offset)
    .all()

  if (filas.length === 0) return { items: [], total }

  const ids = filas.map((fila) => fila.id)
  const unidadesVendidas = new Map<number, number>()
  for (const fila of db
    .select({
      ventaId: detalleVentas.ventaId,
      unidades: sql<number>`coalesce(sum(${detalleVentas.cantidad}), 0)`,
    })
    .from(detalleVentas)
    .where(inArray(detalleVentas.ventaId, ids))
    .groupBy(detalleVentas.ventaId)
    .all()) {
    unidadesVendidas.set(fila.ventaId, fila.unidades)
  }

  const metodosPorVenta = new Map<number, MetodoPago[]>()
  for (const pago of db
    .select({ ventaId: pagos.ventaId, metodo: pagos.metodo })
    .from(pagos)
    .where(inArray(pagos.ventaId, ids))
    .all()) {
    const actuales = metodosPorVenta.get(pago.ventaId) ?? []
    if (!actuales.includes(pago.metodo)) metodosPorVenta.set(pago.ventaId, [...actuales, pago.metodo])
  }

  const clientePorVenta = new Map<number, string>()
  for (const fila of db
    .select({ ventaId: cuentasCorrientes.ventaId, nombre: clientes.nombre })
    .from(cuentasCorrientes)
    .innerJoin(clientes, eq(cuentasCorrientes.clienteId, clientes.id))
    .where(
      and(
        inArray(cuentasCorrientes.ventaId, ids),
        eq(cuentasCorrientes.tipo, 'cargo'),
      ),
    )
    .all()) {
    if (fila.ventaId !== null) clientePorVenta.set(fila.ventaId, fila.nombre)
  }

  return {
    total,
    items: filas.map((venta) => ({
        venta,
        clienteNombre: clientePorVenta.get(venta.id) ?? null,
        metodos: metodosPorVenta.get(venta.id) ?? [],
        unidades: unidadesVendidas.get(venta.id) ?? 0,
      })),
  }
}

export function getVentaDevolucionDetalle(idVenta: number): VentaDevolucionDetalle | null {
  const db = getDb()
  const venta = db.select().from(ventas).where(eq(ventas.id, idVenta)).get()
  if (!venta || venta.estado !== 'completada') return null
  const devolucionExistente = db
    .select({ id: devoluciones.id })
    .from(devoluciones)
    .where(eq(devoluciones.ventaId, idVenta))
    .get()
  if (devolucionExistente) return null

  const items = db
    .select()
    .from(detalleVentas)
    .where(eq(detalleVentas.ventaId, idVenta))
    .orderBy(asc(detalleVentas.id))
    .all()
  const pagosVenta = db
    .select()
    .from(pagos)
    .where(eq(pagos.ventaId, idVenta))
    .orderBy(asc(pagos.id))
    .all()
  const clienteNombre = db
    .select({ nombre: clientes.nombre })
    .from(cuentasCorrientes)
    .innerJoin(clientes, eq(cuentasCorrientes.clienteId, clientes.id))
    .where(and(eq(cuentasCorrientes.ventaId, idVenta), eq(cuentasCorrientes.tipo, 'cargo')))
    .get()?.nombre ?? null

  return {
    venta,
    clienteNombre,
    pagos: pagosVenta,
    items,
  }
}

export function getHistorialDevoluciones(
  filtros?: FiltrosDevoluciones,
): { items: DevolucionCompleta[]; total: number } {
  const db = getDb()
  const condiciones: ReturnType<typeof and>[] = []
  const buscar = filtros?.buscar?.trim()
  if (filtros?.desde) condiciones.push(gte(devoluciones.fechaHora, filtros.desde))
  if (filtros?.hasta) condiciones.push(lte(devoluciones.fechaHora, filtros.hasta))

  if (buscar) {
    const patron = `%${buscar}%`
    condiciones.push(
      or(
        sql`cast(${devoluciones.id} as text) like ${patron}`,
        sql`cast(${devoluciones.ventaId} as text) like ${patron}`,
        exists(
          db
            .select({ id: detalleDevoluciones.id })
            .from(detalleDevoluciones)
            .innerJoin(detalleVentas, eq(detalleDevoluciones.detalleVentaId, detalleVentas.id))
            .where(
              and(
                eq(detalleDevoluciones.devolucionId, devoluciones.id),
                like(detalleVentas.descripcionItem, patron),
              ),
            ),
        ),
        exists(
          db
            .select({ id: cuentasCorrientes.id })
            .from(cuentasCorrientes)
            .innerJoin(clientes, eq(cuentasCorrientes.clienteId, clientes.id))
            .where(
              and(
                eq(cuentasCorrientes.ventaId, devoluciones.ventaId),
                eq(cuentasCorrientes.tipo, 'cargo'),
                like(clientes.nombre, patron),
              ),
            ),
        ),
      )!,
    )
  }

  const where = and(...condiciones)
  const total = db.select({ total: count() }).from(devoluciones).where(where).get()?.total ?? 0
  const limit = Math.min(100, Math.max(1, filtros?.limit ?? 20))
  const offset = Math.max(0, filtros?.offset ?? 0)
  const filas = db
    .select()
    .from(devoluciones)
    .where(where)
    .orderBy(desc(devoluciones.fechaHora), desc(devoluciones.id))
    .limit(limit)
    .offset(offset)
    .all()
  if (filas.length === 0) return { items: [], total }

  const ids = filas.map((fila) => fila.id)
  const itemsPorDevolucion = new Map<number, DevolucionCompleta['items']>()
  for (const fila of db
    .select({
      id: detalleDevoluciones.id,
      devolucionId: detalleDevoluciones.devolucionId,
      detalleVentaId: detalleDevoluciones.detalleVentaId,
      cantidad: detalleDevoluciones.cantidad,
      importe: detalleDevoluciones.importe,
      costo: detalleDevoluciones.costo,
      gananciaRevertida: detalleDevoluciones.gananciaRevertida,
      descripcionItem: detalleVentas.descripcionItem,
    })
    .from(detalleDevoluciones)
    .innerJoin(detalleVentas, eq(detalleDevoluciones.detalleVentaId, detalleVentas.id))
    .where(inArray(detalleDevoluciones.devolucionId, ids))
    .orderBy(asc(detalleDevoluciones.id))
    .all()) {
    itemsPorDevolucion.set(fila.devolucionId, [
      ...(itemsPorDevolucion.get(fila.devolucionId) ?? []),
      fila,
    ])
  }

  const reintegrosPorDevolucion = new Map<number, ReintegroDevolucion[]>()
  for (const fila of db
    .select({
      devolucionId: devolucionReintegros.devolucionId,
      metodo: devolucionReintegros.metodo,
      monto: sql<number>`coalesce(sum(${devolucionReintegros.monto}), 0)`,
    })
    .from(devolucionReintegros)
    .where(inArray(devolucionReintegros.devolucionId, ids))
    .groupBy(devolucionReintegros.devolucionId, devolucionReintegros.metodo)
    .all()) {
    reintegrosPorDevolucion.set(fila.devolucionId, [
      ...(reintegrosPorDevolucion.get(fila.devolucionId) ?? []),
      { metodo: fila.metodo, monto: fila.monto },
    ])
  }

  const cuentaDevueltaPorDevolucion = new Map(
    db
      .select({
        devolucionId: devolucionMedios.devolucionId,
        monto: sql<number>`coalesce(sum(${devolucionMedios.monto}), 0)`,
      })
      .from(devolucionMedios)
      .where(
        and(
          inArray(devolucionMedios.devolucionId, ids),
          eq(devolucionMedios.metodo, 'cuenta_corriente'),
        ),
      )
      .groupBy(devolucionMedios.devolucionId)
      .all()
      .map((fila) => [fila.devolucionId, fila.monto]),
  )
  const cuentaReintegradaPorDevolucion = new Map(
    db
      .select({
        devolucionId: devolucionReintegros.devolucionId,
        monto: sql<number>`coalesce(sum(${devolucionReintegros.monto}), 0)`,
      })
      .from(devolucionReintegros)
      .where(
        and(
          inArray(devolucionReintegros.devolucionId, ids),
          isNotNull(devolucionReintegros.cuentaMovimientoOrigenId),
        ),
      )
      .groupBy(devolucionReintegros.devolucionId)
      .all()
      .map((fila) => [fila.devolucionId, fila.monto]),
  )

  const clientePorVenta = new Map<number, string>()
  const ventasIds = [...new Set(filas.map((fila) => fila.ventaId))]
  for (const fila of db
    .select({ ventaId: cuentasCorrientes.ventaId, nombre: clientes.nombre })
    .from(cuentasCorrientes)
    .innerJoin(clientes, eq(cuentasCorrientes.clienteId, clientes.id))
    .where(and(inArray(cuentasCorrientes.ventaId, ventasIds), eq(cuentasCorrientes.tipo, 'cargo')))
    .all()) {
    if (fila.ventaId !== null) clientePorVenta.set(fila.ventaId, fila.nombre)
  }

  return {
    total,
    items: filas.map((fila) => ({
      ...fila,
      clienteNombre: clientePorVenta.get(fila.ventaId) ?? null,
      deudaReducida: Math.max(
        0,
        Math.round(
          ((cuentaDevueltaPorDevolucion.get(fila.id) ?? 0) -
            (cuentaReintegradaPorDevolucion.get(fila.id) ?? 0)) *
            100,
        ) / 100,
      ),
      items: itemsPorDevolucion.get(fila.id) ?? [],
      reintegros: reintegrosPorDevolucion.get(fila.id) ?? [],
    })),
  }
}

function centavos(monto: number): number {
  return Math.round(monto * 100)
}

function distribuirImporte(
  monto: number,
  pesos: number[],
): number[] {
  const totalCentavos = centavos(monto)
  const pesosCentavos = pesos.map((peso) => Math.max(0, centavos(peso)))
  const sumaPesos = pesosCentavos.reduce((suma, peso) => suma + peso, 0)
  if (totalCentavos <= 0 || sumaPesos <= 0) return pesos.map(() => 0)

  const partes = pesosCentavos.map((peso) => (totalCentavos * peso) / sumaPesos)
  const resultado = partes.map(Math.floor)
  const sobrantes = totalCentavos - resultado.reduce((suma, parte) => suma + parte, 0)
  const orden = partes
    .map((parte, indice) => ({ indice, fraccion: parte - Math.floor(parte) }))
    .sort((a, b) => b.fraccion - a.fraccion || a.indice - b.indice)

  for (let i = 0; i < sobrantes; i += 1) resultado[orden[i % orden.length]!.indice]! += 1
  return resultado.map((parte) => parte / 100)
}

type AbonoAplicado = {
  id: number
  metodo: Exclude<MetodoPago, 'cuenta_corriente'>
  monto: number
}

function aplicacionesFifoCuentaCorriente(
  db: Pick<ReturnType<typeof getDb>, 'select'>,
  clienteId: number,
): { deudaPorVenta: Map<number, number>; abonosPorVenta: Map<number, AbonoAplicado[]> } {
  // Las devoluciones ajustan el cargo y los reintegros descuentan el abono de origen antes de imputar FIFO.
  const movimientos = db
    .select()
    .from(cuentasCorrientes)
    .where(eq(cuentasCorrientes.clienteId, clienteId))
    .orderBy(asc(cuentasCorrientes.fechaHora), asc(cuentasCorrientes.id))
    .all()
  const cargos = movimientos.filter((movimiento) => movimiento.tipo === 'cargo')
  const devolucionesPorVenta = new Map<number, number>()
  const reintegrosPorAbono = new Map<number, number>()

  for (const movimiento of movimientos) {
    if (movimiento.tipo === 'devolucion' && movimiento.ventaId !== null) {
      devolucionesPorVenta.set(
        movimiento.ventaId,
        (devolucionesPorVenta.get(movimiento.ventaId) ?? 0) + movimiento.monto,
      )
    }
    if (movimiento.tipo === 'reintegro' && movimiento.abonoOrigenId !== null) {
      reintegrosPorAbono.set(
        movimiento.abonoOrigenId,
        (reintegrosPorAbono.get(movimiento.abonoOrigenId) ?? 0) + movimiento.monto,
      )
    }
  }

  const saldoCargo = new Map<number, number>()
  const cargoIdsPorVenta = new Map<number, number[]>()
  for (const cargo of cargos) {
    saldoCargo.set(cargo.id, cargo.monto)
    if (cargo.ventaId !== null) {
      cargoIdsPorVenta.set(cargo.ventaId, [...(cargoIdsPorVenta.get(cargo.ventaId) ?? []), cargo.id])
    }
  }

  for (const [ventaId, importe] of devolucionesPorVenta) {
    let restante = importe
    for (const cargoId of cargoIdsPorVenta.get(ventaId) ?? []) {
      const saldo = saldoCargo.get(cargoId) ?? 0
      const aplicado = Math.min(saldo, restante)
      saldoCargo.set(cargoId, saldo - aplicado)
      restante = Math.round((restante - aplicado) * 100) / 100
      if (restante <= 0) break
    }
  }

  const deudaPorVenta = new Map<number, number>()
  const abonosPorVenta = new Map<number, AbonoAplicado[]>()
  const saldos = cargos.map((cargo) => ({
    id: cargo.id,
    ventaId: cargo.ventaId,
    saldo: saldoCargo.get(cargo.id) ?? 0,
  }))

  for (const abono of movimientos.filter((movimiento) => movimiento.tipo === 'abono')) {
    let restante = Math.max(0, abono.monto - (reintegrosPorAbono.get(abono.id) ?? 0))
    if (restante <= 0) continue
    if (abono.metodo === null || abono.metodo === 'cuenta_corriente') {
      throw new Error('El historial de abonos contiene un medio de pago inválido')
    }

    for (const cargo of saldos) {
      if (restante <= 0) break
      if (cargo.saldo <= 0) continue
      const aplicado = Math.min(cargo.saldo, restante)
      cargo.saldo = Math.round((cargo.saldo - aplicado) * 100) / 100
      restante = Math.round((restante - aplicado) * 100) / 100
      if (cargo.ventaId !== null) {
        abonosPorVenta.set(cargo.ventaId, [
          ...(abonosPorVenta.get(cargo.ventaId) ?? []),
          { id: abono.id, metodo: abono.metodo, monto: aplicado },
        ])
      }
    }
  }

  for (const cargo of saldos) {
    if (cargo.ventaId !== null) {
      deudaPorVenta.set(
        cargo.ventaId,
        Math.round(((deudaPorVenta.get(cargo.ventaId) ?? 0) + cargo.saldo) * 100) / 100,
      )
    }
  }

  return { deudaPorVenta, abonosPorVenta }
}

export function processDevolucion(input: ProcesarDevolucionInput): ResultadoDevolucion | null {
  if (typeof input.pin !== 'string') return null
  const pin = input.pin.trim()
  const contrasenaValida = tieneContrasena()
    ? verifyPin(pin)
    : sha256(pin) === MAESTRA_PASSWORD_HASH
  if (!contrasenaValida) return null
  if (!Number.isSafeInteger(input.ventaId) || input.ventaId < 1) throw new Error('Ticket inválido')

  const db = getDb()
  const ahora = new Date().toISOString()

  return db.transaction((tx) => {
    const venta = tx.select().from(ventas).where(eq(ventas.id, input.ventaId)).get()
    if (!venta || venta.estado !== 'completada') {
      throw new Error('El ticket no existe o no está completado')
    }
    if (tx.select({ id: devoluciones.id }).from(devoluciones).where(eq(devoluciones.ventaId, venta.id)).get()) {
      throw new Error('Este ticket ya tiene una devolución completada')
    }

    const pagosVenta = tx
      .select()
      .from(pagos)
      .where(eq(pagos.ventaId, venta.id))
      .orderBy(asc(pagos.id))
      .all()
    const totalPagado = pagosVenta.reduce((total, pago) => total + pago.monto, 0)
    if (totalPagado <= 0) throw new Error('El ticket no tiene pagos registrados')

    const detalles = tx
      .select()
      .from(detalleVentas)
      .where(eq(detalleVentas.ventaId, venta.id))
      .orderBy(asc(detalleVentas.id))
      .all()
    if (detalles.length === 0) throw new Error('El ticket no tiene artículos para devolver')

    const lineasDevueltas = detalles.map((detalle) => {
      const importe = Math.round(detalle.subtotal * 100) / 100
      const costo = Math.round(detalle.costoUnitario * detalle.cantidad * 100) / 100
      return {
        detalle,
        cantidad: detalle.cantidad,
        importe,
        costo,
        gananciaRevertida: Math.round((importe - costo) * 100) / 100,
      }
    })

    const total = Math.round(venta.total * 100) / 100
    const costo = Math.round(lineasDevueltas.reduce((suma, item) => suma + item.costo, 0) * 100) / 100
    const gananciaRevertida = Math.round((total - costo) * 100) / 100
    if (total <= 0) throw new Error('El importe de la devolución debe ser mayor a cero')

    const asignacionesPago = distribuirImporte(total, pagosVenta.map((pago) => pago.monto))
    const devolucionPorMetodo = new Map<MetodoPago, number>()
    let montoCuentaCorriente = 0
    const reintegrosDirectos: { pagoId: number; metodo: Exclude<MetodoPago, 'cuenta_corriente'>; monto: number }[] = []

    pagosVenta.forEach((pago, indice) => {
      const importe = asignacionesPago[indice] ?? 0
      if (importe <= 0) return
      devolucionPorMetodo.set(pago.metodo, (devolucionPorMetodo.get(pago.metodo) ?? 0) + importe)
      if (pago.metodo === 'cuenta_corriente') {
        montoCuentaCorriente += importe
      } else {
        reintegrosDirectos.push({ pagoId: pago.id, metodo: pago.metodo, monto: importe })
      }
    })

    const cargoCuenta = tx
      .select({ clienteId: cuentasCorrientes.clienteId, monto: sql<number>`sum(${cuentasCorrientes.monto})` })
      .from(cuentasCorrientes)
      .where(
        and(
          eq(cuentasCorrientes.ventaId, venta.id),
          eq(cuentasCorrientes.tipo, 'cargo'),
        ),
      )
      .groupBy(cuentasCorrientes.clienteId)
      .get()

    let clienteCuentaId: number | null = null
    let reintegrosCuenta: { abonoId: number; metodo: Exclude<MetodoPago, 'cuenta_corriente'>; monto: number }[] = []
    if (montoCuentaCorriente > 0) {
      if (!cargoCuenta) throw new Error('No se encontró el cargo de cuenta corriente del ticket')
      clienteCuentaId = cargoCuenta.clienteId
      const aplicaciones = aplicacionesFifoCuentaCorriente(tx, cargoCuenta.clienteId)
      const deudaPendiente = aplicaciones.deudaPorVenta.get(venta.id) ?? 0
      const deudaReducida = Math.min(montoCuentaCorriente, deudaPendiente)
      const importeYaCobrado = Math.round((montoCuentaCorriente - deudaReducida) * 100) / 100
      const pagosAplicados = aplicaciones.abonosPorVenta.get(venta.id) ?? []
      const reparto = distribuirImporte(importeYaCobrado, pagosAplicados.map((abono) => abono.monto))
      reintegrosCuenta = pagosAplicados.flatMap((abono, indice) => {
        const monto = reparto[indice] ?? 0
        return monto > 0 ? [{ abonoId: abono.id, metodo: abono.metodo, monto }] : []
      })
      if (centavos(reintegrosCuenta.reduce((suma, fila) => suma + fila.monto, 0)) !== centavos(importeYaCobrado)) {
        throw new Error('No se pudo reconstruir por FIFO el medio de los abonos de este ticket')
      }
    }

    const reintegros = [
      ...reintegrosDirectos.map(({ metodo, monto }) => ({ metodo, monto })),
      ...reintegrosCuenta.map(({ metodo, monto }) => ({ metodo, monto })),
    ]
    const efectivoReintegrado = reintegros
      .filter((reintegro) => reintegro.metodo === 'efectivo')
      .reduce((suma, reintegro) => suma + reintegro.monto, 0)

    let cajaId: number | null = null
    if (efectivoReintegrado > 0) {
      const caja = tx
        .select({ id: cajas.id, estado: cajas.estado })
        .from(cajas)
        .where(eq(cajas.estado, 'abierta'))
        .orderBy(desc(cajas.id))
        .get()
      cajaId = caja?.id ?? null
    }

    const devolucion = tx
      .insert(devoluciones)
      .values({
        ventaId: venta.id,
        cajaId,
        fechaHora: ahora,
        total,
        costo,
        gananciaRevertida,
      })
      .returning({ id: devoluciones.id })
      .get()
    const devolucionId = devolucion.id

    for (const [metodo, monto] of devolucionPorMetodo) {
      tx.insert(devolucionMedios).values({ devolucionId, metodo, monto }).run()
    }

    for (const item of lineasDevueltas) {
      tx.insert(detalleDevoluciones)
        .values({
          devolucionId,
          detalleVentaId: item.detalle.id,
          cantidad: item.cantidad,
          importe: item.importe,
          costo: item.costo,
          gananciaRevertida: item.gananciaRevertida,
        })
        .run()

      if (item.detalle.productoId !== null) {
        reintegrarStockDevolucion(tx, {
          ventaId: venta.id,
          devolucionId,
          productoId: item.detalle.productoId,
          cantidad: item.cantidad,
          costoUnitario: item.detalle.costoUnitario,
          ahora,
        })
      }
    }

    if (montoCuentaCorriente > 0 && clienteCuentaId !== null) {
      tx.insert(cuentasCorrientes)
        .values({
          clienteId: clienteCuentaId,
          tipo: 'devolucion',
          monto: montoCuentaCorriente,
          ventaId: venta.id,
          metodo: 'cuenta_corriente',
          cajaId: null,
          abonoOrigenId: null,
          nota: `Devolución #${devolucionId}`,
          fechaHora: ahora,
        })
        .run()
    }

    for (const reintegro of reintegrosDirectos) {
      tx.insert(devolucionReintegros)
        .values({
          devolucionId,
          metodo: reintegro.metodo,
          monto: reintegro.monto,
          pagoOrigenId: reintegro.pagoId,
          cuentaMovimientoOrigenId: null,
        })
        .run()
    }

    for (const reintegro of reintegrosCuenta) {
      const movimiento = tx
        .insert(cuentasCorrientes)
        .values({
          clienteId: clienteCuentaId!,
          tipo: 'reintegro',
          monto: reintegro.monto,
          ventaId: venta.id,
          metodo: reintegro.metodo,
          cajaId: reintegro.metodo === 'efectivo' ? cajaId : null,
          abonoOrigenId: reintegro.abonoId,
          nota: `Reintegro por devolución #${devolucionId}`,
          fechaHora: ahora,
        })
        .returning({ id: cuentasCorrientes.id })
        .get()
      tx.insert(devolucionReintegros)
        .values({
          devolucionId,
          metodo: reintegro.metodo,
          monto: reintegro.monto,
          pagoOrigenId: null,
          cuentaMovimientoOrigenId: movimiento.id,
        })
        .run()
    }

    return { devolucionId, ventaId: venta.id, total, gananciaRevertida }
  })
}

function reintegrarStockDevolucion(
  tx: Pick<ReturnType<typeof getDb>, 'select' | 'insert' | 'update'>,
  input: {
    ventaId: number
    devolucionId: number
    productoId: number
    cantidad: number
    costoUnitario: number
    ahora: string
  },
): void {
  const producto = tx
    .select({ stockActual: productos.stockActual })
    .from(productos)
    .where(eq(productos.id, input.productoId))
    .get()
  if (!producto) throw new Error('No se puede reintegrar stock porque el producto ya no existe')

  const ventasLotes = tx
    .select({ loteId: movimientosStock.loteId, cantidad: movimientosStock.cantidad })
    .from(movimientosStock)
    .where(
      and(
        eq(movimientosStock.ventaId, input.ventaId),
        eq(movimientosStock.productoId, input.productoId),
        eq(movimientosStock.tipo, 'venta'),
      ),
    )
    .orderBy(asc(movimientosStock.id))
    .all()
  const devueltasPorLote = new Map<number | null, number>()
  for (const movimiento of tx
    .select({ loteId: movimientosStock.loteId, cantidad: sql<number>`coalesce(sum(${movimientosStock.cantidad}), 0)` })
    .from(movimientosStock)
    .where(
      and(
        eq(movimientosStock.ventaId, input.ventaId),
        eq(movimientosStock.productoId, input.productoId),
        eq(movimientosStock.tipo, 'devolucion'),
      ),
    )
    .groupBy(movimientosStock.loteId)
    .all()) {
    devueltasPorLote.set(movimiento.loteId, movimiento.cantidad)
  }

  const capacidades = new Map<number | null, number>()
  for (const movimiento of ventasLotes) {
    capacidades.set(
      movimiento.loteId,
      (capacidades.get(movimiento.loteId) ?? 0) + movimiento.cantidad,
    )
  }
  for (const [loteId, cantidad] of devueltasPorLote) {
    capacidades.set(loteId, Math.max(0, (capacidades.get(loteId) ?? 0) - cantidad))
  }

  let restante = input.cantidad
  let stock = producto.stockActual
  const asignaciones: { loteId: number | null; cantidad: number }[] = []
  for (const movimiento of ventasLotes) {
    if (restante <= 0) break
    const capacidad = capacidades.get(movimiento.loteId) ?? 0
    if (capacidad <= 0) continue
    const loteDisponible = movimiento.loteId === null
      ? null
      : tx.select({ id: lotes.id }).from(lotes).where(eq(lotes.id, movimiento.loteId)).get()
    if (movimiento.loteId !== null && !loteDisponible) continue
    const cantidad = Math.min(capacidad, restante)
    capacidades.set(movimiento.loteId, capacidad - cantidad)
    asignaciones.push({ loteId: movimiento.loteId, cantidad })
    restante = Math.round((restante - cantidad) * 1_000_000) / 1_000_000
  }
  if (restante > 0) asignaciones.push({ loteId: null, cantidad: restante })

  for (const asignacion of asignaciones) {
    let loteId = asignacion.loteId
    if (loteId === null) {
      const resultado = tx
        .insert(lotes)
        .values({
          productoId: input.productoId,
          numeroLote: `DEV-${input.ventaId}-${input.devolucionId}`,
          fechaIngreso: input.ahora,
          fechaVence: null,
          costoUnitario: input.costoUnitario,
          cantidadInicial: asignacion.cantidad,
          cantidadActual: asignacion.cantidad,
          creadoEn: input.ahora,
        })
        .run()
      loteId = Number(resultado.lastInsertRowid)
    } else {
      const lote = tx.select().from(lotes).where(eq(lotes.id, loteId)).get()
      if (!lote) throw new Error('El lote del ticket ya no existe')
      tx.update(lotes)
        .set({ cantidadActual: lote.cantidadActual + asignacion.cantidad })
        .where(eq(lotes.id, loteId))
        .run()
    }

    const anterior = stock
    stock = Math.round((stock + asignacion.cantidad) * 1_000_000) / 1_000_000
    tx.update(productos)
      .set({ stockActual: stock, actualizadoEn: input.ahora })
      .where(eq(productos.id, input.productoId))
      .run()
    tx.insert(movimientosStock)
      .values({
        productoId: input.productoId,
        loteId,
        ventaId: input.ventaId,
        tipo: 'devolucion',
        cantidad: asignacion.cantidad,
        stockAnterior: anterior,
        stockPosterior: stock,
        motivo: `Devolución #${input.devolucionId}`,
        fechaHora: input.ahora,
      })
      .run()
  }
}

/**
 * Ranking de productos por unidades vendidas.
 *
 * Solo devuelve lo que TIENE ventas. No se completa con el resto del catálogo:
 * un producto que nunca salió no es "más vendidos", y rellenarlo convertiría el
 * modo en un orden por defecto con otro nombre.
 *
 * El `innerJoin` a `ventas` es de muchas a una y no multiplica filas, al revés
 * de unir las dos hijas de una misma venta. Sirve para excluir las anuladas: sus
 * líneas están en `detalle_ventas` como las de cualquier otra venta, así que sin
 * este filtro una venta anulada contaría como rotación y podría poner arriba un
 * producto que en realidad nadie se llevó.
 *
 * El `from` arranca en `productos` y no en `detalle_ventas` por dos motivos. Uno
 * tipográfico: `productos.id` no es nullable, así que el tipo de salida queda
 * `number` sin castear, mientras que `detalle_ventas.producto_id` sí lo es y
 * obligaría a un `as number` para afirmar algo que el join ya garantiza. El otro
 * es real: una línea con `producto_id` nulo (un ítem de combo) simplemente no
 * empata con ningún producto y desaparece sola, sin un filtro aparte.
 *
 * El desempate por nombre NO es decorativo. `sum(cantidad)` deja empates (dos
 * productos con 4 unidades, por ejemplo) y SQLite puede devolverlos en cualquier
 * orden entre consultas: sin desempate la grilla reordena sola dos cards cada
 * vez que se abre el modo.
 */
export function getMasVendidos(limite: number): MasVendido[] {
  const db = getDb()
  const unidades = sql<number>`sum(${detalleVentas.cantidad})`

  return db
    .select({ productoId: productos.id, unidades })
    .from(productos)
    .innerJoin(detalleVentas, eq(detalleVentas.productoId, productos.id))
    .innerJoin(ventas, eq(detalleVentas.ventaId, ventas.id))
    .where(eq(ventas.estado, 'completada'))
    .groupBy(productos.id)
    .orderBy(desc(unidades), asc(productos.nombre))
    .limit(limite)
    .all()
}

export function getMovimientosStock(filtros?: FiltrosMovimientos): MovimientoStock[] {
  const db = getDb()
  const base = db.select().from(movimientosStock)
  const filtrado = filtros?.productoId != null
    ? base.where(eq(movimientosStock.productoId, filtros.productoId))
    : base
  const ordenado = filtrado.orderBy(desc(movimientosStock.fechaHora))

  return (filtros?.limit != null ? ordenado.limit(filtros.limit) : ordenado).all()
}

export function createAjusteStock(data: AjusteStockInput): void {
  const db = getDb()
  const ahora = new Date().toISOString()

  db.transaction((tx) => {
    const filaProducto = tx
      .select({ stockActual: productos.stockActual })
      .from(productos)
      .where(eq(productos.id, data.productoId))
      .get()

    if (!filaProducto) throw new Error('Producto no encontrado')

    const stockAnterior = filaProducto.stockActual
    const delta = data.tipo === 'ajuste_positivo' ? data.cantidad : -data.cantidad
    const stockPosterior = stockAnterior + delta

    if (stockPosterior < 0) throw new Error('El ajuste dejaría stock negativo')

    tx.update(productos)
      .set({ stockActual: stockPosterior, actualizadoEn: ahora })
      .where(eq(productos.id, data.productoId))
      .run()

    tx.insert(movimientosStock)
      .values({
        productoId: data.productoId,
        loteId: null,
        ventaId: null,
        tipo: data.tipo,
        cantidad: data.cantidad,
        stockAnterior,
        stockPosterior,
        motivo: data.motivo,
        fechaHora: ahora,
      })
      .run()
  })
}

/** Suma `costo_unitario * cantidad` de las líneas. El costo va congelado en la línea, no en el producto. */
const COSTO_COBRADO = sql<number>`coalesce(sum(${detalleVentas.costoUnitario} * ${detalleVentas.cantidad}), 0)`

/** Ingreso de las líneas, desde el `subtotal` que `processSale` congeló al vender. */
const MONTO_COBRADO = sql<number>`coalesce(sum(${detalleVentas.subtotal}), 0)`

/**
 * `date(..., 'localtime')` y no `substr(fecha_hora, 1, 10)`.
 *
 * `ventas.fecha_hora` se escribe con `toISOString()`, o sea UTC. Recortar el
 * string agrupa por día UTC, y en Buenos Aires la venta de las 21:30 cae en el
 * día siguiente. Los `DateInput` de la app muestran dd/mm/aaaa local, así que el
 * filtro y el gráfico apuntarían a días distintos.
 */
const DIA_LOCAL = sql<string>`date(${ventas.fechaHora}, 'localtime')`

/**
 * Un resumen de ventas, sus costos y su resultado.
 *
 * Cada agregado va en su propia consulta. `detalle_ventas` es uno-a-varios con
 * `ventas` y `pagos` es uno-a-uno, así que un `join` plano multiplica filas y
 * duplica los montos; solo se une cuando hace falta una columna de la tabla
 * unida (el nombre del producto, el método del pago).
 */
/**
 * Movimientos de stock del período, agrupados por tipo.
 *
 * `entradas`/`salidas` cuentan MOVIMIENTOS, no unidades: para eso está `porTipo`.
 * Cuenta todos los tipos, `venta` y `merma` incluidos: son movimientos de stock
 * reales y el total tiene que cuadrar con el desglose que muestra la pantalla.
 */
function getResumenMovimientos(
  db: ReturnType<typeof getDb>,
  filtros: FiltrosReportes | undefined,
): ResumenMovimientos {
  const condiciones: ReturnType<typeof and>[] = []

  if (filtros?.desde) condiciones.push(gte(movimientosStock.fechaHora, filtros.desde))
  if (filtros?.hasta) condiciones.push(lte(movimientosStock.fechaHora, filtros.hasta))
  const condicion = and(...condiciones)

  const porTipo = db
    .select({
      tipo: movimientosStock.tipo,
      cantidad: sql<number>`count(*)`,
      unidades: sql<number>`coalesce(sum(abs(${movimientosStock.cantidad})), 0)`,
    })
    .from(movimientosStock)
    .where(condicion)
    .groupBy(movimientosStock.tipo)
    .orderBy(asc(movimientosStock.tipo))
    .all()

  const TIPOS_ENTRADA: TipoMovimientoStock[] = ['entrada', 'ajuste_positivo', 'devolucion']
  const porTipoMap = new Map(porTipo.map((fila) => [fila.tipo, fila]))

  const entradas = TIPOS_ENTRADA.reduce(
    (acc, tipo) => acc + (porTipoMap.get(tipo)?.cantidad ?? 0),
    0,
  )

  return {
    cantidad: porTipo.reduce((acc, fila) => acc + fila.cantidad, 0),
    unidades: porTipo.reduce((acc, fila) => acc + fila.unidades, 0),
    entradas,
    salidas: porTipo.reduce((acc, fila) => acc + fila.cantidad, 0) - entradas,
    porTipo,
  }
}

/**
 * Pérdidas por `merma`.
 *
 * Solo `merma`. Un `ajuste_negativo` puede ser una corrección de inventario y
 * una `devolucion` devuelve mercadería vendible: sumarlas mezcla cosas
 * distintas y el número deja de significar "se perdió".
 *
 * El costo sale de `productos.costo` y NO del lote: `movimientos_stock` no
 * congela el costo al momento de la merma, así que esto es "a lo que hoy cuesta",
 * no "lo que salió esa plata ese día".
 */
function getResumenPerdidas(
  db: ReturnType<typeof getDb>,
  filtros: FiltrosReportes | undefined,
): ResumenPerdidas {
  const condiciones: ReturnType<typeof and>[] = [eq(movimientosStock.tipo, 'merma')]

  if (filtros?.desde) condiciones.push(gte(movimientosStock.fechaHora, filtros.desde))
  if (filtros?.hasta) condiciones.push(lte(movimientosStock.fechaHora, filtros.hasta))

  const porProducto = db
    .select({
      productoId: movimientosStock.productoId,
      nombre: sql<string>`coalesce(${productos.nombre}, 'Producto eliminado')`,
      unidades: sql<number>`coalesce(sum(abs(${movimientosStock.cantidad})), 0)`,
      costoUnitario: sql<number>`coalesce(${productos.costo}, 0)`,
      perdido: sql<number>`coalesce(sum(abs(${movimientosStock.cantidad}) * ${productos.costo}), 0)`,
    })
    .from(movimientosStock)
    .leftJoin(productos, eq(movimientosStock.productoId, productos.id))
    .where(and(...condiciones))
    .groupBy(movimientosStock.productoId, productos.nombre, productos.costo)
    .orderBy(desc(sql`sum(abs(${movimientosStock.cantidad}) * ${productos.costo})`))
    .all()

  const totalMermas = db
    .select({
      cantidad: sql<number>`count(*)`,
      unidades: sql<number>`coalesce(sum(abs(${movimientosStock.cantidad})), 0)`,
    })
    .from(movimientosStock)
    .where(and(...condiciones))
    .get()

  return {
    cantidadMermas: totalMermas?.cantidad ?? 0,
    unidadesPerdidas: totalMermas?.unidades ?? 0,
    plataPerdida: porProducto.reduce((acc, fila) => acc + fila.perdido, 0),
    porProducto,
  }
}

/**
 * Cortes de caja cerrados en el período.
 *
 * Filtra por `fecha_cierre` y no por `fecha_apertura`: un turno abierto el 31 y
 * cerrado el 1 pertenece al día en que se cerró, que es cuando se supo cuánto
 * entró. La caja abierta no va acá: no tiene arqueo todavía.
 */
function getResumenCortes(
  db: ReturnType<typeof getDb>,
  filtros: FiltrosReportes | undefined,
): ResumenCortes {
  const condiciones: ReturnType<typeof and>[] = [eq(cajas.estado, 'cerrada')]

  if (filtros?.desde) condiciones.push(gte(cajas.fechaCierre, filtros.desde))
  if (filtros?.hasta) condiciones.push(lte(cajas.fechaCierre, filtros.hasta))

  const cortes = db
    .select({
      id: cajas.id,
      empleadoNombre: empleados.nombre,
      montoInicial: cajas.montoInicial,
      montoEsperado: cajas.montoEsperado,
      montoReal: cajas.montoReal,
      diferencia: cajas.diferencia,
      fechaApertura: cajas.fechaApertura,
      fechaCierre: cajas.fechaCierre,
      observaciones: cajas.observaciones,
    })
    .from(cajas)
    .innerJoin(empleados, eq(cajas.empleadoId, empleados.id))
    .where(and(...condiciones))
    .orderBy(desc(cajas.fechaCierre))
    .all()

  return {
    cantidad: cortes.length,
    diferenciaTotal: cortes.reduce((acc, corte) => acc + (corte.diferencia ?? 0), 0),
    conDescuadre: cortes.filter((corte) => (corte.diferencia ?? 0) !== 0).length,
    cortes,
  }
}

export function getReportesSummary(filtros?: FiltrosReportes): ReportesSummary {
  const db = getDb()
  const condiciones: ReturnType<typeof and>[] = [eq(ventas.estado, 'completada')]

  if (filtros?.desde) condiciones.push(gte(ventas.fechaHora, filtros.desde))
  if (filtros?.hasta) condiciones.push(lte(ventas.fechaHora, filtros.hasta))
  const condicion = and(...condiciones)
  // El resultado reconoce la devolución en la fecha en que se completó, no en la fecha de la venta original.
  const condicionesDevoluciones: ReturnType<typeof and>[] = []
  if (filtros?.desde) condicionesDevoluciones.push(gte(devoluciones.fechaHora, filtros.desde))
  if (filtros?.hasta) condicionesDevoluciones.push(lte(devoluciones.fechaHora, filtros.hasta))
  const condicionDevoluciones = and(...condicionesDevoluciones)

  const resumenDevoluciones = db
    .select({
      cantidad: count(),
      total: sql<number>`coalesce(sum(${devoluciones.total}), 0)`,
      costo: sql<number>`coalesce(sum(${devoluciones.costo}), 0)`,
      gananciaRevertida: sql<number>`coalesce(sum(${devoluciones.gananciaRevertida}), 0)`,
    })
    .from(devoluciones)
    .where(condicionDevoluciones)
    .get()
  const unidadesDevueltas = db
    .select({ unidades: sql<number>`coalesce(sum(${detalleDevoluciones.cantidad}), 0)` })
    .from(detalleDevoluciones)
    .innerJoin(devoluciones, eq(detalleDevoluciones.devolucionId, devoluciones.id))
    .where(condicionDevoluciones)
    .get()?.unidades ?? 0

  const ventasTotales = db
    .select({
      total: sql<number>`coalesce(sum(${ventas.total}), 0)`,
      cantidad: sql<number>`count(*)`,
    })
    .from(ventas)
    .where(condicion)
    .get()

  const costoTotal = db
    .select({ costo: COSTO_COBRADO })
    .from(detalleVentas)
    .innerJoin(ventas, eq(detalleVentas.ventaId, ventas.id))
    .where(condicion)
    .get()

  const metodosBrutos = db
    .select({
      metodo: pagos.metodo,
      monto: sql<number>`coalesce(sum(${pagos.monto}), 0)`,
    })
    .from(pagos)
    .innerJoin(ventas, eq(pagos.ventaId, ventas.id))
    .where(condicion)
    .groupBy(pagos.metodo)
    .all()

  const metodosDevueltos = db
    .select({
      metodo: devolucionMedios.metodo,
      monto: sql<number>`coalesce(sum(${devolucionMedios.monto}), 0)`,
    })
    .from(devolucionMedios)
    .innerJoin(devoluciones, eq(devolucionMedios.devolucionId, devoluciones.id))
    .where(condicionDevoluciones)
    .groupBy(devolucionMedios.metodo)
    .all()
  const montoDevueltoPorMetodo = new Map(metodosDevueltos.map((fila) => [fila.metodo, fila.monto]))
  const filasMetodo = metodosBrutos
    .map((fila) => ({
      ...fila,
      monto: Math.round((fila.monto - (montoDevueltoPorMetodo.get(fila.metodo) ?? 0)) * 100) / 100,
    }))
    .filter((fila) => fila.monto !== 0)

  const vendidosBrutos = db
    .select({
      productoId: detalleVentas.productoId,
      nombre: productos.nombre,
      cantidad: sql<number>`coalesce(sum(${detalleVentas.cantidad}), 0)`,
      monto: MONTO_COBRADO,
      costo: COSTO_COBRADO,
      margen: sql<number>`${MONTO_COBRADO} - ${COSTO_COBRADO}`,
    })
    .from(detalleVentas)
    .innerJoin(ventas, eq(detalleVentas.ventaId, ventas.id))
    .innerJoin(productos, eq(detalleVentas.productoId, productos.id))
    .where(condicion)
    .groupBy(detalleVentas.productoId, productos.nombre)
    .all()

  const devolucionesPorProducto = db
    .select({
      productoId: detalleVentas.productoId,
      nombre: productos.nombre,
      cantidad: sql<number>`coalesce(sum(${detalleDevoluciones.cantidad}), 0)`,
      monto: sql<number>`coalesce(sum(${detalleDevoluciones.importe}), 0)`,
      costo: sql<number>`coalesce(sum(${detalleDevoluciones.costo}), 0)`,
    })
    .from(detalleDevoluciones)
    .innerJoin(devoluciones, eq(detalleDevoluciones.devolucionId, devoluciones.id))
    .innerJoin(detalleVentas, eq(detalleDevoluciones.detalleVentaId, detalleVentas.id))
    .innerJoin(productos, eq(detalleVentas.productoId, productos.id))
    .where(and(condicionDevoluciones, isNotNull(detalleVentas.productoId)))
    .groupBy(detalleVentas.productoId, productos.nombre)
    .all()
  const rankingPorProducto = new Map<number, ProductoRanking>()
  for (const fila of vendidosBrutos) {
    if (fila.productoId !== null) rankingPorProducto.set(fila.productoId, { ...fila })
  }
  for (const fila of devolucionesPorProducto) {
    if (fila.productoId === null) continue
    const ventaNeta = rankingPorProducto.get(fila.productoId) ?? {
      productoId: fila.productoId,
      nombre: fila.nombre,
      cantidad: 0,
      monto: 0,
      costo: 0,
      margen: 0,
    }
    ventaNeta.cantidad -= fila.cantidad
    ventaNeta.monto -= fila.monto
    ventaNeta.costo -= fila.costo
    ventaNeta.margen = ventaNeta.monto - ventaNeta.costo
    rankingPorProducto.set(fila.productoId, ventaNeta)
  }
  const masVendidos = [...rankingPorProducto.values()]
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre))
    .slice(0, filtros?.topProductos ?? 5)

  // La serie diaria va en DOS consultas cruzadas en JS, no en una sola con
  // `join`. `detalle_ventas` duplica cada venta por la cantidad de sus ítems:
  // con `join` plano, una venta de $100 con tres líneas suma $300, y `count(*)`
  // contaría tres ventas donde hubo una. `count(distinct ventas.id)` arregla
  // el conteo pero deja el monto inflado igual, así que el corte va por tabla.
  const diaTotales = db
    .select({
      fecha: DIA_LOCAL,
      ventas: sql<number>`count(*)`,
      total: sql<number>`coalesce(sum(${ventas.total}), 0)`,
    })
    .from(ventas)
    .where(condicion)
    .groupBy(DIA_LOCAL)
    .orderBy(asc(DIA_LOCAL))
    .all()

  const diaItems = db
    .select({
      fecha: DIA_LOCAL,
      unidades: sql<number>`coalesce(sum(${detalleVentas.cantidad}), 0)`,
      costo: COSTO_COBRADO,
    })
    .from(detalleVentas)
    .innerJoin(ventas, eq(detalleVentas.ventaId, ventas.id))
    .where(condicion)
    .groupBy(DIA_LOCAL)
    .orderBy(asc(DIA_LOCAL))
    .all()

  const itemsPorDia = new Map(diaItems.map((fila) => [fila.fecha, fila]))
  const diaDevoluciones = sql<string>`date(${devoluciones.fechaHora}, 'localtime')`
  const devolucionesPorDia = db
    .select({
      fecha: diaDevoluciones,
      unidades: sql<number>`coalesce(sum(${detalleDevoluciones.cantidad}), 0)`,
      total: sql<number>`coalesce(sum(${detalleDevoluciones.importe}), 0)`,
      costo: sql<number>`coalesce(sum(${detalleDevoluciones.costo}), 0)`,
    })
    .from(detalleDevoluciones)
    .innerJoin(devoluciones, eq(detalleDevoluciones.devolucionId, devoluciones.id))
    .where(condicionDevoluciones)
    .groupBy(diaDevoluciones)
    .all()

  const porDia = new Map<string, VentaDiaria>()
  for (const fila of diaTotales) {
    porDia.set(fila.fecha, {
      fecha: fila.fecha,
      ventas: fila.ventas,
      unidades: itemsPorDia.get(fila.fecha)?.unidades ?? 0,
      total: fila.total,
      costo: itemsPorDia.get(fila.fecha)?.costo ?? 0,
    })
  }
  for (const fila of devolucionesPorDia) {
    const previo = porDia.get(fila.fecha) ?? {
      fecha: fila.fecha,
      ventas: 0,
      unidades: 0,
      total: 0,
      costo: 0,
    }
    porDia.set(fila.fecha, {
      ...previo,
      unidades: previo.unidades - fila.unidades,
      total: Math.round((previo.total - fila.total) * 100) / 100,
      costo: Math.round((previo.costo - fila.costo) * 100) / 100,
    })
  }
  const ventasPorDia = [...porDia.values()].sort((a, b) => a.fecha.localeCompare(b.fecha))

  const totalVentas = Math.round(((ventasTotales?.total ?? 0) - (resumenDevoluciones?.total ?? 0)) * 100) / 100
  const totalCosto = Math.round(((costoTotal?.costo ?? 0) - (resumenDevoluciones?.costo ?? 0)) * 100) / 100

  const cajaActiva = db
    .select()
    .from(cajas)
    .where(eq(cajas.estado, 'abierta'))
    .orderBy(desc(cajas.id))
    .get()

  let caja: ReportesSummary['caja'] = {
    cajaId: null,
    montoInicial: 0,
    montoEsperado: 0,
    montoReal: null,
    diferencia: null,
    ventas: 0,
  }

  // A propósito sin `filtros`: el bloque describe la caja abierta ahora mismo,
  // no el período. Aplicarle el rango haría que `montoEsperado` dejara de ser
  // el número con el que `closeCaja` calcula la diferencia, y el arqueo
  // mostraría un esperado que no cuadra con el cierre.
  if (cajaActiva) {
    const resumenCaja = db
      .select({
        monto: sql<number>`coalesce(sum(${ventas.total}), 0)`,
        cantidad: sql<number>`count(*)`,
      })
      .from(ventas)
      .where(and(eq(ventas.cajaId, cajaActiva.id), eq(ventas.estado, 'completada')))
      .get()

    caja = {
      cajaId: cajaActiva.id,
      montoInicial: cajaActiva.montoInicial,
      montoEsperado: montoEsperadoDeCaja(db, cajaActiva.id, cajaActiva.montoInicial),
      montoReal: cajaActiva.montoReal,
      diferencia: cajaActiva.diferencia,
      ventas: resumenCaja?.cantidad ?? 0,
    }
  }

  return {
    caja,
    ventasPorMetodo: filasMetodo,
    productosMasVendidos: masVendidos,
    ventasPorDia,
    totalVentas,
    totalCosto,
    resultado: totalVentas - totalCosto,
    cantVentas: ventasTotales?.cantidad ?? 0,
    movimientos: getResumenMovimientos(db, filtros),
    perdidas: getResumenPerdidas(db, filtros),
    cortes: getResumenCortes(db, filtros),
    devoluciones: {
      cantidad: resumenDevoluciones?.cantidad ?? 0,
      unidades: unidadesDevueltas,
      total: resumenDevoluciones?.total ?? 0,
      costo: resumenDevoluciones?.costo ?? 0,
      gananciaRevertida: resumenDevoluciones?.gananciaRevertida ?? 0,
    },
  }
}
export function updateLote(
  id: number,
  data: {
    fechaVence?: string | null
    costoUnitario?: number
    cantidadActual?: number
    motivo?: string
  },
): Lote {
  const db = getDb()
  const ahora = new Date().toISOString()

  return db.transaction((tx) => {
    const currentLote = tx.select().from(lotes).where(eq(lotes.id, id)).get()
    if (!currentLote) throw new Error('Lote no encontrado')

    const setObj: Record<string, unknown> = {}
    if (data.fechaVence !== undefined) setObj.fechaVence = data.fechaVence
    if (data.costoUnitario !== undefined) setObj.costoUnitario = data.costoUnitario

    if (data.cantidadActual !== undefined && data.cantidadActual !== currentLote.cantidadActual) {
      const producto = tx
        .select({ stockActual: productos.stockActual })
        .from(productos)
        .where(eq(productos.id, currentLote.productoId))
        .get()

      if (!producto) throw new Error('Producto asociado al lote no encontrado')

      const stockAnterior = producto.stockActual
      const delta = data.cantidadActual - currentLote.cantidadActual
      const stockPosterior = stockAnterior + delta

      if (stockPosterior < 0) throw new Error('El ajuste dejaría stock negativo en el producto')

      setObj.cantidadActual = data.cantidadActual

      tx.update(productos)
        .set({ stockActual: stockPosterior, actualizadoEn: ahora })
        .where(eq(productos.id, currentLote.productoId))
        .run()

      tx.insert(movimientosStock)
        .values({
          productoId: currentLote.productoId,
          loteId: id,
          ventaId: null,
          tipo: delta > 0 ? 'ajuste_positivo' : 'ajuste_negativo',
          cantidad: Math.abs(delta),
          stockAnterior,
          stockPosterior,
          motivo: data.motivo || 'Ajuste manual de lote',
          fechaHora: ahora,
        })
        .run()
    }

    const updatedLote = tx
      .update(lotes)
      .set(setObj)
      .where(eq(lotes.id, id))
      .returning()
      .get()

    return updatedLote
  })
}

export function deleteLote(id: number): void {
  const db = getDb()
  const ahora = new Date().toISOString()

  db.transaction((tx) => {
    const currentLote = tx.select().from(lotes).where(eq(lotes.id, id)).get()
    if (!currentLote) throw new Error('Lote no encontrado')

    if (currentLote.cantidadActual > 0) {
      const producto = tx
        .select({ stockActual: productos.stockActual })
        .from(productos)
        .where(eq(productos.id, currentLote.productoId))
        .get()

      if (!producto) throw new Error('Producto asociado al lote no encontrado')

      const stockAnterior = producto.stockActual
      const stockPosterior = stockAnterior - currentLote.cantidadActual

      tx.update(productos)
        .set({ stockActual: stockPosterior, actualizadoEn: ahora })
        .where(eq(productos.id, currentLote.productoId))
        .run()

      tx.insert(movimientosStock)
        .values({
          productoId: currentLote.productoId,
          loteId: null,
          ventaId: null,
          tipo: 'ajuste_negativo',
          cantidad: currentLote.cantidadActual,
          stockAnterior,
          stockPosterior,
          motivo: 'Eliminación de lote',
          fechaHora: ahora,
        })
        .run()
    }

    // Desvincular referencias históricas antes de borrar (FK en SQLite).
    // Se preservan movimientos y detalles de venta; solo se pierde el link al lote.
    tx.update(movimientosStock)
      .set({ loteId: null })
      .where(eq(movimientosStock.loteId, id))
      .run()
    tx.update(detalleVentas)
      .set({ loteId: null })
      .where(eq(detalleVentas.loteId, id))
      .run()

    tx.delete(lotes).where(eq(lotes.id, id)).run()
  })
}

export function crearMovimientoStock(data: CrearMovimientoInput): void {
  const db = getDb()
  const ahora = new Date().toISOString()

  db.transaction((tx) => {
    // 1. Get product stock
    const filaProducto = tx
      .select({ stockActual: productos.stockActual, costo: productos.costo })
      .from(productos)
      .where(eq(productos.id, data.productoId))
      .get()

    if (!filaProducto) throw new Error('Producto no encontrado')

    const stockAnteriorProducto = filaProducto.stockActual
    let stockPosteriorProducto = stockAnteriorProducto
    
    const isEntrada = data.tipo === 'entrada' || data.tipo === 'ajuste_positivo'
    const delta = isEntrada ? data.cantidad : -data.cantidad
    
    stockPosteriorProducto += delta
    if (stockPosteriorProducto < 0) throw new Error('El movimiento dejaría stock negativo en el producto')

    let loteDestinoId = data.loteId || null

    // 2. Handle Lot logic
    if (data.tipo === 'entrada') {
      // Si no se especifica costo, usar el del lote activo (FIFO); si no hay, usar el del producto
      let costoUnitario = data.costoUnitario
      if (costoUnitario === undefined) {
        const loteActivo = tx
          .select({ costoUnitario: lotes.costoUnitario })
          .from(lotes)
          .where(and(eq(lotes.productoId, data.productoId), gt(lotes.cantidadActual, 0)))
          .orderBy(asc(lotes.fechaIngreso), asc(lotes.fechaVence))
          .get()
        costoUnitario = loteActivo?.costoUnitario ?? filaProducto.costo
      }

      // Siempre crear lote nuevo en entrada
      const resultadoLote = tx.insert(lotes).values({
        productoId: data.productoId,
        numeroLote: data.numeroLote || null,
        cantidadInicial: data.cantidad,
        cantidadActual: data.cantidad,
        costoUnitario,
        fechaIngreso: ahora,
        fechaVence: data.fechaVencimiento || null,
        creadoEn: ahora
      }).run()

      loteDestinoId = Number(resultadoLote.lastInsertRowid)
    } else if (loteDestinoId) {
      // Ajustes/Mermas en lote existente
      const filaLote = tx
        .select({ cantidadActual: lotes.cantidadActual })
        .from(lotes)
        .where(eq(lotes.id, loteDestinoId))
        .get()

      if (!filaLote) throw new Error('Lote no encontrado')

      const stockPosteriorLote = filaLote.cantidadActual + delta

      if (stockPosteriorLote < 0) throw new Error('El movimiento dejaría stock negativo en el lote')

      tx.update(lotes)
        .set({ cantidadActual: stockPosteriorLote })
        .where(eq(lotes.id, loteDestinoId))
        .run()
    }

    // 3. Update Product stock
    tx.update(productos)
      .set({ stockActual: stockPosteriorProducto, actualizadoEn: ahora })
      .where(eq(productos.id, data.productoId))
      .run()

    // 4. Record Movimiento
    tx.insert(movimientosStock)
      .values({
        productoId: data.productoId,
        loteId: loteDestinoId,
        ventaId: null,
        tipo: data.tipo,
        cantidad: data.cantidad,
        stockAnterior: stockAnteriorProducto,
        stockPosterior: stockPosteriorProducto,
        motivo: data.motivo || null,
        fechaHora: ahora,
      })
      .run()
  })
}

// ── Cuentas corrientes ────────────────────────────────────────────────────────

/**
 * Solo la parte de la conexión que necesitan las consultas de saldos.
 *
 * Sirve para pasar indistintamente la base abierta o el handle de una
 * transacción: el saldo tiene que poder leerse DENTRO de la transacción del
 * abono, si no la validación corre contra un valor viejo y dos abonos
 * simultáneos validan contra el mismo saldo.
 */
type SelectDb = Pick<ReturnType<typeof getDb>, 'select'>

type ResumenSaldos = {
  clienteId: number
  totalCargos: number
  totalAbonos: number
  totalDevoluciones: number
  totalReintegros: number
  cantidadMovimientos: number
  ultimoMovimiento: string | null
}

/**
 * Saldos agregados por cliente, una fila por cliente que tenga movimientos.
 *
 * El saldo se arma acá y no en la vista porque tiene que ser el mismo número en
 * las dos: si cada capa calculara su propio `cargos - abonos`, el KPI de
 * "total por cobrar" dejaría de cuadrar con la suma de la tabla sin que ningún
 * test se entere.
 */
function saldosPorCliente(db: SelectDb): Map<number, ResumenSaldos> {
  const filas = db
    .select({
      clienteId: cuentasCorrientes.clienteId,
      totalCargos: sql<number>`coalesce(sum(case when ${cuentasCorrientes.tipo} = 'cargo' then ${cuentasCorrientes.monto} else 0 end), 0)`,
      totalAbonos: sql<number>`coalesce(sum(case when ${cuentasCorrientes.tipo} = 'abono' then ${cuentasCorrientes.monto} else 0 end), 0)`,
      totalDevoluciones: sql<number>`coalesce(sum(case when ${cuentasCorrientes.tipo} = 'devolucion' then ${cuentasCorrientes.monto} else 0 end), 0)`,
      totalReintegros: sql<number>`coalesce(sum(case when ${cuentasCorrientes.tipo} = 'reintegro' then ${cuentasCorrientes.monto} else 0 end), 0)`,
      cantidadMovimientos: count(),
      ultimoMovimiento: sql<string | null>`max(${cuentasCorrientes.fechaHora})`,
    })
    .from(cuentasCorrientes)
    .groupBy(cuentasCorrientes.clienteId)
    .all()

  return new Map(filas.map((fila) => [fila.clienteId, fila]))
}

export function getClientes(opciones?: { incluirInactivos?: boolean }): ClienteConSaldo[] {
  const db = getDb()
  const saldos = saldosPorCliente(db)

  const filas = db
    .select()
    .from(clientes)
    .where(opciones?.incluirInactivos ? undefined : eq(clientes.activo, true))
    .orderBy(asc(clientes.nombre))
    .all()

  return filas
    .map((cliente) => {
      const saldo = saldos.get(cliente.id)

      return {
        ...cliente,
        totalCargos: saldo?.totalCargos ?? 0,
        totalAbonos: saldo?.totalAbonos ?? 0,
        totalDevoluciones: saldo?.totalDevoluciones ?? 0,
        totalReintegros: saldo?.totalReintegros ?? 0,
        saldo:
          (saldo?.totalCargos ?? 0) -
          (saldo?.totalAbonos ?? 0) -
          (saldo?.totalDevoluciones ?? 0) +
          (saldo?.totalReintegros ?? 0),
        cantidadMovimientos: saldo?.cantidadMovimientos ?? 0,
        ultimoMovimiento: saldo?.ultimoMovimiento ?? null,
      }
    })
    .sort((a, b) => b.saldo - a.saldo || a.nombre.localeCompare(b.nombre))
}

export function createCliente(input: ClienteInput): Cliente {
  const db = getDb()
  const nombre = input.nombre.trim().replace(/\s+/g, ' ')

  if (!nombre) throw new Error('El nombre del cliente es obligatorio')

  const existente = db
    .select()
    .from(clientes)
    .where(sql`lower(${clientes.nombre}) = lower(${nombre})`)
    .get()

  if (existente) {
    if (existente.activo) throw new Error('Ya existe un cliente con ese nombre')

    // El nombre estaba tomado por un cliente archivado: se reactiva en vez de
    // violar la UNIQUE, conservando el historial de sus movimientos.
    const reactivado = db
      .update(clientes)
      .set({ nombre, telefono: input.telefono ?? null, notas: input.notas ?? null, activo: true })
      .where(eq(clientes.id, existente.id))
      .returning()
      .get()

    return reactivado
  }

  return db
    .insert(clientes)
    .values({
      nombre,
      telefono: input.telefono ?? null,
      notas: input.notas ?? null,
      activo: true,
      creadoEn: new Date().toISOString(),
    })
    .returning()
    .get()
}

export function updateCliente(id: number, input: ClienteInput): void {
  const db = getDb()
  const nombre = input.nombre.trim().replace(/\s+/g, ' ')

  if (!nombre) throw new Error('El nombre del cliente es obligatorio')

  const duplicado = db
    .select({ id: clientes.id })
    .from(clientes)
    .where(and(ne(clientes.id, id), sql`lower(${clientes.nombre}) = lower(${nombre})`))
    .get()

  if (duplicado) throw new Error('Ya existe otro cliente con ese nombre')

  db.update(clientes)
    .set({ nombre, telefono: input.telefono ?? null, notas: input.notas ?? null })
    .where(eq(clientes.id, id))
    .run()
}

/**
 * Se archiva en vez de borrarse: los movimientos del libro mayor son la prueba
 * de la deuda, y sin ellos el historial quedaría huérfano.
 */
export function archivarCliente(id: number): void {
  getDb()
    .update(clientes)
    .set({ activo: false })
    .where(eq(clientes.id, id))
    .run()
}

export function getMovimientosCuentaCorriente(
  filtros?: FiltrosCuentaCorriente,
): MovimientoCuentaCorriente[] {
  const condiciones: SQL[] = []

  if (filtros?.clienteId !== undefined) {
    condiciones.push(eq(cuentasCorrientes.clienteId, filtros.clienteId))
  }
  if (filtros?.desde) condiciones.push(gte(cuentasCorrientes.fechaHora, filtros.desde))
  if (filtros?.hasta) condiciones.push(lte(cuentasCorrientes.fechaHora, filtros.hasta))

  return getDb()
    .select({
      id: cuentasCorrientes.id,
      clienteId: cuentasCorrientes.clienteId,
      tipo: cuentasCorrientes.tipo,
      monto: cuentasCorrientes.monto,
      ventaId: cuentasCorrientes.ventaId,
      metodo: cuentasCorrientes.metodo,
      cajaId: cuentasCorrientes.cajaId,
      abonoOrigenId: cuentasCorrientes.abonoOrigenId,
      nota: cuentasCorrientes.nota,
      fechaHora: cuentasCorrientes.fechaHora,
      clienteNombre: clientes.nombre,
      ventaTotal: ventas.total,
    })
    .from(cuentasCorrientes)
    .innerJoin(clientes, eq(cuentasCorrientes.clienteId, clientes.id))
    .leftJoin(ventas, eq(cuentasCorrientes.ventaId, ventas.id))
    .where(condiciones.length > 0 ? and(...condiciones) : undefined)
    .orderBy(desc(cuentasCorrientes.fechaHora), desc(cuentasCorrientes.id))
    .limit(filtros?.limit ?? 200)
    .all()
}

export function getResumenCuentasCorrientes(): ResumenCuentasCorrientes {
  const db = getDb()

  const totales = db
    .select({
      totalCargos: sql<number>`coalesce(sum(case when ${cuentasCorrientes.tipo} = 'cargo' then ${cuentasCorrientes.monto} else 0 end), 0)`,
      totalAbonos: sql<number>`coalesce(sum(case when ${cuentasCorrientes.tipo} = 'abono' then ${cuentasCorrientes.monto} else 0 end), 0)`,
      totalDevoluciones: sql<number>`coalesce(sum(case when ${cuentasCorrientes.tipo} = 'devolucion' then ${cuentasCorrientes.monto} else 0 end), 0)`,
      totalReintegros: sql<number>`coalesce(sum(case when ${cuentasCorrientes.tipo} = 'reintegro' then ${cuentasCorrientes.monto} else 0 end), 0)`,
    })
    .from(cuentasCorrientes)
    .get()

  const cantidadClientes = db
    .select({ cantidad: count() })
    .from(clientes)
    .where(eq(clientes.activo, true))
    .get()

  const saldos = saldosPorCliente(db)
  let totalPorCobrar = 0
  let clientesConDeuda = 0

  for (const fila of saldos.values()) {
    const saldo = fila.totalCargos - fila.totalAbonos - fila.totalDevoluciones + fila.totalReintegros
    if (saldo > 0) {
      totalPorCobrar += saldo
      clientesConDeuda += 1
    }
  }

  return {
    totalPorCobrar,
    clientesConDeuda,
    clientesActivos: cantidadClientes?.cantidad ?? 0,
    totalCargos: totales?.totalCargos ?? 0,
    totalAbonos: totales?.totalAbonos ?? 0,
    totalDevoluciones: totales?.totalDevoluciones ?? 0,
    totalReintegros: totales?.totalReintegros ?? 0,
  }
}

/**
 * Saldo de un cliente puntual.
 *
 * `saldosPorCliente()` calcula todos con un solo GROUP BY, pero acá hace falta
 * el valor dentro de la transacción del abono.
 */
function saldoDeCliente(db: SelectDb, clienteId: number): number {
  const fila = db
    .select({
      saldo: sql<number>`coalesce(sum(case when ${cuentasCorrientes.tipo} = 'cargo' or ${cuentasCorrientes.tipo} = 'reintegro' then ${cuentasCorrientes.monto} when ${cuentasCorrientes.tipo} = 'abono' or ${cuentasCorrientes.tipo} = 'devolucion' then -${cuentasCorrientes.monto} else 0 end), 0)`,
    })
    .from(cuentasCorrientes)
    .where(eq(cuentasCorrientes.clienteId, clienteId))
    .get()

  return fila?.saldo ?? 0
}

export function registrarAbono(input: AbonoInput): MovimientoCuentaCorriente {
  const db = getDb()
  const monto = Math.round(input.monto * 100) / 100

  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error('El monto del abono tiene que ser mayor a cero')
  }

  if (input.metodo === 'cuenta_corriente') {
    throw new Error('Un abono no se paga en cuenta corriente: eso no saldo ninguna deuda')
  }

  const movimiento = db.transaction((tx) => {
    const cliente = tx
      .select({ id: clientes.id, nombre: clientes.nombre, activo: clientes.activo })
      .from(clientes)
      .where(eq(clientes.id, input.clienteId))
      .get()

    if (!cliente) throw new Error('El cliente no existe')
    if (!cliente.activo) throw new Error(`El cliente ${cliente.nombre} está archivado`)

    const saldo = saldoDeCliente(tx, input.clienteId)

    // Sin sobrepago: el saldo nunca queda negativo, así la columna "deuda" no
    // tiene que significar dos cosas distintas.
    if (monto > saldo + 0.001) {
      throw new Error(
        `El abono supera la deuda de ${cliente.nombre}, que es ${saldo.toFixed(2)}`,
      )
    }

    /*
      Va acá y no antes de abrir la transacción para que un cliente inexistente o
      una deuda ya saldada reporten su propio error y no el de la caja. El
      efectivo del abono entra a la gaveta, así que tiene que quedar atado a una
      caja: sin `cajaId` el arqueo no lo contaría y el cierre mostraría un
      faltante que sí tiene explicación.
    */
    if (input.metodo === 'efectivo' && input.cajaId == null) {
      throw new Error('Un abono en efectivo necesita la caja abierta donde entra la plata')
    }

    return tx
      .insert(cuentasCorrientes)
      .values({
        clienteId: input.clienteId,
        tipo: 'abono',
        monto,
        ventaId: null,
        metodo: input.metodo,
        cajaId: input.cajaId ?? null,
        nota: input.nota?.trim() || null,
        fechaHora: new Date().toISOString(),
      })
      .returning()
      .get()
  })

  return {
    ...movimiento,
    clienteNombre: db
      .select({ nombre: clientes.nombre })
      .from(clientes)
      .where(eq(clientes.id, input.clienteId))
      .get()!.nombre,
    ventaTotal: null,
  }
}

/** Deuda que no viene de una venta del mostrador. */
export function registrarCargoManual(input: CargoManualInput): MovimientoCuentaCorriente {
  const db = getDb()
  const monto = Math.round(input.monto * 100) / 100

  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error('El monto de la deuda tiene que ser mayor a cero')
  }

  const cliente = db
    .select({ nombre: clientes.nombre, activo: clientes.activo })
    .from(clientes)
    .where(eq(clientes.id, input.clienteId))
    .get()

  if (!cliente) throw new Error('El cliente no existe')
  if (!cliente.activo) throw new Error(`El cliente ${cliente.nombre} está archivado`)

  const movimiento = db
    .insert(cuentasCorrientes)
    .values({
      clienteId: input.clienteId,
      tipo: 'cargo',
      monto,
      ventaId: null,
      metodo: null,
      cajaId: null,
      nota: input.nota?.trim() || null,
      fechaHora: new Date().toISOString(),
    })
    .returning()
    .get()

  return { ...movimiento, clienteNombre: cliente.nombre, ventaTotal: null }
}
