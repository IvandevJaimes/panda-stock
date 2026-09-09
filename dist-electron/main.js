import { createRequire as e } from "node:module";
import { BrowserWindow as t, Menu as n, app as r, ipcMain as i } from "electron";
import { fileURLToPath as a } from "node:url";
import o from "node:path";
import { existsSync as s } from "node:fs";
import { createHash as c } from "node:crypto";
import ee from "better-sqlite3";
import { drizzle as l } from "drizzle-orm/better-sqlite3";
import { migrate as te } from "drizzle-orm/better-sqlite3/migrator";
import { and as u, asc as d, count as ne, desc as f, eq as p, gt as m, gte as h, isNotNull as re, like as g, lte as _, or as v, sql as y } from "drizzle-orm";
import { index as b, integer as x, real as S, sqliteTable as C, text as w, uniqueIndex as ie } from "drizzle-orm/sqlite-core";
//#region \0rolldown/runtime.js
var T = Object.defineProperty, ae = /* @__PURE__ */ ((e, t) => {
	let n = {};
	for (var r in e) T(n, r, {
		get: e[r],
		enumerable: !0
	});
	return t || T(n, Symbol.toStringTag, { value: "Module" }), n;
})({
	cajas: () => M,
	categorias: () => O,
	detalleVentas: () => P,
	empleados: () => D,
	lotes: () => j,
	marcas: () => k,
	movimientosStock: () => I,
	pagos: () => F,
	productos: () => A,
	seguridadReportes: () => E,
	ventas: () => N
}), E = C("seguridad_reportes", {
	id: x("id").primaryKey(),
	pinHash: w("pin_hash").notNull(),
	actualizadoEn: w("actualizado_en").notNull()
}), D = C("empleados", {
	id: x("id").primaryKey({ autoIncrement: !0 }),
	nombre: w("nombre").notNull(),
	activo: x("activo", { mode: "boolean" }).notNull().default(!0),
	creadoEn: w("creado_en").notNull()
}), O = C("categorias", {
	id: x("id").primaryKey({ autoIncrement: !0 }),
	nombre: w("nombre").notNull().unique(),
	activo: x("activo", { mode: "boolean" }).notNull().default(!0)
}), k = C("marcas", {
	id: x("id").primaryKey({ autoIncrement: !0 }),
	nombre: w("nombre").notNull().unique(),
	activo: x("activo", { mode: "boolean" }).notNull().default(!0)
}), A = C("productos", {
	id: x("id").primaryKey({ autoIncrement: !0 }),
	categoriaId: x("categoria_id").references(() => O.id),
	marcaId: x("marca_id").references(() => k.id),
	nombre: w("nombre").notNull(),
	codigoInterno: w("codigo_interno").notNull(),
	codigosBarras: w("codigos_barras"),
	variante: w("variante"),
	tipoVenta: w("tipo_venta").$type().notNull().default("unidad"),
	unidadMedida: w("unidad_medida").$type().notNull().default("unidad"),
	costo: S("costo").notNull().default(0),
	porcentajeGanancia: S("porcentaje_ganancia").notNull().default(0),
	precioVenta: S("precio_venta").notNull().default(0),
	precioMayoreo: S("precio_mayoreo").notNull().default(0),
	stockActual: S("stock_actual").notNull().default(0),
	stockMinimo: S("stock_minimo").notNull().default(0),
	vencimiento: w("vencimiento"),
	activo: x("activo", { mode: "boolean" }).notNull().default(!0),
	creadoEn: w("creado_en").notNull(),
	actualizadoEn: w("actualizado_en")
}, (e) => [ie("productos_codigo_interno_unique").on(e.codigoInterno)]), j = C("lotes", {
	id: x("id").primaryKey({ autoIncrement: !0 }),
	productoId: x("producto_id").notNull().references(() => A.id),
	numeroLote: w("numero_lote"),
	fechaIngreso: w("fecha_ingreso").notNull(),
	fechaVence: w("fecha_vence"),
	costoUnitario: S("costo_unitario").notNull().default(0),
	cantidadInicial: S("cantidad_inicial").notNull(),
	cantidadActual: S("cantidad_actual").notNull(),
	creadoEn: w("creado_en").notNull()
}, (e) => [b("lotes_producto_id_idx").on(e.productoId)]), M = C("cajas", {
	id: x("id").primaryKey({ autoIncrement: !0 }),
	empleadoId: x("empleado_id").notNull().references(() => D.id),
	montoInicial: S("monto_inicial").notNull().default(0),
	montoEsperado: S("monto_esperado"),
	montoReal: S("monto_real"),
	diferencia: S("diferencia"),
	estado: w("estado").$type().notNull().default("abierta"),
	fechaApertura: w("fecha_apertura"),
	fechaCierre: w("fecha_cierre"),
	observaciones: w("observaciones")
}), N = C("ventas", {
	id: x("id").primaryKey({ autoIncrement: !0 }),
	cajaId: x("caja_id").references(() => M.id),
	empleadoId: x("empleado_id").notNull().references(() => D.id),
	subtotal: S("subtotal").notNull().default(0),
	descuento: S("descuento").notNull().default(0),
	impuesto: S("impuesto").notNull().default(0),
	total: S("total").notNull(),
	estado: w("estado").$type().notNull().default("completada"),
	fechaHora: w("fecha_hora").notNull()
}), P = C("detalle_ventas", {
	id: x("id").primaryKey({ autoIncrement: !0 }),
	ventaId: x("venta_id").notNull().references(() => N.id),
	productoId: x("producto_id").references(() => A.id),
	loteId: x("lote_id").references(() => j.id),
	tipoTarifa: w("tipo_tarifa").$type().notNull().default("minorista"),
	descripcionItem: w("descripcion_item").notNull(),
	cantidad: S("cantidad").notNull(),
	precioUnitario: S("precio_unitario").notNull(),
	costoUnitario: S("costo_unitario").notNull(),
	subtotal: S("subtotal").notNull()
}), F = C("pagos", {
	id: x("id").primaryKey({ autoIncrement: !0 }),
	ventaId: x("venta_id").notNull().references(() => N.id),
	metodo: w("metodo").$type().notNull(),
	monto: S("monto").notNull(),
	referencia: w("referencia"),
	fechaHora: w("fecha_hora").notNull()
}), I = C("movimientos_stock", {
	id: x("id").primaryKey({ autoIncrement: !0 }),
	productoId: x("producto_id").notNull().references(() => A.id),
	loteId: x("lote_id").references(() => j.id),
	ventaId: x("venta_id").references(() => N.id),
	tipo: w("tipo").$type().notNull(),
	cantidad: S("cantidad").notNull(),
	stockAnterior: S("stock_anterior"),
	stockPosterior: S("stock_posterior"),
	motivo: w("motivo"),
	fechaHora: w("fecha_hora").notNull()
}, (e) => [b("movimientos_stock_producto_id_idx").on(e.productoId)]), L = e(import.meta.url)("electron").app, R = null, z = null;
function B(e) {
	return c("sha256").update(e).digest("hex");
}
function V() {
	if (!z) throw Error("Base de datos no inicializada. Ejecuta initDatabase() primero.");
	return z;
}
function oe() {
	return process.env.PANDA_STOCK_DB ? process.env.PANDA_STOCK_DB : L?.getPath ? o.join(L.getPath("userData"), "panda_stock.db") : o.join(process.cwd(), "data", "panda_stock.db");
}
function H() {
	if (R) return;
	let e = oe();
	R = new ee(e), R.pragma("journal_mode = WAL"), R.pragma("foreign_keys = ON"), z = l(R, { schema: ae });
	let t = o.join(import.meta.dirname, "../electron/db/migrations"), n = o.join(import.meta.dirname, "migrations"), r = s(t) ? t : n;
	te(z, { migrationsFolder: r });
	let i = (/* @__PURE__ */ new Date()).toISOString();
	z.select({ id: E.id }).from(E).where(p(E.id, 1)).get() || z.insert(E).values({
		id: 1,
		pinHash: B("1234"),
		actualizadoEn: i
	}).run();
}
//#endregion
//#region electron/db/repository.ts
function U(e) {
	let t = V().select({ pinHash: E.pinHash }).from(E).where(p(E.id, 1)).get();
	return t ? B(e) === t.pinHash : !1;
}
function W(e, t) {
	let n = V();
	return U(e) ? (n.update(E).set({
		pinHash: B(t),
		actualizadoEn: (/* @__PURE__ */ new Date()).toISOString()
	}).where(p(E.id, 1)).run(), !0) : !1;
}
function G() {
	return V().select().from(D).orderBy(d(D.nombre)).all();
}
function K(e) {
	return V().insert(D).values({
		nombre: e.nombre,
		activo: !0,
		creadoEn: (/* @__PURE__ */ new Date()).toISOString()
	}).returning().get();
}
function q(e, t) {
	V().update(D).set({ activo: t }).where(p(D.id, e)).run();
}
function se() {
	return V().select().from(O).orderBy(d(O.nombre)).all();
}
function ce(e) {
	return V().insert(O).values({
		nombre: e,
		activo: !0
	}).returning().get();
}
function le(e, t) {
	V().update(O).set({ nombre: t }).where(p(O.id, e)).run();
}
function ue(e) {
	let t = V().select({ count: ne() }).from(A).where(p(A.categoriaId, e)).get();
	if (t && t.count > 0) throw Error("No se puede eliminar la categoría porque tiene productos asociados.");
	V().delete(O).where(p(O.id, e)).run();
}
function de() {
	return V().select().from(k).orderBy(d(k.nombre)).all();
}
function fe(e) {
	return V().insert(k).values({
		nombre: e,
		activo: !0
	}).returning().get();
}
function pe(e, t) {
	V().update(k).set({ nombre: t }).where(p(k.id, e)).run();
}
function me(e) {
	V().update(k).set({ activo: !1 }).where(p(k.id, e)).run();
}
function he(e) {
	return V().select().from(A).where(v(p(A.codigoInterno, e), y`instr(',' || ${A.codigosBarras} || ',', ',' || ${e} || ',') > 0`)).limit(1).get() ?? null;
}
function ge(e) {
	let t = V(), n = [];
	if (e?.search?.trim()) {
		let t = `%${e.search.trim()}%`;
		n.push(v(g(A.nombre, t), g(A.codigoInterno, t), g(A.codigosBarras, t)));
	}
	e?.categoriaId != null && n.push(p(A.categoriaId, e.categoriaId)), e?.marcaId != null && n.push(p(A.marcaId, e.marcaId)), e?.bajoStock && n.push(_(A.stockActual, A.stockMinimo));
	let r = u(...n);
	return (r ? t.select().from(A).where(r) : t.select().from(A)).orderBy(d(A.nombre)).all();
}
function _e(e) {
	return V().select().from(A).where(p(A.id, e)).get() ?? null;
}
function J(e, t) {
	let n = t?.trim() ?? null;
	if (!n) return null;
	let r = e.select({ id: k.id }).from(k).where(y`lower(${k.nombre}) = lower(${n})`).get();
	return r ? r.id : e.insert(k).values({
		nombre: n,
		activo: !0
	}).returning({ id: k.id }).get().id;
}
function ve(e) {
	let t = (/* @__PURE__ */ new Date()).toISOString(), n = Number(e.stockActual ?? e.stock ?? 0);
	return {
		categoriaId: e.categoriaId ?? null,
		marcaId: e.marcaId ?? null,
		nombre: e.nombre,
		codigoInterno: e.codigoInterno,
		codigosBarras: e.codigosBarras?.trim() || null,
		variante: e.variante?.trim() || null,
		tipoVenta: e.tipoVenta ?? "unidad",
		unidadMedida: e.unidadMedida ?? "unidad",
		costo: Number(e.costo ?? 0),
		porcentajeGanancia: Number(e.porcentajeGanancia ?? 0),
		precioVenta: Number(e.precioVenta ?? e.precio ?? 0),
		precioMayoreo: Number(e.precioMayoreo ?? 0),
		stockActual: n >= 0 ? n : 0,
		stockMinimo: Number(e.stockMinimo ?? 0),
		vencimiento: e.vencimiento ?? null,
		activo: !0,
		creadoEn: t
	};
}
function ye(e) {
	let t = V(), n = ve(e), r = (/* @__PURE__ */ new Date()).toISOString();
	return t.transaction((t) => {
		n.marcaId = J(t, e.marca);
		let i = t.insert(A).values(n).returning().get();
		if (n.stockActual > 0) {
			let e = t.insert(j).values({
				productoId: i.id,
				numeroLote: null,
				fechaIngreso: r,
				fechaVence: n.vencimiento ?? null,
				costoUnitario: n.costo,
				cantidadInicial: n.stockActual,
				cantidadActual: n.stockActual,
				creadoEn: r
			}).returning().get();
			t.insert(I).values({
				productoId: i.id,
				loteId: e.id,
				ventaId: null,
				tipo: "entrada",
				cantidad: n.stockActual,
				stockAnterior: 0,
				stockPosterior: n.stockActual,
				motivo: "Stock inicial al crear producto",
				fechaHora: r
			}).run();
		}
		return i;
	});
}
function be(e, t) {
	let n = V(), r = { actualizadoEn: (/* @__PURE__ */ new Date()).toISOString() };
	t.nombre !== void 0 && (r.nombre = t.nombre), t.codigoInterno !== void 0 && (r.codigoInterno = t.codigoInterno), t.codigosBarras !== void 0 && (r.codigosBarras = t.codigosBarras?.trim() || null), t.variante !== void 0 && (r.variante = t.variante?.trim() || null), t.categoriaId !== void 0 && (r.categoriaId = t.categoriaId), t.marca === void 0 ? t.marcaId !== void 0 && (r.marcaId = t.marcaId) : r.marcaId = J(n, t.marca), t.tipoVenta !== void 0 && (r.tipoVenta = t.tipoVenta), t.unidadMedida !== void 0 && (r.unidadMedida = t.unidadMedida), t.costo !== void 0 && (r.costo = t.costo), t.porcentajeGanancia !== void 0 && (r.porcentajeGanancia = t.porcentajeGanancia), t.precioVenta !== void 0 && (r.precioVenta = t.precioVenta), t.precioMayoreo !== void 0 && (r.precioMayoreo = t.precioMayoreo), t.stockMinimo !== void 0 && (r.stockMinimo = t.stockMinimo), t.vencimiento !== void 0 && (r.vencimiento = t.vencimiento ?? null);
	let i = n.update(A).set(r).where(p(A.id, e)).returning().get();
	if (!i) throw Error("Producto no encontrado");
	return i;
}
function xe(e) {
	V().update(A).set({
		activo: !1,
		actualizadoEn: (/* @__PURE__ */ new Date()).toISOString()
	}).where(p(A.id, e)).run();
}
function Se() {
	return V().select().from(A).where(u(_(A.stockActual, A.stockMinimo), p(A.activo, !0))).orderBy(d(A.stockActual)).all();
}
function Ce(e) {
	return V().select().from(j).where(p(j.productoId, e)).orderBy(d(j.fechaIngreso)).all();
}
function we(e) {
	let t = V(), n = (/* @__PURE__ */ new Date()).toISOString();
	return t.transaction((t) => {
		let r = t.select({ stockActual: A.stockActual }).from(A).where(p(A.id, e.productoId)).get();
		if (!r) throw Error("Producto no encontrado");
		let i = r.stockActual, a = i + e.cantidadInicial, o = t.insert(j).values({
			productoId: e.productoId,
			numeroLote: e.numeroLote ?? null,
			fechaIngreso: e.fechaIngreso,
			fechaVence: e.fechaVence ?? null,
			costoUnitario: e.costoUnitario ?? 0,
			cantidadInicial: e.cantidadInicial,
			cantidadActual: e.cantidadInicial,
			creadoEn: n
		}).returning().get();
		return t.update(A).set({
			stockActual: a,
			actualizadoEn: n
		}).where(p(A.id, e.productoId)).run(), t.insert(I).values({
			productoId: e.productoId,
			loteId: o.id,
			ventaId: null,
			tipo: "entrada",
			cantidad: e.cantidadInicial,
			stockAnterior: i,
			stockPosterior: a,
			motivo: "Ingreso de mercadería",
			fechaHora: n
		}).run(), o;
	});
}
function Te(e) {
	let t = new Date(Date.now() + e * 24 * 60 * 60 * 1e3).toISOString();
	return V().select().from(j).where(u(re(j.fechaVence), _(j.fechaVence, t), m(j.cantidadActual, 0))).orderBy(d(j.fechaVence)).all();
}
function Y() {
	return V().select().from(M).where(p(M.estado, "abierta")).orderBy(f(M.id)).get() ?? null;
}
function Ee(e) {
	let t = V();
	if (Y()) throw Error("Ya existe una caja abierta");
	return t.insert(M).values({
		empleadoId: e.empleadoId,
		montoInicial: e.montoInicial ?? 0,
		estado: "abierta",
		fechaApertura: (/* @__PURE__ */ new Date()).toISOString(),
		observaciones: e.observaciones ?? null
	}).returning().get();
}
function De(e) {
	let t = V(), n = t.select({ totalVentas: y`coalesce(sum(${N.total}), 0)` }).from(N).where(u(p(N.cajaId, e), p(N.estado, "completada"))).get(), r = t.select({
		metodo: F.metodo,
		monto: y`coalesce(sum(${F.monto}), 0)`
	}).from(F).innerJoin(N, p(F.ventaId, N.id)).where(u(p(N.cajaId, e), p(N.estado, "completada"))).groupBy(F.metodo).all(), i = 0, a = 0, o = 0;
	for (let e of r) e.metodo === "efectivo" ? i = e.monto : e.metodo === "transferencia" ? a = e.monto : (e.metodo === "debito" || e.metodo === "credito") && (o += e.monto);
	return {
		totalVentas: n?.totalVentas ?? 0,
		totalEfectivo: i,
		totalTransferencia: a,
		totalTarjeta: o
	};
}
function Oe(e) {
	return V().transaction((t) => {
		let n = t.select().from(M).where(p(M.id, e.cajaId)).get();
		if (!n) throw Error("Caja no encontrada");
		if (n.estado === "cerrada") throw Error("La caja ya está cerrada");
		let r = t.select({ total: y`coalesce(sum(${N.total}), 0)` }).from(N).where(u(p(N.cajaId, e.cajaId), p(N.estado, "completada"))).get(), i = n.montoInicial + (r?.total ?? 0);
		return t.update(M).set({
			montoEsperado: i,
			montoReal: e.montoReal,
			diferencia: e.montoReal - i,
			estado: "cerrada",
			fechaCierre: (/* @__PURE__ */ new Date()).toISOString(),
			observaciones: e.observaciones ?? n.observaciones
		}).where(p(M.id, e.cajaId)).returning().get();
	});
}
function ke(e) {
	let t = V(), n = (/* @__PURE__ */ new Date()).toISOString();
	return {
		success: !0,
		ventaId: t.transaction((t) => {
			let r = t.insert(N).values({
				cajaId: e.cajaId,
				empleadoId: e.empleadoId,
				subtotal: e.subtotal,
				descuento: e.descuento,
				impuesto: e.impuesto,
				total: e.total,
				estado: "completada",
				fechaHora: n
			}).returning({ id: N.id }).get().id;
			for (let i of e.items) {
				if (t.insert(P).values({
					ventaId: r,
					productoId: i.productoId,
					tipoTarifa: i.tipoTarifa,
					descripcionItem: i.descripcionItem,
					cantidad: i.cantidad,
					precioUnitario: i.precioUnitario,
					costoUnitario: i.costoUnitario,
					subtotal: i.precioUnitario * i.cantidad
				}).run(), i.productoId == null) continue;
				let e = t.select({ stockActual: A.stockActual }).from(A).where(p(A.id, i.productoId)).get()?.stockActual ?? 0, a = t.select().from(j).where(u(p(j.productoId, i.productoId), m(j.cantidadActual, 0))).orderBy(d(j.fechaIngreso), d(j.fechaVence)).all(), o = i.cantidad;
				for (let s of a) {
					if (o <= 0) break;
					let a = Math.min(s.cantidadActual, o);
					t.update(j).set({ cantidadActual: s.cantidadActual - a }).where(p(j.id, s.id)).run(), t.insert(I).values({
						productoId: i.productoId,
						loteId: s.id,
						ventaId: r,
						tipo: "venta",
						cantidad: a,
						stockAnterior: e,
						stockPosterior: e - a,
						motivo: null,
						fechaHora: n
					}).run(), e -= a, o -= a;
				}
				o > 0 && (t.insert(I).values({
					productoId: i.productoId,
					loteId: null,
					ventaId: r,
					tipo: "venta",
					cantidad: o,
					stockAnterior: e,
					stockPosterior: e - o,
					motivo: null,
					fechaHora: n
				}).run(), e -= o), t.update(A).set({
					stockActual: e,
					actualizadoEn: n
				}).where(p(A.id, i.productoId)).run();
			}
			for (let i of e.pagos) t.insert(F).values({
				ventaId: r,
				metodo: i.metodo,
				monto: i.monto,
				referencia: i.referencia ?? null,
				fechaHora: n
			}).run();
			return r;
		})
	};
}
function Ae(e) {
	let t = V(), n = [];
	e?.desde && n.push(h(N.fechaHora, e.desde)), e?.hasta && n.push(_(N.fechaHora, e.hasta)), e?.cajaId != null && n.push(p(N.cajaId, e.cajaId));
	let r = u(...n);
	return (r ? t.select().from(N).where(r) : t.select().from(N)).orderBy(f(N.fechaHora)).all();
}
function X(e) {
	let t = V(), n = t.select().from(N).where(p(N.id, e)).get();
	return n ? {
		venta: n,
		items: t.select().from(P).where(p(P.ventaId, e)).orderBy(d(P.id)).all(),
		pagos: t.select().from(F).where(p(F.ventaId, e)).orderBy(d(F.id)).all()
	} : null;
}
function je(e) {
	let t = V().select().from(I), n = (e?.productoId == null ? t : t.where(p(I.productoId, e.productoId))).orderBy(f(I.fechaHora));
	return (e?.limit == null ? n : n.limit(e.limit)).all();
}
function Me(e) {
	let t = V(), n = (/* @__PURE__ */ new Date()).toISOString();
	t.transaction((t) => {
		let r = t.select({ stockActual: A.stockActual }).from(A).where(p(A.id, e.productoId)).get();
		if (!r) throw Error("Producto no encontrado");
		let i = r.stockActual, a = i + (e.tipo === "ajuste_positivo" ? e.cantidad : -e.cantidad);
		if (a < 0) throw Error("El ajuste dejaría stock negativo");
		t.update(A).set({
			stockActual: a,
			actualizadoEn: n
		}).where(p(A.id, e.productoId)).run(), t.insert(I).values({
			productoId: e.productoId,
			loteId: null,
			ventaId: null,
			tipo: e.tipo,
			cantidad: e.cantidad,
			stockAnterior: i,
			stockPosterior: a,
			motivo: e.motivo,
			fechaHora: n
		}).run();
	});
}
function Ne(e) {
	let t = V(), n = [p(N.estado, "completada")];
	e?.desde && n.push(h(N.fechaHora, e.desde)), e?.hasta && n.push(_(N.fechaHora, e.hasta));
	let r = u(...n), i = t.select({
		total: y`coalesce(sum(${N.total}), 0)`,
		cantidad: y`count(*)`
	}).from(N).where(r).get(), a = t.select({
		metodo: F.metodo,
		monto: y`coalesce(sum(${F.monto}), 0)`
	}).from(F).innerJoin(N, p(F.ventaId, N.id)).where(r).groupBy(F.metodo).all(), o = t.select({
		productoId: P.productoId,
		nombre: A.nombre,
		cantidad: y`coalesce(sum(${P.cantidad}), 0)`,
		monto: y`coalesce(sum(${P.subtotal}), 0)`
	}).from(P).innerJoin(N, p(P.ventaId, N.id)).innerJoin(A, p(P.productoId, A.id)).where(r).groupBy(P.productoId, A.nombre).orderBy(f(y`sum(${P.cantidad})`)).limit(5).all(), s = t.select().from(M).where(p(M.estado, "abierta")).orderBy(f(M.id)).get(), c = {
		cajaId: null,
		montoInicial: 0,
		montoEsperado: 0,
		montoReal: null,
		diferencia: null,
		ventas: 0
	};
	if (s) {
		let e = t.select({
			monto: y`coalesce(sum(${N.total}), 0)`,
			cantidad: y`count(*)`
		}).from(N).where(u(p(N.cajaId, s.id), p(N.estado, "completada"))).get();
		c = {
			cajaId: s.id,
			montoInicial: s.montoInicial,
			montoEsperado: s.montoInicial + (e?.monto ?? 0),
			montoReal: s.montoReal,
			diferencia: s.diferencia,
			ventas: e?.cantidad ?? 0
		};
	}
	return {
		caja: c,
		ventasPorMetodo: a,
		productosMasVendidos: o,
		totalVentas: i?.total ?? 0,
		cantVentas: i?.cantidad ?? 0
	};
}
//#endregion
//#region electron/main.ts
var Z = o.dirname(a(import.meta.url)), Q = !r.isPackaged;
function $() {
	let e = new t({
		width: 1440,
		height: 900,
		minWidth: 480,
		minHeight: 700,
		resizable: !0,
		autoHideMenuBar: !0,
		webPreferences: {
			preload: o.join(Z, "../dist-electron/preload.cjs"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !0
		}
	});
	e.setMenu(null), e.webContents.on("before-input-event", (t, n) => {
		n.type === "keyDown" && n.key === "F12" && Q && (t.preventDefault(), e.webContents.toggleDevTools());
	}), Q ? e.loadURL("http://localhost:5173") : e.loadFile(o.join(Z, "../dist/index.html"));
}
function Pe() {
	i.handle("seguridad:verify-pin", (e, t) => U(t)), i.handle("seguridad:change-pin", (e, t, n) => W(t, n)), i.handle("empleados:get-all", () => G()), i.handle("empleados:create", (e, t) => K(t)), i.handle("empleados:toggle", (e, t, n) => q(t, n)), i.handle("categorias:get-all", () => se()), i.handle("categorias:create", (e, t) => ce(t)), i.handle("categorias:update", (e, t, n) => le(t, n)), i.handle("categorias:delete", (e, t) => ue(t)), i.handle("marcas:get-all", () => de()), i.handle("marcas:create", (e, t) => fe(t)), i.handle("marcas:update", (e, t, n) => pe(t, n)), i.handle("marcas:delete", (e, t) => me(t)), i.handle("productos:scan", (e, t) => he(t)), i.handle("productos:get-all", (e, t) => ge(t)), i.handle("productos:get-by-id", (e, t) => _e(t)), i.handle("productos:create", (e, t) => ye(t)), i.handle("productos:update", (e, t, n) => be(t, n)), i.handle("productos:delete", (e, t) => xe(t)), i.handle("productos:get-alerts", () => Se()), i.handle("lotes:get-by-producto", (e, t) => Ce(t)), i.handle("lotes:create", (e, t) => we(t)), i.handle("lotes:get-expiring", (e, t) => Te(t)), i.handle("cajas:get-active", () => Y()), i.handle("cajas:open", (e, t) => Ee(t)), i.handle("cajas:get-summary", (e, t) => De(t)), i.handle("cajas:close", (e, t) => Oe(t)), i.handle("ventas:process", (e, t) => ke(t)), i.handle("ventas:get-all", (e, t) => Ae(t)), i.handle("ventas:get-detail", (e, t) => X(t)), i.handle("movimientos:get-all", (e, t) => je(t)), i.handle("movimientos:ajuste", (e, t) => Me(t)), i.handle("reportes:summary", (e, t) => Ne(t));
}
r.whenReady().then(() => {
	H(), Pe(), n.setApplicationMenu(null), $(), r.on("activate", () => {
		t.getAllWindows().length === 0 && $();
	});
}), r.on("window-all-closed", () => {
	process.platform !== "darwin" && r.quit();
});
//#endregion
export {};
