import { evaluateExpiry } from "../../lib/dateUtils";
import type {
  Categoria,
  Marca,
  ProductoConLoteActivo,
} from "../../../electron/db/types";

export type OrdenInventario =
  | "creado_desc"
  | "creado_asc"
  | "nombre_asc"
  | "nombre_desc"
  | "stock_asc"
  | "stock_desc"
  | "margen_asc"
  | "sin_marca"
  | "sin_minimo";

export type KpiFilter =
  | "all"
  | "low_stock"
  | "expiring_soon"
  | "out_of_stock"
  | "expired";

export type EstadoVencimiento = "vencido" | "por-vencer" | "ok";

export type ProductoInventario = {
  id: number;
  name: string;
  variant: string | null;
  brand: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  marcaId: number | null;
  categoriaId: number | null;
  creadoEn: string;
  expiresAt: string | null;
  codigoInterno: string;
  codigosBarras: string;
  status: EstadoVencimiento;
  /** Campos pre-normalizados (minúsculas + sin acentos): el matcheo se hace
   *  sobre ellos con `.includes()` en O(1) por campo, UNA vez por mapeo y no
   *  normaliza 6 veces por producto en cada tecla del buscador. */
  _nameN: string;
  _brandN: string;
  _variantN: string;
  _codigoInternoN: string;
  _codigosBarrasN: string;
};

/** Normaliza texto a minúsculas y sin diacríticos para matcheo de búsqueda. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function derivarEstadoVencimiento(
  vencimiento: string | null,
): EstadoVencimiento {
  if (!vencimiento) return "ok";
  const result = evaluateExpiry(vencimiento);
  if (!result) return "ok";
  if (result.status === "expired") return "vencido";
  if (result.status === "expiring_soon") return "por-vencer";
  return "ok";
}

/** Margen porcentual sobre el costo: null si no hay costo cargado. */
export function margenPorcentaje(p: ProductoInventario): number | null {
  return p.cost > 0 ? ((p.price - p.cost) / p.cost) * 100 : null;
}

/**
 * Mapea un producto crudo a la vista de inventario. Resuelve categoría/marca
 * con Map O(1) (no `.find()` por producto) y precomputa los campos normalizados
 * de búsqueda una sola vez.
 */
export function mapearProducto(
  producto: ProductoConLoteActivo,
  categoriasPorId: Map<number, Categoria>,
  marcasPorId: Map<number, Marca>,
): ProductoInventario {
  const categoria = producto.categoriaId
    ? categoriasPorId.get(producto.categoriaId)
    : undefined;
  const marca = producto.marcaId
    ? marcasPorId.get(producto.marcaId)
    : undefined;
  const brand = marca?.nombre ?? "";
  const category = categoria?.nombre ?? "";
  const variant = producto.variante ?? "";
  const codigoInterno = producto.codigoInterno ?? "";
  const codigosBarras = producto.codigosBarras ?? "";
  return {
    id: producto.id,
    name: producto.nombre,
    variant: producto.variante,
    brand,
    category,
    price: producto.precioVenta,
    cost: producto.costo,
    stock: producto.stockActual,
    minStock: producto.stockMinimo,
    marcaId: producto.marcaId,
    categoriaId: producto.categoriaId,
    creadoEn: producto.creadoEn,
    expiresAt: producto.loteActivoVencimiento,
    codigoInterno,
    codigosBarras,
    status: derivarEstadoVencimiento(producto.loteActivoVencimiento),
    _nameN: normalizar(producto.nombre),
    _brandN: normalizar(brand),
    _variantN: normalizar(variant),
    _codigoInternoN: normalizar(codigoInterno),
    _codigosBarrasN: normalizar(codigosBarras),
  };
}

/** Ordena sobre productos ya mapeados (la lista se copia, nunca se muta). */
export function ordenarProductos(
  productos: ProductoInventario[],
  orden: OrdenInventario,
): ProductoInventario[] {
  const comparadorNombre = (a: ProductoInventario, b: ProductoInventario) =>
    a.name.localeCompare(b.name, "es");
  switch (orden) {
    case "creado_desc":
      return [...productos].sort((a, b) =>
        b.creadoEn.localeCompare(a.creadoEn),
      );
    case "creado_asc":
      return [...productos].sort((a, b) =>
        a.creadoEn.localeCompare(b.creadoEn),
      );
    case "nombre_asc":
      return [...productos].sort(comparadorNombre);
    case "nombre_desc":
      return [...productos].sort((a, b) => comparadorNombre(b, a));
    case "stock_asc":
      return [...productos].sort(
        (a, b) => a.stock - b.stock || comparadorNombre(a, b),
      );
    case "stock_desc":
      return [...productos].sort(
        (a, b) => b.stock - a.stock || comparadorNombre(a, b),
      );
    case "margen_asc":
      return [...productos].sort((a, b) => {
        const mA = margenPorcentaje(a);
        const mB = margenPorcentaje(b);
        if (mA === null && mB === null) return comparadorNombre(a, b);
        if (mA === null) return 1;
        if (mB === null) return -1;
        return mA - mB || comparadorNombre(a, b);
      });
    case "sin_marca":
    case "sin_minimo":
      return [...productos];
  }
}

export type FiltrosInventario = {
  termino: string;
  categoriaId: string;
  kpi: KpiFilter;
};

/**
 * ¿El producto coincide con el término de búsqueda? El término debe llegar YA
 * normalizado y en minúsculas para comparar contra los campos pre-normalizados.
 * Fuente única de verdad: la usa filtrarProductos y la grilla al decidir qué
 * filas deben re-renderizar para el resaltado en vivo.
 */
export function coincideBusqueda(
  p: ProductoInventario,
  terminoNormalizado: string,
): boolean {
  return (
    p._nameN.includes(terminoNormalizado) ||
    p._brandN.includes(terminoNormalizado) ||
    p._variantN.includes(terminoNormalizado) ||
    p._codigoInternoN.includes(terminoNormalizado) ||
    p._codigosBarrasN.includes(terminoNormalizado)
  );
}

/**
 * Filtro de búsqueda SIN normalizar por producto: el término se normaliza una
 * sola vez y se compara contra los campos pre-normalizados del mapeo. La
 * categoría se compara por id (sin `.find()` en el listado de categorías).
 */
export function filtrarProductos(
  productos: ProductoInventario[],
  filtros: FiltrosInventario,
): ProductoInventario[] {
  const termino = normalizar(filtros.termino.trim());
  const catSel = filtros.categoriaId;

  return productos.filter((p) => {
    if (termino && !coincideBusqueda(p, termino)) return false;

    if (catSel !== "all" && String(p.categoriaId) !== catSel) return false;

    switch (filtros.kpi) {
      case "low_stock":
        return p.stock < p.minStock && p.stock > 0;
      case "expiring_soon":
        return p.status === "por-vencer";
      case "out_of_stock":
        return p.stock === 0;
      case "expired":
        return p.status === "vencido";
      default:
        return true;
    }
  });
}