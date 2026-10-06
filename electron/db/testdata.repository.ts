import { and, eq, inArray, like, or, sql } from 'drizzle-orm'
import { getDb } from './index.ts'
import {
  cajas,
  categorias,
  detalleVentas,
  empleados,
  lotes,
  marcas,
  movimientosStock,
  pagos,
  productos,
  ventas,
} from './schema.ts'
import type { MetodoPago, TipoMovimientoStock, TipoTarifa } from './types.ts'

export const PREFIJO_PRUEBA = '[PRUEBA] '

export type ResultadoDatosPrueba = {
  productos: number
  ventas: number
  movimientos: number
  cortes: number
  mermas: number
}

/** Días hacia atrás que se siembran, contando hoy como día 0. */
const DIAS_HISTORIA = 45

const CATALOGO: {
  nombre: string
  categoria: string
  costo: number
  precioVenta: number
  stock: number
  /** Probabilidad de merma diaria del producto, de 0 a 1. */
  merma: number
}[] = [
  { nombre: 'Gaseosa 500ml', categoria: 'Bebidas', costo: 120, precioVenta: 300, stock: 180, merma: 0.04 },
  { nombre: 'Agua Mineral 500ml', categoria: 'Bebidas', costo: 60, precioVenta: 150, stock: 240, merma: 0.02 },
  { nombre: 'Cerveza IPA', categoria: 'Bebidas', costo: 480, precioVenta: 950, stock: 72, merma: 0.03 },
  { nombre: 'Galletitas de Avena', categoria: 'Snacks', costo: 210, precioVenta: 480, stock: 96, merma: 0.05 },
  { nombre: 'Papas Fritas', categoria: 'Snacks', costo: 340, precioVenta: 720, stock: 64, merma: 0.06 },
  { nombre: 'Chocolate en Barra', categoria: 'Snacks', costo: 280, precioVenta: 620, stock: 88, merma: 0.02 },
  { nombre: 'Leche Entera 1L', categoria: 'Lácteos', costo: 390, precioVenta: 780, stock: 54, merma: 0.07 },
  { nombre: 'Queso Cremoso', categoria: 'Lácteos', costo: 1250, precioVenta: 2100, stock: 28, merma: 0.04 },
  { nombre: 'Yogur Natural', categoria: 'Lácteos', costo: 450, precioVenta: 890, stock: 40, merma: 0.08 },
  { nombre: 'Pan Marraqueta', categoria: 'Panadería', costo: 150, precioVenta: 350, stock: 120, merma: 0.03 },
  { nombre: 'Medialunas x12', categoria: 'Panadería', costo: 680, precioVenta: 1250, stock: 45, merma: 0.05 },
  { nombre: 'Tortilla de Trigo', categoria: 'Panadería', costo: 320, precioVenta: 600, stock: 70, merma: 0.02 },
]

const MOTIVOS_MERMA = ['Producto roto', 'Vencido', 'Derrame', 'Merma de traslado']

/**
 * Generador pseudoaleatorio con semilla fija.
 *
 * Math.random daría un conjunto distinto en cada ejecución: si un test falla no
 * se puede reproducir, y el borrado no se puede comprobar contra la misma
 * siembra. LCG de 32 bits, suficiente para datos de demostración.
 */
function crearAzar(semilla: number): () => number {
  let estado = semilla >>> 0
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0
    return estado / 0x100000000
  }
}

function elegir<T>(azar: () => number, opciones: readonly T[]): T {
  return opciones[Math.floor(azar() * opciones.length)]!
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100
}

/**
 * Reparte un total entre `partes` pagos de forma que la suma sea EXACTAMENTE el
 * total.
 *
 * Repartir al vuelo deja descuadres de un centavo, y `montoEsperado` del corte
 * se calcula sumando los pagos: ese centavo se propaga a todo el turno y el
 * arqueo termina sin cuadrar nunca. El último pago absorbe el redondeo.
 */
function repartir(total: number, partes: number, azar: () => number): number[] {
  const pesos = Array.from({ length: partes }, () => 0.15 + azar())
  const sumaPesos = pesos.reduce((acc, peso) => acc + peso, 0)
  const montos = pesos.map((peso) => redondear((total * peso) / sumaPesos))
  const anteriores = montos.slice(0, -1).reduce((acc, monto) => acc + monto, 0)
  montos[montos.length - 1] = redondear(total - anteriores)
  return montos
}

/** Fecha ISO en hora local, con `dias` días hacia atrás. */
function momentoAtras(dias: number, hora: number, minuto: number): string {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - dias)
  fecha.setHours(hora, minuto, 0, 0)
  return fecha.toISOString()
}

/**
 * Siembra ventas, movimientos, mermas y cortes de los últimos días.
 *
 * Va entera en una transacción: si algo falla a mitad no queda una base con
 * productos sin ventas, que es el estado en el que los reportes dan números
 * incoherentes.
 *
 * Es acumulativa: sembrar dos veces suma otra tanda. Para limpiar está
 * `borrarDatosPrueba`.
 */
export function generarDatosPrueba(): ResultadoDatosPrueba {
  const db = getDb()
  const azar = crearAzar(20260315)

  return db.transaction((tx) => {
    const resultado: ResultadoDatosPrueba = {
      productos: 0,
      ventas: 0,
      movimientos: 0,
      cortes: 0,
      mermas: 0,
    }

    // ── Cajero de prueba ────────────────────────────────────────────────────
    let empleadoId = tx
      .select({ id: empleados.id })
      .from(empleados)
      .where(like(empleados.nombre, `${PREFIJO_PRUEBA}%`))
      .limit(1)
      .get()?.id

    if (empleadoId === undefined) {
      empleadoId = tx
        .insert(empleados)
        .values({ nombre: `${PREFIJO_PRUEBA}Cajero Demo`, activo: true, creadoEn: new Date().toISOString() })
        .returning({ id: empleados.id })
        .get().id
    }

    /*
      Categorías y marcas se reusan si ya existen y si no quedan en null.
      Crearlas sería meter en el catálogo del negocio filas que el usuario nunca
      pidió, y "borrar datos de prueba" no tiene por qué borrar la categoría
      "Bebidas" de su base.
    */
    const idDe = (tabla: typeof categorias | typeof marcas, nombre: string): number | null =>
      tx.select({ id: tabla.id }).from(tabla).where(eq(tabla.nombre, nombre)).get()?.id ?? null

    // ── Productos y lotes ──────────────────────────────────────────────────
    // Se crean con stock 0: el stock final lo deja el consumo de las ventas y
    // mermas de abajo, que es lo que hace que `stock_actual` sea un número con
    // historia y no un valor arbitrario puesto a mano.
    const items = CATALOGO.map((item, indice) => {
      const nombre = `${PREFIJO_PRUEBA}${item.nombre}`

      const existente = tx
        .select({ id: productos.id, costo: productos.costo, precioVenta: productos.precioVenta })
        .from(productos)
        .where(eq(productos.nombre, nombre))
        .get()

      if (existente) {
        resultado.productos++
        return {
          ...item,
          id: existente.id,
          nombre,
          costo: existente.costo,
          precioVenta: existente.precioVenta,
          loteId: null,
        }
      }

      const creado = tx
        .insert(productos)
        .values({
          categoriaId: idDe(categorias, item.categoria),
          marcaId: null,
          nombre,
          codigoInterno: `PRUEBA${String(indice + 1).padStart(2, '0')}`,
          codigosBarras: `779${String(900000 + indice)}`,
          tipoVenta: 'unidad',
          unidadMedida: 'unidad',
          costo: item.costo,
          porcentajeGanancia: Math.round(((item.precioVenta - item.costo) / item.costo) * 100),
          precioVenta: item.precioVenta,
          stockActual: 0,
          stockMinimo: Math.max(2, Math.round(item.stock * 0.1)),
          activo: true,
          creadoEn: new Date().toISOString(),
        })
        .returning({ id: productos.id })
        .get()

      const lote = tx
        .insert(lotes)
        .values({
          productoId: creado.id,
          fechaIngreso: momentoAtras(DIAS_HISTORIA, 8, 0),
          costoUnitario: item.costo,
          cantidadInicial: item.stock,
          cantidadActual: item.stock,
          creadoEn: new Date().toISOString(),
        })
        .returning({ id: lotes.id })
        .get()

      resultado.productos++
      return { ...item, id: creado.id, nombre, loteId: lote.id }
    })

    // ── Entradas de mercadería ─────────────────────────────────────────────
    const stock = new Map<number, number>()
    for (const item of items) {
      stock.set(item.id, item.stock)

      tx.insert(movimientosStock)
        .values({
          productoId: item.id,
          loteId: item.loteId,
          tipo: 'entrada' satisfies TipoMovimientoStock,
          cantidad: item.stock,
          stockAnterior: 0,
          stockPosterior: item.stock,
          motivo: 'Carga inicial de prueba',
          fechaHora: momentoAtras(DIAS_HISTORIA, 8, 0),
        })
        .run()
      resultado.movimientos++
    }

    // ── Turnos de caja ─────────────────────────────────────────────────────
    const diasCorte: number[] = []
    for (let dias = DIAS_HISTORIA; dias >= 1; dias--) {
      const dia = new Date()
      dia.setDate(dia.getDate() - dias)
      if (dia.getDay() !== 0) diasCorte.push(dias)
    }

    for (const dias of diasCorte) {
      const corte = tx
        .insert(cajas)
        .values({
          empleadoId,
          montoInicial: 2000,
          estado: 'cerrada',
          fechaApertura: momentoAtras(dias, 9, 0),
          fechaCierre: momentoAtras(dias, 19, 30),
          observaciones: `${PREFIJO_PRUEBA}Turno de prueba`,
        })
        .returning({ id: cajas.id })
        .get()

      resultado.cortes++

      // Un producto no puede mermarse dos veces el mismo día: se lleva la
      // cantidad una sola vez por turno.
      const mermaDelDia = new Set<number>()

      const ventasDelTurno = 4 + Math.floor(azar() * 7)
      for (let numero = 0; numero < ventasDelTurno; numero++) {
        const hora = 9 + Math.floor(azar() * 10)
        const minuto = Math.floor(azar() * 60)
        const fechaHora = momentoAtras(dias, Math.min(hora, 19), minuto)

        // ── Líneas de la venta ─────────────────────────────────────────
        const cantidades = new Map<number, number>()
        for (let linea = 0; linea < 1 + Math.floor(azar() * 3); linea++) {
          const item = elegir(azar, items)
          const cantidad = 1 + Math.floor(azar() * 3)
          // El disponible se descuenta contra lo ya apartado en ESTA venta: si
          // el mismo producto cae dos veces en el mismo ticket, sin esto la
          // segunda línea ve stock libre que ya está comprometido y la venta
          // deja el inventario en negativo.
          const apartado = cantidades.get(item.id) ?? 0
          if ((stock.get(item.id) ?? 0) - apartado < cantidad) continue
          cantidades.set(item.id, apartado + cantidad)
        }
        if (cantidades.size === 0) continue

        const detalle = [...cantidades.entries()].map(([productoId, cantidad]) => {
          const item = items.find((p) => p.id === productoId)!
          // Regla de mayoreo derivado: 3 unidades o más, 10% off.
          const mayorista = cantidad >= 3
          const precioUnitario = mayorista ? redondear(item.precioVenta * 0.9) : item.precioVenta

          return {
            productoId,
            loteId: item.loteId,
            tipoTarifa: (mayorista ? 'mayoreo' : 'minorista') as TipoTarifa,
            descripcionItem: item.nombre,
            cantidad,
            precioUnitario,
            costoUnitario: item.costo,
            subtotal: redondear(precioUnitario * cantidad),
          }
        })

        const subtotal = redondear(detalle.reduce((acc, linea) => acc + linea.subtotal, 0))

        const venta = tx
          .insert(ventas)
          .values({
            cajaId: corte.id,
            empleadoId,
            subtotal,
            descuento: 0,
            impuesto: 0,
            total: subtotal,
            estado: 'completada',
            fechaHora,
          })
          .returning({ id: ventas.id })
          .get()

        tx.insert(detalleVentas).values(detalle.map((linea) => ({ ...linea, ventaId: venta.id }))).run()
        resultado.ventas++

        // Efectivo más algún otro medio, como en el mostrador.
        const metodos: MetodoPago[] = ['efectivo']
        if (azar() > 0.35) metodos.push(elegir(azar, ['debito', 'transferencia', 'credito'] as const))
        if (azar() > 0.85) metodos.push('cuenta_corriente')

        const montos = repartir(subtotal, metodos.length, azar)

        tx.insert(pagos)
          .values(metodos.map((metodo, indice) => ({ ventaId: venta.id, metodo, monto: montos[indice]!, fechaHora })))
          .run()

        // ── Mermas del turno ────────────────────────────────────────────
        for (const item of items) {
          if (azar() > item.merma || mermaDelDia.has(item.id)) continue

          const disponible = stock.get(item.id) ?? 0
          if (disponible < 3) continue

          const cantidad = 1 + Math.floor(azar() * 2)
          tx.insert(movimientosStock)
            .values({
              productoId: item.id,
              loteId: item.loteId,
              tipo: 'merma' satisfies TipoMovimientoStock,
              cantidad,
              stockAnterior: disponible,
              stockPosterior: disponible - cantidad,
              motivo: elegir(azar, MOTIVOS_MERMA),
              fechaHora: momentoAtras(dias, Math.min(hora + 1, 19), minuto),
            })
            .run()

          stock.set(item.id, disponible - cantidad)
          mermaDelDia.add(item.id)
          resultado.movimientos++
          resultado.mermas++
        }

        // ── Movimiento de venta ─────────────────────────────────────────
        for (const linea of detalle) {
          const anterior = stock.get(linea.productoId) ?? 0
          const posterior = anterior - linea.cantidad

          tx.insert(movimientosStock)
            .values({
              productoId: linea.productoId,
              loteId: linea.loteId,
              ventaId: venta.id,
              tipo: 'venta' satisfies TipoMovimientoStock,
              cantidad: linea.cantidad,
              stockAnterior: anterior,
              stockPosterior: posterior,
              fechaHora,
            })
            .run()

          stock.set(linea.productoId, posterior)
          resultado.movimientos++
        }
      }

      // ── Arqueo ───────────────────────────────────────────────────────────
      const totalTurno = tx
        .select({ total: sql<number>`coalesce(sum(${ventas.total}), 0)` })
        .from(ventas)
        .where(eq(ventas.cajaId, corte.id))
        .get()?.total ?? 0

      // El descuadre es chico y aleatorio: un desvio grande todos los días no
      // parece un mostrador real.
      const montoEsperado = redondear(2000 + totalTurno)
      const diferencia = Math.round((azar() - 0.55) * 120)

      tx.update(cajas)
        .set({ montoEsperado, montoReal: redondear(montoEsperado + diferencia), diferencia })
        .where(eq(cajas.id, corte.id))
        .run()
    }

    // ── Turno de hoy, abierto ──────────────────────────────────────────────
    // Va aparte de los cerrados para que el resumen de caja activa tenga algo
    // que mostrar y la pestaña de cortes no incluya un turno sin arquear.
    const cajaAbierta = tx
      .select({ id: cajas.id })
      .from(cajas)
      .where(and(eq(cajas.empleadoId, empleadoId), like(cajas.observaciones, `${PREFIJO_PRUEBA}%`), eq(cajas.estado, 'abierta')))
      .limit(1)
      .get()

    if (!cajaAbierta) {
      tx.insert(cajas)
        .values({
          empleadoId,
          montoInicial: 2000,
          estado: 'abierta',
          fechaApertura: momentoAtras(0, 9, 0),
          observaciones: `${PREFIJO_PRUEBA}Turno de prueba`,
        })
        .run()
      resultado.cortes++
    }

    // ── Stock final ────────────────────────────────────────────────────────
    for (const item of items) {
      const restante = stock.get(item.id) ?? 0

      tx.update(productos)
        .set({ stockActual: restante, actualizadoEn: new Date().toISOString() })
        .where(eq(productos.id, item.id))
        .run()

      // El lote tiene que quedar en el mismo remanente que el producto: si
      // `lotes.cantidadActual` se queda en el stock inicial, la venta por
      // lotes consume stock que ya no existe.
      if (item.loteId !== null) {
        tx.update(lotes).set({ cantidadActual: restante }).where(eq(lotes.id, item.loteId)).run()
      }
    }

    return resultado
  })
}

/**
 * Borra lo que creó `generarDatosPrueba`, y nada más.
 *
 * Va por el prefijo del nombre y no por una lista de ids guardada: si se siembra
 * dos veces, el borrado tiene que sacarse las dos tandas.
 *
 * El orden lo imponen las claves foráneas: primero hijas (pagos, líneas,
 * movimientos), después ventas, lotes y productos, y al final cajas y empleados.
 */
export function borrarDatosPrueba(): ResultadoDatosPrueba {
  const db = getDb()
  const patron = `${PREFIJO_PRUEBA}%`

  return db.transaction((tx) => {
    const borrado: ResultadoDatosPrueba = { productos: 0, ventas: 0, movimientos: 0, cortes: 0, mermas: 0 }

    const idsDe = <T extends { id: number }>(filas: T[]): number[] => filas.map((fila) => fila.id)

    const idsProductos = idsDe(tx.select({ id: productos.id }).from(productos).where(like(productos.nombre, patron)).all())
    const idsEmpleados = idsDe(tx.select({ id: empleados.id }).from(empleados).where(like(empleados.nombre, patron)).all())
    const idsCajas = idsDe(tx.select({ id: cajas.id }).from(cajas).where(like(cajas.observaciones, patron)).all())

    // Las ventas de prueba son las de las cajas o el cajero de prueba. El
    // `or` se arma solo con las partes que aplican: `inArray` sobre una lista
    // vacía es un filtro que no matchea nada.
    const filtrosVentas = [
      idsCajas.length > 0 ? inArray(ventas.cajaId, idsCajas) : undefined,
      idsEmpleados.length > 0 ? inArray(ventas.empleadoId, idsEmpleados) : undefined,
    ].filter((f) => f !== undefined)

    const idsVentas = filtrosVentas.length > 0
      ? idsDe(tx.select({ id: ventas.id }).from(ventas).where(or(...filtrosVentas)).all())
      : []

    if (idsVentas.length > 0) {
      const movimientos = tx
        .select({ id: movimientosStock.id })
        .from(movimientosStock)
        .where(inArray(movimientosStock.ventaId, idsVentas))
        .all()

      // Los movimientos que cuelgan de una venta son tipo `venta`, no mermas.
      borrado.movimientos += movimientos.length
      tx.delete(movimientosStock).where(inArray(movimientosStock.ventaId, idsVentas)).run()
      tx.delete(pagos).where(inArray(pagos.ventaId, idsVentas)).run()
      tx.delete(detalleVentas).where(inArray(detalleVentas.ventaId, idsVentas)).run()
      tx.delete(ventas).where(inArray(ventas.id, idsVentas)).run()
      borrado.ventas = idsVentas.length
    }

    if (idsProductos.length > 0) {
      const mermas = tx
        .select({ id: movimientosStock.id })
        .from(movimientosStock)
        .where(and(inArray(movimientosStock.productoId, idsProductos), eq(movimientosStock.tipo, 'merma')))
        .all()

      borrado.mermas += mermas.length
      borrado.movimientos += mermas.length
      tx.delete(movimientosStock).where(inArray(movimientosStock.productoId, idsProductos)).run()
      tx.delete(lotes).where(inArray(lotes.productoId, idsProductos)).run()

      /*
        Si el usuario vendió un producto de prueba desde el mostrador, esa línea
        apunta al producto y al lote que se están por borrar. Se sueltan ambas
        referencias en vez de eliminar la venta real: la línea conserva
        `descripcionItem`, precio y cantidad, así que el historial sigue
        mostrando qué se vendió.
      */
      tx.update(detalleVentas)
        .set({ productoId: null, loteId: null })
        .where(inArray(detalleVentas.productoId, idsProductos))
        .run()
      borrado.productos = idsProductos.length
      tx.delete(productos).where(inArray(productos.id, idsProductos)).run()
    }

    if (idsCajas.length > 0) {
      borrado.cortes = idsCajas.length
      tx.delete(cajas).where(inArray(cajas.id, idsCajas)).run()
    }

    if (idsEmpleados.length > 0) {
      tx.delete(empleados).where(inArray(empleados.id, idsEmpleados)).run()
    }

    return borrado
  })
}

/** ¿Hay datos de prueba sembrados? Evita ofrecer "borrar" cuando no hay nada. */
export function hayDatosPrueba(): boolean {
  return (
    getDb()
      .select({ id: productos.id })
      .from(productos)
      .where(like(productos.nombre, `${PREFIJO_PRUEBA}%`))
      .limit(1)
      .all().length > 0
  )
}