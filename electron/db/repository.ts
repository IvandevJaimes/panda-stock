import { and, asc, eq, gt, or, sql } from 'drizzle-orm'
import { getDb, sha256 } from './index.ts'
import {
  detalleVentas,
  lotes,
  movimientosStock,
  pagos,
  productos,
  seguridadReportes,
  ventas,
} from './schema.ts'
import type { ScanProductResult, VentaInput, VentaResult } from './types.ts'

export function scanProductByCode(codigo: string): ScanProductResult | null {
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

  if (!fila) return null

  return {
    id: fila.id,
    categoriaId: fila.categoriaId,
    marcaId: fila.marcaId,
    nombre: fila.nombre,
    codigoInterno: fila.codigoInterno,
    codigosBarras: fila.codigosBarras,
    tipoVenta: fila.tipoVenta,
    unidadMedida: fila.unidadMedida,
    costo: fila.costo,
    porcentajeGanancia: fila.porcentajeGanancia,
    precioVenta: fila.precioVenta,
    precioMayoreo: fila.precioMayoreo,
    stockActual: fila.stockActual,
    stockMinimo: fila.stockMinimo,
    vencimiento: fila.vencimiento,
    activo: fila.activo,
  }
}

export function verifyReportPin(pin: string): boolean {
  const db = getDb()
  const fila = db
    .select({ pinHash: seguridadReportes.pinHash })
    .from(seguridadReportes)
    .where(eq(seguridadReportes.id, 1))
    .get()

  if (!fila) return false
  return sha256(pin) === fila.pinHash
}

export function changeReportPin(pinActual: string, pinNuevo: string): boolean {
  const db = getDb()
  const valido = verifyReportPin(pinActual)
  if (!valido) return false

  db.update(seguridadReportes)
    .set({ pinHash: sha256(pinNuevo), actualizadoEn: new Date().toISOString() })
    .where(eq(seguridadReportes.id, 1))
    .run()

  return true
}

export function processSale(venta: VentaInput): VentaResult {
  const db = getDb()
  const ahora = new Date().toISOString()

  return db.transaction((tx) => {
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

    const ventaId = ventaInsertada.id

    for (const item of venta.items) {
      tx.insert(detalleVentas)
        .values({
          ventaId,
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
            ventaId,
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
            ventaId,
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
          ventaId,
          metodo: pago.metodo,
          monto: pago.monto,
          referencia: pago.referencia,
          fechaHora: ahora,
        })
        .run()
    }

    return { ventaId }
  })
}