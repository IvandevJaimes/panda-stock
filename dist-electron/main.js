import { createRequire } from "node:module";
import { BrowserWindow, Menu, app, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { and, asc, desc, eq, gt, gte, isNotNull, like, lte, or, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
//#endregion
//#region electron/db/schema.ts
var schema_exports = /* @__PURE__ */ __exportAll({
	cajas: () => cajas,
	categorias: () => categorias,
	detalleVentas: () => detalleVentas,
	empleados: () => empleados,
	lotes: () => lotes,
	marcas: () => marcas,
	movimientosStock: () => movimientosStock,
	pagos: () => pagos,
	productos: () => productos,
	seguridadReportes: () => seguridadReportes,
	ventas: () => ventas
});
var seguridadReportes = sqliteTable("seguridad_reportes", {
	id: integer("id").primaryKey(),
	pinHash: text("pin_hash").notNull(),
	actualizadoEn: text("actualizado_en").notNull()
});
var empleados = sqliteTable("empleados", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	nombre: text("nombre").notNull(),
	activo: integer("activo", { mode: "boolean" }).notNull().default(true),
	creadoEn: text("creado_en").notNull()
});
var categorias = sqliteTable("categorias", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	nombre: text("nombre").notNull().unique(),
	activo: integer("activo", { mode: "boolean" }).notNull().default(true)
});
var marcas = sqliteTable("marcas", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	nombre: text("nombre").notNull().unique(),
	activo: integer("activo", { mode: "boolean" }).notNull().default(true)
});
var productos = sqliteTable("productos", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	categoriaId: integer("categoria_id").references(() => categorias.id),
	marcaId: integer("marca_id").references(() => marcas.id),
	nombre: text("nombre").notNull(),
	codigoInterno: text("codigo_interno").notNull(),
	codigosBarras: text("codigos_barras"),
	tipoVenta: text("tipo_venta").$type().notNull().default("unidad"),
	unidadMedida: text("unidad_medida").$type().notNull().default("unidad"),
	costo: real("costo").notNull().default(0),
	porcentajeGanancia: real("porcentaje_ganancia").notNull().default(0),
	precioVenta: real("precio_venta").notNull().default(0),
	precioMayoreo: real("precio_mayoreo").notNull().default(0),
	stockActual: real("stock_actual").notNull().default(0),
	stockMinimo: real("stock_minimo").notNull().default(0),
	vencimiento: text("vencimiento"),
	activo: integer("activo", { mode: "boolean" }).notNull().default(true),
	creadoEn: text("creado_en").notNull(),
	actualizadoEn: text("actualizado_en")
}, (table) => [uniqueIndex("productos_codigo_interno_unique").on(table.codigoInterno)]);
var lotes = sqliteTable("lotes", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	productoId: integer("producto_id").notNull().references(() => productos.id),
	numeroLote: text("numero_lote"),
	fechaIngreso: text("fecha_ingreso").notNull(),
	fechaVence: text("fecha_vence"),
	costoUnitario: real("costo_unitario").notNull().default(0),
	cantidadInicial: real("cantidad_inicial").notNull(),
	cantidadActual: real("cantidad_actual").notNull(),
	creadoEn: text("creado_en").notNull()
}, (table) => [index("lotes_producto_id_idx").on(table.productoId)]);
var cajas = sqliteTable("cajas", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	empleadoId: integer("empleado_id").notNull().references(() => empleados.id),
	montoInicial: real("monto_inicial").notNull().default(0),
	montoEsperado: real("monto_esperado"),
	montoReal: real("monto_real"),
	diferencia: real("diferencia"),
	estado: text("estado").$type().notNull().default("abierta"),
	fechaApertura: text("fecha_apertura"),
	fechaCierre: text("fecha_cierre"),
	observaciones: text("observaciones")
});
var ventas = sqliteTable("ventas", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	cajaId: integer("caja_id").references(() => cajas.id),
	empleadoId: integer("empleado_id").notNull().references(() => empleados.id),
	subtotal: real("subtotal").notNull().default(0),
	descuento: real("descuento").notNull().default(0),
	impuesto: real("impuesto").notNull().default(0),
	total: real("total").notNull(),
	estado: text("estado").$type().notNull().default("completada"),
	fechaHora: text("fecha_hora").notNull()
});
var detalleVentas = sqliteTable("detalle_ventas", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	ventaId: integer("venta_id").notNull().references(() => ventas.id),
	productoId: integer("producto_id").references(() => productos.id),
	loteId: integer("lote_id").references(() => lotes.id),
	tipoTarifa: text("tipo_tarifa").$type().notNull().default("minorista"),
	descripcionItem: text("descripcion_item").notNull(),
	cantidad: real("cantidad").notNull(),
	precioUnitario: real("precio_unitario").notNull(),
	costoUnitario: real("costo_unitario").notNull(),
	subtotal: real("subtotal").notNull()
});
var pagos = sqliteTable("pagos", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	ventaId: integer("venta_id").notNull().references(() => ventas.id),
	metodo: text("metodo").$type().notNull(),
	monto: real("monto").notNull(),
	referencia: text("referencia"),
	fechaHora: text("fecha_hora").notNull()
});
var movimientosStock = sqliteTable("movimientos_stock", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	productoId: integer("producto_id").notNull().references(() => productos.id),
	loteId: integer("lote_id").references(() => lotes.id),
	ventaId: integer("venta_id").references(() => ventas.id),
	tipo: text("tipo").$type().notNull(),
	cantidad: real("cantidad").notNull(),
	stockAnterior: real("stock_anterior"),
	stockPosterior: real("stock_posterior"),
	motivo: text("motivo"),
	fechaHora: text("fecha_hora").notNull()
}, (table) => [index("movimientos_stock_producto_id_idx").on(table.productoId)]);
//#endregion
//#region electron/db/index.ts
var app$1 = createRequire(import.meta.url)("electron").app;
var sqlite = null;
var database = null;
function sha256(text) {
	return createHash("sha256").update(text).digest("hex");
}
function getDb() {
	if (!database) throw new Error("Base de datos no inicializada. Ejecuta initDatabase() primero.");
	return database;
}
function getDbPath() {
	if (process.env.PANDA_STOCK_DB) return process.env.PANDA_STOCK_DB;
	if (!app$1?.getPath) return path.join(process.cwd(), "data", "panda_stock.db");
	return path.join(app$1.getPath("userData"), "panda_stock.db");
}
function initDatabase() {
	if (sqlite) return;
	const dbPath = getDbPath();
	sqlite = new Database(dbPath);
	sqlite.pragma("journal_mode = WAL");
	sqlite.pragma("foreign_keys = ON");
	database = drizzle(sqlite, { schema: schema_exports });
	const migrationsBundled = path.join(import.meta.dirname, "../electron/db/migrations");
	const migrationsFuente = path.join(import.meta.dirname, "migrations");
	const migrationsFolder = existsSync(migrationsBundled) ? migrationsBundled : migrationsFuente;
	migrate(database, { migrationsFolder });
	const ahora = (/* @__PURE__ */ new Date()).toISOString();
	if (!database.select({ id: seguridadReportes.id }).from(seguridadReportes).where(eq(seguridadReportes.id, 1)).get()) database.insert(seguridadReportes).values({
		id: 1,
		pinHash: sha256("1234"),
		actualizadoEn: ahora
	}).run();
}
//#endregion
//#region electron/db/repository.ts
function verifyPin(pin) {
	const fila = getDb().select({ pinHash: seguridadReportes.pinHash }).from(seguridadReportes).where(eq(seguridadReportes.id, 1)).get();
	if (!fila) return false;
	return sha256(pin) === fila.pinHash;
}
function changePin(pinActual, pinNuevo) {
	const db = getDb();
	if (!verifyPin(pinActual)) return false;
	db.update(seguridadReportes).set({
		pinHash: sha256(pinNuevo),
		actualizadoEn: (/* @__PURE__ */ new Date()).toISOString()
	}).where(eq(seguridadReportes.id, 1)).run();
	return true;
}
function getEmpleados() {
	return getDb().select().from(empleados).orderBy(asc(empleados.nombre)).all();
}
function createEmpleado(data) {
	return getDb().insert(empleados).values({
		nombre: data.nombre,
		activo: true,
		creadoEn: (/* @__PURE__ */ new Date()).toISOString()
	}).returning().get();
}
function toggleEmpleado(id, activo) {
	getDb().update(empleados).set({ activo }).where(eq(empleados.id, id)).run();
}
function getCategorias() {
	return getDb().select().from(categorias).orderBy(asc(categorias.nombre)).all();
}
function createCategoria(nombre) {
	return getDb().insert(categorias).values({
		nombre,
		activo: true
	}).returning().get();
}
function updateCategoria(id, nombre) {
	getDb().update(categorias).set({ nombre }).where(eq(categorias.id, id)).run();
}
function deleteCategoria(id) {
	getDb().update(categorias).set({ activo: false }).where(eq(categorias.id, id)).run();
}
function getMarcas() {
	return getDb().select().from(marcas).orderBy(asc(marcas.nombre)).all();
}
function createMarca(nombre) {
	return getDb().insert(marcas).values({
		nombre,
		activo: true
	}).returning().get();
}
function updateMarca(id, nombre) {
	getDb().update(marcas).set({ nombre }).where(eq(marcas.id, id)).run();
}
function deleteMarca(id) {
	getDb().update(marcas).set({ activo: false }).where(eq(marcas.id, id)).run();
}
function scanProductByCode(codigo) {
	return getDb().select().from(productos).where(or(eq(productos.codigoInterno, codigo), sql`instr(',' || ${productos.codigosBarras} || ',', ',' || ${codigo} || ',') > 0`)).limit(1).get() ?? null;
}
function getProductos(filtros) {
	const db = getDb();
	const condiciones = [];
	if (filtros?.search?.trim()) {
		const q = `%${filtros.search.trim()}%`;
		condiciones.push(or(like(productos.nombre, q), like(productos.codigoInterno, q), like(productos.codigosBarras, q)));
	}
	if (filtros?.categoriaId != null) condiciones.push(eq(productos.categoriaId, filtros.categoriaId));
	if (filtros?.marcaId != null) condiciones.push(eq(productos.marcaId, filtros.marcaId));
	if (filtros?.bajoStock) condiciones.push(lte(productos.stockActual, productos.stockMinimo));
	const condicion = and(...condiciones);
	return (condicion ? db.select().from(productos).where(condicion) : db.select().from(productos)).orderBy(asc(productos.nombre)).all();
}
function getProductoById(id) {
	return getDb().select().from(productos).where(eq(productos.id, id)).get() ?? null;
}
function mapNuevoProducto(data) {
	const ahora = (/* @__PURE__ */ new Date()).toISOString();
	return {
		categoriaId: data.categoriaId ?? null,
		marcaId: data.marcaId ?? null,
		nombre: data.nombre,
		codigoInterno: data.codigoInterno,
		codigosBarras: data.codigosBarras?.trim() || null,
		tipoVenta: data.tipoVenta ?? "unidad",
		unidadMedida: data.unidadMedida ?? "unidad",
		costo: data.costo ?? 0,
		porcentajeGanancia: data.porcentajeGanancia ?? 0,
		precioVenta: data.precioVenta ?? 0,
		precioMayoreo: data.precioMayoreo ?? 0,
		stockMinimo: data.stockMinimo ?? 0,
		vencimiento: data.vencimiento ?? null,
		activo: true,
		creadoEn: ahora
	};
}
function createProducto(data) {
	return getDb().insert(productos).values(mapNuevoProducto(data)).returning().get();
}
function updateProducto(id, data) {
	const db = getDb();
	const set = { actualizadoEn: (/* @__PURE__ */ new Date()).toISOString() };
	if (data.nombre !== void 0) set.nombre = data.nombre;
	if (data.codigoInterno !== void 0) set.codigoInterno = data.codigoInterno;
	if (data.codigosBarras !== void 0) set.codigosBarras = data.codigosBarras?.trim() || null;
	if (data.categoriaId !== void 0) set.categoriaId = data.categoriaId;
	if (data.marcaId !== void 0) set.marcaId = data.marcaId;
	if (data.tipoVenta !== void 0) set.tipoVenta = data.tipoVenta;
	if (data.unidadMedida !== void 0) set.unidadMedida = data.unidadMedida;
	if (data.costo !== void 0) set.costo = data.costo;
	if (data.porcentajeGanancia !== void 0) set.porcentajeGanancia = data.porcentajeGanancia;
	if (data.precioVenta !== void 0) set.precioVenta = data.precioVenta;
	if (data.precioMayoreo !== void 0) set.precioMayoreo = data.precioMayoreo;
	if (data.stockMinimo !== void 0) set.stockMinimo = data.stockMinimo;
	if (data.vencimiento !== void 0) set.vencimiento = data.vencimiento ?? null;
	const fila = db.update(productos).set(set).where(eq(productos.id, id)).returning().get();
	if (!fila) throw new Error("Producto no encontrado");
	return fila;
}
function deleteProducto(id) {
	getDb().update(productos).set({
		activo: false,
		actualizadoEn: (/* @__PURE__ */ new Date()).toISOString()
	}).where(eq(productos.id, id)).run();
}
function getAlertasStock() {
	return getDb().select().from(productos).where(and(lte(productos.stockActual, productos.stockMinimo), eq(productos.activo, true))).orderBy(asc(productos.stockActual)).all();
}
function getLotesByProducto(productoId) {
	return getDb().select().from(lotes).where(eq(lotes.productoId, productoId)).orderBy(asc(lotes.fechaIngreso)).all();
}
function createLote(data) {
	const db = getDb();
	const ahora = (/* @__PURE__ */ new Date()).toISOString();
	return db.transaction((tx) => {
		const filaProducto = tx.select({ stockActual: productos.stockActual }).from(productos).where(eq(productos.id, data.productoId)).get();
		if (!filaProducto) throw new Error("Producto no encontrado");
		const stockAnterior = filaProducto.stockActual;
		const stockPosterior = stockAnterior + data.cantidadInicial;
		const lote = tx.insert(lotes).values({
			productoId: data.productoId,
			numeroLote: data.numeroLote ?? null,
			fechaIngreso: data.fechaIngreso,
			fechaVence: data.fechaVence ?? null,
			costoUnitario: data.costoUnitario ?? 0,
			cantidadInicial: data.cantidadInicial,
			cantidadActual: data.cantidadInicial,
			creadoEn: ahora
		}).returning().get();
		tx.update(productos).set({
			stockActual: stockPosterior,
			actualizadoEn: ahora
		}).where(eq(productos.id, data.productoId)).run();
		tx.insert(movimientosStock).values({
			productoId: data.productoId,
			loteId: lote.id,
			ventaId: null,
			tipo: "entrada",
			cantidad: data.cantidadInicial,
			stockAnterior,
			stockPosterior,
			motivo: "Ingreso de mercadería",
			fechaHora: ahora
		}).run();
		return lote;
	});
}
function getLotesPorVencer(diasLimite) {
	const limite = new Date(Date.now() + diasLimite * 24 * 60 * 60 * 1e3).toISOString();
	return getDb().select().from(lotes).where(and(isNotNull(lotes.fechaVence), lte(lotes.fechaVence, limite), gt(lotes.cantidadActual, 0))).orderBy(asc(lotes.fechaVence)).all();
}
function getActiveCaja() {
	return getDb().select().from(cajas).where(eq(cajas.estado, "abierta")).orderBy(desc(cajas.id)).get() ?? null;
}
function openCaja(data) {
	const db = getDb();
	if (getActiveCaja()) throw new Error("Ya existe una caja abierta");
	return db.insert(cajas).values({
		empleadoId: data.empleadoId,
		montoInicial: data.montoInicial ?? 0,
		estado: "abierta",
		fechaApertura: (/* @__PURE__ */ new Date()).toISOString(),
		observaciones: data.observaciones ?? null
	}).returning().get();
}
function getCajaSummary(cajaId) {
	const db = getDb();
	const resumenVentas = db.select({ totalVentas: sql`coalesce(sum(${ventas.total}), 0)` }).from(ventas).where(and(eq(ventas.cajaId, cajaId), eq(ventas.estado, "completada"))).get();
	const filasMetodo = db.select({
		metodo: pagos.metodo,
		monto: sql`coalesce(sum(${pagos.monto}), 0)`
	}).from(pagos).innerJoin(ventas, eq(pagos.ventaId, ventas.id)).where(and(eq(ventas.cajaId, cajaId), eq(ventas.estado, "completada"))).groupBy(pagos.metodo).all();
	let totalEfectivo = 0;
	let totalTransferencia = 0;
	let totalTarjeta = 0;
	for (const fila of filasMetodo) if (fila.metodo === "efectivo") totalEfectivo = fila.monto;
	else if (fila.metodo === "transferencia") totalTransferencia = fila.monto;
	else if (fila.metodo === "debito" || fila.metodo === "credito") totalTarjeta += fila.monto;
	return {
		totalVentas: resumenVentas?.totalVentas ?? 0,
		totalEfectivo,
		totalTransferencia,
		totalTarjeta
	};
}
function closeCaja(data) {
	return getDb().transaction((tx) => {
		const filaCaja = tx.select().from(cajas).where(eq(cajas.id, data.cajaId)).get();
		if (!filaCaja) throw new Error("Caja no encontrada");
		if (filaCaja.estado === "cerrada") throw new Error("La caja ya está cerrada");
		const resumen = tx.select({ total: sql`coalesce(sum(${ventas.total}), 0)` }).from(ventas).where(and(eq(ventas.cajaId, data.cajaId), eq(ventas.estado, "completada"))).get();
		const montoEsperado = filaCaja.montoInicial + (resumen?.total ?? 0);
		return tx.update(cajas).set({
			montoEsperado,
			montoReal: data.montoReal,
			diferencia: data.montoReal - montoEsperado,
			estado: "cerrada",
			fechaCierre: (/* @__PURE__ */ new Date()).toISOString(),
			observaciones: data.observaciones ?? filaCaja.observaciones
		}).where(eq(cajas.id, data.cajaId)).returning().get();
	});
}
function processSale(venta) {
	const db = getDb();
	const ahora = (/* @__PURE__ */ new Date()).toISOString();
	return {
		success: true,
		ventaId: db.transaction((tx) => {
			const idVenta = tx.insert(ventas).values({
				cajaId: venta.cajaId,
				empleadoId: venta.empleadoId,
				subtotal: venta.subtotal,
				descuento: venta.descuento,
				impuesto: venta.impuesto,
				total: venta.total,
				estado: "completada",
				fechaHora: ahora
			}).returning({ id: ventas.id }).get().id;
			for (const item of venta.items) {
				tx.insert(detalleVentas).values({
					ventaId: idVenta,
					productoId: item.productoId,
					tipoTarifa: item.tipoTarifa,
					descripcionItem: item.descripcionItem,
					cantidad: item.cantidad,
					precioUnitario: item.precioUnitario,
					costoUnitario: item.costoUnitario,
					subtotal: item.precioUnitario * item.cantidad
				}).run();
				if (item.productoId == null) continue;
				let stock = tx.select({ stockActual: productos.stockActual }).from(productos).where(eq(productos.id, item.productoId)).get()?.stockActual ?? 0;
				const filasLote = tx.select().from(lotes).where(and(eq(lotes.productoId, item.productoId), gt(lotes.cantidadActual, 0))).orderBy(asc(lotes.fechaIngreso), asc(lotes.fechaVence)).all();
				let restante = item.cantidad;
				for (const lote of filasLote) {
					if (restante <= 0) break;
					const descontado = Math.min(lote.cantidadActual, restante);
					tx.update(lotes).set({ cantidadActual: lote.cantidadActual - descontado }).where(eq(lotes.id, lote.id)).run();
					tx.insert(movimientosStock).values({
						productoId: item.productoId,
						loteId: lote.id,
						ventaId: idVenta,
						tipo: "venta",
						cantidad: descontado,
						stockAnterior: stock,
						stockPosterior: stock - descontado,
						motivo: null,
						fechaHora: ahora
					}).run();
					stock -= descontado;
					restante -= descontado;
				}
				if (restante > 0) {
					tx.insert(movimientosStock).values({
						productoId: item.productoId,
						loteId: null,
						ventaId: idVenta,
						tipo: "venta",
						cantidad: restante,
						stockAnterior: stock,
						stockPosterior: stock - restante,
						motivo: null,
						fechaHora: ahora
					}).run();
					stock -= restante;
				}
				tx.update(productos).set({
					stockActual: stock,
					actualizadoEn: ahora
				}).where(eq(productos.id, item.productoId)).run();
			}
			for (const pago of venta.pagos) tx.insert(pagos).values({
				ventaId: idVenta,
				metodo: pago.metodo,
				monto: pago.monto,
				referencia: pago.referencia ?? null,
				fechaHora: ahora
			}).run();
			return idVenta;
		})
	};
}
function getVentas(filtros) {
	const db = getDb();
	const condiciones = [];
	if (filtros?.desde) condiciones.push(gte(ventas.fechaHora, filtros.desde));
	if (filtros?.hasta) condiciones.push(lte(ventas.fechaHora, filtros.hasta));
	if (filtros?.cajaId != null) condiciones.push(eq(ventas.cajaId, filtros.cajaId));
	const condicion = and(...condiciones);
	return (condicion ? db.select().from(ventas).where(condicion) : db.select().from(ventas)).orderBy(desc(ventas.fechaHora)).all();
}
function getVentaDetalle(idVenta) {
	const db = getDb();
	const filaVenta = db.select().from(ventas).where(eq(ventas.id, idVenta)).get();
	if (!filaVenta) return null;
	return {
		venta: filaVenta,
		items: db.select().from(detalleVentas).where(eq(detalleVentas.ventaId, idVenta)).orderBy(asc(detalleVentas.id)).all(),
		pagos: db.select().from(pagos).where(eq(pagos.ventaId, idVenta)).orderBy(asc(pagos.id)).all()
	};
}
function getMovimientosStock(filtros) {
	const base = getDb().select().from(movimientosStock);
	const ordenado = (filtros?.productoId != null ? base.where(eq(movimientosStock.productoId, filtros.productoId)) : base).orderBy(desc(movimientosStock.fechaHora));
	return (filtros?.limit != null ? ordenado.limit(filtros.limit) : ordenado).all();
}
function createAjusteStock(data) {
	const db = getDb();
	const ahora = (/* @__PURE__ */ new Date()).toISOString();
	db.transaction((tx) => {
		const filaProducto = tx.select({ stockActual: productos.stockActual }).from(productos).where(eq(productos.id, data.productoId)).get();
		if (!filaProducto) throw new Error("Producto no encontrado");
		const stockAnterior = filaProducto.stockActual;
		const stockPosterior = stockAnterior + (data.tipo === "ajuste_positivo" ? data.cantidad : -data.cantidad);
		if (stockPosterior < 0) throw new Error("El ajuste dejaría stock negativo");
		tx.update(productos).set({
			stockActual: stockPosterior,
			actualizadoEn: ahora
		}).where(eq(productos.id, data.productoId)).run();
		tx.insert(movimientosStock).values({
			productoId: data.productoId,
			loteId: null,
			ventaId: null,
			tipo: data.tipo,
			cantidad: data.cantidad,
			stockAnterior,
			stockPosterior,
			motivo: data.motivo,
			fechaHora: ahora
		}).run();
	});
}
function getReportesSummary(filtros) {
	const db = getDb();
	const condiciones = [eq(ventas.estado, "completada")];
	if (filtros?.desde) condiciones.push(gte(ventas.fechaHora, filtros.desde));
	if (filtros?.hasta) condiciones.push(lte(ventas.fechaHora, filtros.hasta));
	const condicion = and(...condiciones);
	const ventasTotales = db.select({
		total: sql`coalesce(sum(${ventas.total}), 0)`,
		cantidad: sql`count(*)`
	}).from(ventas).where(condicion).get();
	const filasMetodo = db.select({
		metodo: pagos.metodo,
		monto: sql`coalesce(sum(${pagos.monto}), 0)`
	}).from(pagos).innerJoin(ventas, eq(pagos.ventaId, ventas.id)).where(condicion).groupBy(pagos.metodo).all();
	const masVendidos = db.select({
		productoId: detalleVentas.productoId,
		nombre: productos.nombre,
		cantidad: sql`coalesce(sum(${detalleVentas.cantidad}), 0)`,
		monto: sql`coalesce(sum(${detalleVentas.subtotal}), 0)`
	}).from(detalleVentas).innerJoin(ventas, eq(detalleVentas.ventaId, ventas.id)).innerJoin(productos, eq(detalleVentas.productoId, productos.id)).where(condicion).groupBy(detalleVentas.productoId, productos.nombre).orderBy(desc(sql`sum(${detalleVentas.cantidad})`)).limit(5).all();
	const cajaActiva = db.select().from(cajas).where(eq(cajas.estado, "abierta")).orderBy(desc(cajas.id)).get();
	let caja = {
		cajaId: null,
		montoInicial: 0,
		montoEsperado: 0,
		montoReal: null,
		diferencia: null,
		ventas: 0
	};
	if (cajaActiva) {
		const resumenCaja = db.select({
			monto: sql`coalesce(sum(${ventas.total}), 0)`,
			cantidad: sql`count(*)`
		}).from(ventas).where(and(eq(ventas.cajaId, cajaActiva.id), eq(ventas.estado, "completada"))).get();
		caja = {
			cajaId: cajaActiva.id,
			montoInicial: cajaActiva.montoInicial,
			montoEsperado: cajaActiva.montoInicial + (resumenCaja?.monto ?? 0),
			montoReal: cajaActiva.montoReal,
			diferencia: cajaActiva.diferencia,
			ventas: resumenCaja?.cantidad ?? 0
		};
	}
	return {
		caja,
		ventasPorMetodo: filasMetodo,
		productosMasVendidos: masVendidos,
		totalVentas: ventasTotales?.total ?? 0,
		cantVentas: ventasTotales?.cantidad ?? 0
	};
}
//#endregion
//#region electron/main.ts
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var isDev = !app.isPackaged;
function createWindow() {
	const win = new BrowserWindow({
		width: 1440,
		height: 900,
		minWidth: 480,
		minHeight: 700,
		resizable: true,
		autoHideMenuBar: true,
		webPreferences: {
			preload: path.join(__dirname, "../dist-electron/preload.cjs"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true
		}
	});
	win.setMenu(null);
	win.webContents.on("before-input-event", (_event, input) => {
		if (input.type === "keyDown" && input.key === "F12" && isDev) {
			_event.preventDefault();
			win.webContents.toggleDevTools();
		}
	});
	if (isDev) win.loadURL("http://localhost:5173");
	else win.loadFile(path.join(__dirname, "../dist/index.html"));
}
function registerIpcHandlers() {
	ipcMain.handle("seguridad:verify-pin", (_event, pin) => verifyPin(pin));
	ipcMain.handle("seguridad:change-pin", (_event, pinActual, pinNuevo) => changePin(pinActual, pinNuevo));
	ipcMain.handle("empleados:get-all", () => getEmpleados());
	ipcMain.handle("empleados:create", (_event, data) => createEmpleado(data));
	ipcMain.handle("empleados:toggle", (_event, id, activo) => toggleEmpleado(id, activo));
	ipcMain.handle("categorias:get-all", () => getCategorias());
	ipcMain.handle("categorias:create", (_event, nombre) => createCategoria(nombre));
	ipcMain.handle("categorias:update", (_event, id, nombre) => updateCategoria(id, nombre));
	ipcMain.handle("categorias:delete", (_event, id) => deleteCategoria(id));
	ipcMain.handle("marcas:get-all", () => getMarcas());
	ipcMain.handle("marcas:create", (_event, nombre) => createMarca(nombre));
	ipcMain.handle("marcas:update", (_event, id, nombre) => updateMarca(id, nombre));
	ipcMain.handle("marcas:delete", (_event, id) => deleteMarca(id));
	ipcMain.handle("productos:scan", (_event, codigo) => scanProductByCode(codigo));
	ipcMain.handle("productos:get-all", (_event, filtros) => getProductos(filtros));
	ipcMain.handle("productos:get-by-id", (_event, id) => getProductoById(id));
	ipcMain.handle("productos:create", (_event, data) => createProducto(data));
	ipcMain.handle("productos:update", (_event, id, data) => updateProducto(id, data));
	ipcMain.handle("productos:delete", (_event, id) => deleteProducto(id));
	ipcMain.handle("productos:get-alerts", () => getAlertasStock());
	ipcMain.handle("lotes:get-by-producto", (_event, productoId) => getLotesByProducto(productoId));
	ipcMain.handle("lotes:create", (_event, data) => createLote(data));
	ipcMain.handle("lotes:get-expiring", (_event, diasLimite) => getLotesPorVencer(diasLimite));
	ipcMain.handle("cajas:get-active", () => getActiveCaja());
	ipcMain.handle("cajas:open", (_event, data) => openCaja(data));
	ipcMain.handle("cajas:get-summary", (_event, cajaId) => getCajaSummary(cajaId));
	ipcMain.handle("cajas:close", (_event, data) => closeCaja(data));
	ipcMain.handle("ventas:process", (_event, venta) => processSale(venta));
	ipcMain.handle("ventas:get-all", (_event, filtros) => getVentas(filtros));
	ipcMain.handle("ventas:get-detail", (_event, idVenta) => getVentaDetalle(idVenta));
	ipcMain.handle("movimientos:get-all", (_event, filtros) => getMovimientosStock(filtros));
	ipcMain.handle("movimientos:ajuste", (_event, data) => createAjusteStock(data));
	ipcMain.handle("reportes:summary", (_event, filtros) => getReportesSummary(filtros));
}
app.whenReady().then(() => {
	initDatabase();
	registerIpcHandlers();
	Menu.setApplicationMenu(null);
	createWindow();
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
//#endregion
export {};
