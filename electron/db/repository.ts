import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gt,
  gte,
  isNotNull,
  like,
  lt,
  lte,
  ne,
  or,
  sql,
} from 'drizzle-orm'
import { getDb, sha256 } from './index.ts'
import {
  cajas,
  categorias,
  detalleVentas,
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
  AjusteStockInput,
  AperturaCajaInput,
  Caja,
  CajaSummary,
  Categoria,
  CierreCajaInput,
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
  CrearMovimientoInput,
} from './types.ts'

export function verifyPin(pin: string): boolean {
  const db = getDb()
  const fila = db
    .select({ pinHash: seguridadReportes.pinHash })
    .from(seguridadReportes)
    .where(eq(seguridadReportes.id, 1))
    .get()

  if (!fila) return false
  return sha256(pin) === fila.pinHash
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

export function scanProductByCode(codigo: string): Producto | null {
  const db = getDb()
  const fila = db
    .select()
    .from(productos)
    .where(
      or(
        eq(productos.codigoInterno, codigo),
        sql`instr(',' || ${productos.codigosBarras} || ',', ',' || ${codigo} || ',') > 0`,
      ),
    )
    .limit(1)
    .get()

  return fila ?? null
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

  // Vencimiento del lote activo: el lote con stock que vence primero (FEFO).
  // Es el que determina si el producto hoy tiene mercadería vencida; los lotes
  // sin fecha no pueden decidir el vencimiento de la card.
  // Las columnas van calificadas con alias: si no, drizzle las emite sin
  // calificar y SQLite resuelve "id" contra el lote interno, rompiendo la
  // correlación (todas las cards mostraban el mismo vencimiento).
  const loteActivoSubquery = sql<string | null>`
    (
      select l.fecha_vence
      from lotes l
      where l.producto_id = productos.id
        and l.cantidad_actual > 0
        and l.fecha_vence is not null
      order by l.fecha_vence asc
      limit 1
    )
  `

  const selectProductos = {
    ...getTableColumns(productos),
    loteActivoVencimiento: loteActivoSubquery,
  }

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
  if (data.codigosBarras !== undefined) set.codigosBarras = (data.codigosBarras as string | null)?.trim() || null
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

export function getActiveCaja(): Caja | null {
  return getDb()
    .select()
    .from(cajas)
    .where(eq(cajas.estado, 'abierta'))
    .orderBy(desc(cajas.id))
    .get() ?? null
}

export function openCaja(data: AperturaCajaInput): Caja {
  const db = getDb()
  const activa = getActiveCaja()
  if (activa) throw new Error('Ya existe una caja abierta')

  return db
    .insert(cajas)
    .values({
      empleadoId: data.empleadoId,
      montoInicial: data.montoInicial ?? 0,
      estado: 'abierta',
      fechaApertura: new Date().toISOString(),
      observaciones: data.observaciones ?? null,
    })
    .returning()
    .get()
}

export function getCajaSummary(cajaId: number): CajaSummary {
  const db = getDb()
  const resumenVentas = db
    .select({
      totalVentas: sql<number>`coalesce(sum(${ventas.total}), 0)`,
    })
    .from(ventas)
    .where(and(eq(ventas.cajaId, cajaId), eq(ventas.estado, 'completada')))
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

  let totalEfectivo = 0
  let totalTransferencia = 0
  let totalTarjeta = 0

  for (const fila of filasMetodo) {
    if (fila.metodo === 'efectivo') totalEfectivo = fila.monto
    else if (fila.metodo === 'transferencia') totalTransferencia = fila.monto
    else if (fila.metodo === 'debito' || fila.metodo === 'credito') totalTarjeta += fila.monto
  }

  return {
    totalVentas: resumenVentas?.totalVentas ?? 0,
    totalEfectivo,
    totalTransferencia,
    totalTarjeta,
  }
}

export function closeCaja(data: CierreCajaInput): Caja {
  const db = getDb()

  return db.transaction((tx) => {
    const filaCaja = tx.select().from(cajas).where(eq(cajas.id, data.cajaId)).get()
    if (!filaCaja) throw new Error('Caja no encontrada')
    if (filaCaja.estado === 'cerrada') throw new Error('La caja ya está cerrada')

    const resumen = tx
      .select({
        total: sql<number>`coalesce(sum(${ventas.total}), 0)`,
      })
      .from(ventas)
      .where(and(eq(ventas.cajaId, data.cajaId), eq(ventas.estado, 'completada')))
      .get()

    const montoEsperado = filaCaja.montoInicial + (resumen?.total ?? 0)

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
        tx.insert(movimientosStock)
          .values({
            productoId: item.productoId,
            loteId: null,
            ventaId: idVenta,
            tipo: 'venta',
            cantidad: restante,
            stockAnterior: stock,
            stockPosterior: stock - restante,
            motivo: null,
            fechaHora: ahora,
          })
          .run()

        stock -= restante
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

  return consulta.orderBy(desc(ventas.fechaHora)).all()
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

export function getReportesSummary(filtros?: FiltrosReportes): ReportesSummary {
  const db = getDb()
  const condiciones: ReturnType<typeof and>[] = [eq(ventas.estado, 'completada')]

  if (filtros?.desde) condiciones.push(gte(ventas.fechaHora, filtros.desde))
  if (filtros?.hasta) condiciones.push(lte(ventas.fechaHora, filtros.hasta))
  const condicion = and(...condiciones)

  const ventasTotales = db
    .select({
      total: sql<number>`coalesce(sum(${ventas.total}), 0)`,
      cantidad: sql<number>`count(*)`,
    })
    .from(ventas)
    .where(condicion)
    .get()

  const filasMetodo = db
    .select({
      metodo: pagos.metodo,
      monto: sql<number>`coalesce(sum(${pagos.monto}), 0)`,
    })
    .from(pagos)
    .innerJoin(ventas, eq(pagos.ventaId, ventas.id))
    .where(condicion)
    .groupBy(pagos.metodo)
    .all()

  const masVendidos = db
    .select({
      productoId: detalleVentas.productoId,
      nombre: productos.nombre,
      cantidad: sql<number>`coalesce(sum(${detalleVentas.cantidad}), 0)`,
      monto: sql<number>`coalesce(sum(${detalleVentas.subtotal}), 0)`,
    })
    .from(detalleVentas)
    .innerJoin(ventas, eq(detalleVentas.ventaId, ventas.id))
    .innerJoin(productos, eq(detalleVentas.productoId, productos.id))
    .where(condicion)
    .groupBy(detalleVentas.productoId, productos.nombre)
    .orderBy(desc(sql`sum(${detalleVentas.cantidad})`))
    .limit(5)
    .all()

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
      montoEsperado: cajaActiva.montoInicial + (resumenCaja?.monto ?? 0),
      montoReal: cajaActiva.montoReal,
      diferencia: cajaActiva.diferencia,
      ventas: resumenCaja?.cantidad ?? 0,
    }
  }

  return {
    caja,
    ventasPorMetodo: filasMetodo,
    productosMasVendidos: masVendidos,
    totalVentas: ventasTotales?.total ?? 0,
    cantVentas: ventasTotales?.cantidad ?? 0,
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
