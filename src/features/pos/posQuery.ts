import type {
  Categoria,
  Marca,
  ProductoConLoteActivo,
  TipoTarifa,
} from '../../../electron/db/types'
import { evaluateExpiry } from '../../lib/dateUtils'
import { normalizar } from '../inventory/inventoryQuery'

export const UMBRAL_MAYOREO = 3
export const FACTOR_MAYOREO = 0.9

/** Mismo umbral que el default de `evaluateExpiry` (14 días). */
export const DIAS_POR_VENCER = 14

export type EstadoStock = 'disponible' | 'bajo' | 'agotado' | 'vencido'

export const ETIQUETA_ESTADO: Record<EstadoStock, string> = {
  disponible: 'Disponible',
  bajo: 'Stock bajo',
  agotado: 'Agotado',
  vencido: 'Vencido',
}

export type ProductoPOS = {
  id: number
  nombre: string
  precio: number
  costo: number
  stock: number
  stockMinimo: number
  categoriaId: number | null
  categoria: string
  marcaId: number | null
  marca: string
  variante: string | null
  estado: EstadoStock
  /** ISO del alta, para ordenar por antigüedad. */
  creadoEn: string
  /** Días hasta el vencimiento del lote activo. Negativo o 0 = ya vencido. */
  diasParaVencer: number | null
  fechaVencimiento: string | null
  imgPath: string | null
  _nombreN: string
  _marcaN: string
  _varianteN: string
  _codigoInternoN: string
  _codigosBarras: string[]
}

export function redondearMoneda(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

export function esVencido(vencimiento: string | null): boolean {
  if (!vencimiento) return false
  return evaluateExpiry(vencimiento)?.status === 'expired'
}

export function derivarEstadoStock(
  stock: number,
  stockMinimo: number,
  vencido: boolean,
): EstadoStock {
  if (vencido) return 'vencido'
  if (stock <= 0) return 'agotado'
  if (stock < stockMinimo) return 'bajo'
  return 'disponible'
}

export function esVendible(producto: ProductoPOS): boolean {
  return producto.estado !== 'agotado' && producto.estado !== 'vencido'
}

export function estaPorVencer(producto: ProductoPOS): boolean {
  const dias = producto.diasParaVencer
  return dias !== null && dias > 0 && dias <= DIAS_POR_VENCER
}

export function tieneStockBajo(producto: ProductoPOS): boolean {
  return producto.estado === 'bajo'
}

/** ¿La card debe mostrar aviso (ícono + tooltip + contorno ámbar)? */
export function tieneAviso(producto: ProductoPOS): boolean {
  return cantidadAvisos(producto) > 0
}

/** 0 = normal, 1 = un aviso, 2 = por vencer y stock bajo a la vez. */
export function cantidadAvisos(producto: ProductoPOS): number {
  return (estaPorVencer(producto) ? 1 : 0) + (tieneStockBajo(producto) ? 1 : 0)
}

export type FiltroAviso = 'all' | 'bajo' | 'por_vencer' | 'con_avisos'
export type OrdenCatalogo =
  | 'nuevos'
  | 'antiguos'
  | 'alfabetico'
  | 'alfabetico_desc'
  | 'precio_asc'
  | 'precio_desc'

/** Una "vista" del catálogo: qué productos se ven y en qué orden. */
export type VistaCatalogo = {
  orden: OrdenCatalogo
  filtro: FiltroAviso
}

export const VISTA_POR_DEFECTO: VistaCatalogo = {
  orden: 'nuevos',
  filtro: 'all',
}

/**
 * El grupo de orden es simétrico: cada criterio tiene su inverso. Si un criterio
 * se puede invertir, ofrecerlo solo en un sentido deja al cajero sin forma de
 * recorrer el catálogo al revés.
 */
export const OPCIONES_ORDEN: { value: OrdenCatalogo; label: string }[] = [
  { value: 'nuevos', label: 'Más nuevos primero' },
  { value: 'antiguos', label: 'Más antiguos primero' },
  { value: 'alfabetico', label: 'Alfabético: A a Z' },
  { value: 'alfabetico_desc', label: 'Alfabético: Z a A' },
  { value: 'precio_asc', label: 'Precio: menor a mayor' },
  { value: 'precio_desc', label: 'Precio: mayor a menor' },
]

export const OPCIONES_FILTRO: { value: FiltroAviso; label: string }[] = [
  { value: 'all', label: 'Todos los productos' },
  { value: 'bajo', label: 'Solo con stock bajo' },
  { value: 'por_vencer', label: 'Solo por vencer' },
  { value: 'con_avisos', label: 'Solo con avisos' },
]

export const ETIQUETA_ORDEN: Record<OrdenCatalogo, string> = {
  nuevos: 'Más nuevos primero',
  antiguos: 'Más antiguos primero',
  alfabetico: 'Alfabético: A a Z',
  alfabetico_desc: 'Alfabético: Z a A',
  precio_asc: 'Precio: menor a mayor',
  precio_desc: 'Precio: mayor a menor',
}

/**
 * Un solo desplegable maneja dos dimensiones —qué se muestra y cómo se ordena—
 * pero NO se pisan entre sí: elegir un filtro conserva el orden actual y elegir
 * un orden conserva el filtro actual. Por eso el valor va prefijado
 * (`orden:nuevos` / `filtro:bajo`) y se parsea para saber cuál de las dos
 * dimensiones tocar. Mezclarlas en un valor único obligaría al cajero a resignar
 * una de las dos cada vez que cambia la otra.
 */
export const OPCIONES_VISTA: { value: string; label: string }[] = [
  ...OPCIONES_ORDEN.map((o) => ({ value: `orden:${o.value}`, label: o.label })),
  ...OPCIONES_FILTRO.filter((f) => f.value !== 'all').map((f) => ({
    value: `filtro:${f.value}`,
    label: f.label,
  })),
]

export function aplicarValorVista(
  vista: VistaCatalogo,
  valor: string,
): VistaCatalogo {
  if (valor.startsWith('orden:')) {
    const orden = valor.slice('orden:'.length) as OrdenCatalogo
    return OPCIONES_ORDEN.some((o) => o.value === orden)
      ? { ...vista, orden }
      : vista
  }
  if (valor.startsWith('filtro:')) {
    const filtro = valor.slice('filtro:'.length) as FiltroAviso
    return OPCIONES_FILTRO.some((f) => f.value === filtro)
      ? { ...vista, filtro }
      : vista
  }
  return vista
}

/** Etiqueta de la opción que representa la vista activa (para marcar el check). */
export function valorVistaActiva(vista: VistaCatalogo): string {
  if (vista.filtro !== 'all') return `filtro:${vista.filtro}`
  return `orden:${vista.orden}`
}

/**
 * Texto del botón. Si hay filtro y el orden no es el por defecto, se muestran
 * ambos: si no, cambiar el orden no daría ninguna señal visual de que pasó algo.
 */
export function etiquetaVista(vista: VistaCatalogo): string {
  const filtro = OPCIONES_FILTRO.find((f) => f.value === vista.filtro)
  if (vista.filtro === 'all') return ETIQUETA_ORDEN[vista.orden]
  const base = filtro?.label ?? 'Todos los productos'
  if (vista.orden === VISTA_POR_DEFECTO.orden) return base
  return `${base} · ${ETIQUETA_ORDEN[vista.orden]}`
}

/**
 * El filtro se aplica sobre la búsqueda+categoría, y el orden recién después:
 * recién ahí se decide qué producto aparece primero.
 */
export function coincideFiltroAviso(
  producto: ProductoPOS,
  filtro: FiltroAviso,
): boolean {
  if (filtro === 'bajo') return tieneStockBajo(producto)
  if (filtro === 'por_vencer') return estaPorVencer(producto)
  if (filtro === 'con_avisos') return tieneAviso(producto)
  return true
}

export function ordenarCatalogo(
  productos: ProductoPOS[],
  orden: OrdenCatalogo,
): ProductoPOS[] {
  const copia = [...productos]
  switch (orden) {
    case 'antiguos':
      return copia.sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
    case 'alfabetico':
      return copia.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    case 'alfabetico_desc':
      return copia.sort((a, b) => b.nombre.localeCompare(a.nombre, 'es'))
    case 'precio_asc':
      return copia.sort((a, b) => a.precio - b.precio)
    case 'precio_desc':
      return copia.sort((a, b) => b.precio - a.precio)
    case 'nuevos':
    default:
      return copia.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
  }
}

export function aplicarVistaCatalogo(
  productos: ProductoPOS[],
  vista: VistaCatalogo,
): ProductoPOS[] {
  const filtrados =
    vista.filtro === 'all'
      ? productos
      : productos.filter((producto) => coincideFiltroAviso(producto, vista.filtro))

  return ordenarCatalogo(filtrados, vista.orden)
}

/**
 * Texto del tooltip del badge de la card. Si el producto cumple las dos
 * condiciones, se informan ambas: el cajero necesita saber qué mover primero.
 */
export function descripcionAviso(producto: ProductoPOS): string {
  const partes: string[] = []

  if (estaPorVencer(producto)) {
    const dias = producto.diasParaVencer as number
    const relativo = dias === 1 ? 'Vence mañana' : `Vence en ${dias} días`
    partes.push(
      producto.fechaVencimiento
        ? `${relativo} (${producto.fechaVencimiento})`
        : relativo,
    )
  }

  if (tieneStockBajo(producto)) {
    partes.push(`Stock bajo: ${producto.stock} de mínimo ${producto.stockMinimo}`)
  }

  return partes.join(' · ')
}

export function mapearProductosPOS(
  productos: ProductoConLoteActivo[],
  categoriasPorId: Map<number, Categoria>,
  marcasPorId: Map<number, Marca> = new Map(),
): ProductoPOS[] {
  return productos.map((producto) => {
    const categoria = producto.categoriaId
      ? categoriasPorId.get(producto.categoriaId)
      : undefined
    const marca = producto.marcaId ? marcasPorId.get(producto.marcaId) : undefined
    const variante = producto.variante ?? ''
    const expiracion = evaluateExpiry(producto.loteActivoVencimiento ?? undefined)
    const codigosBarras = (producto.codigosBarras ?? '')
      .split(',')
      .map((codigo) => normalizar(codigo.trim()))
      .filter(Boolean)

    return {
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precioVenta,
      costo: producto.costo,
      stock: producto.stockActual,
      stockMinimo: producto.stockMinimo,
      categoriaId: producto.categoriaId,
      categoria: categoria?.nombre ?? '',
      marcaId: producto.marcaId,
      marca: marca?.nombre ?? '',
      variante: producto.variante,
      estado: derivarEstadoStock(
        producto.stockActual,
        producto.stockMinimo,
        expiracion?.status === 'expired',
      ),
      creadoEn: producto.creadoEn,
      diasParaVencer: expiracion?.daysDiff ?? null,
      fechaVencimiento: producto.loteActivoVencimiento,
      imgPath: producto.imgPath,
      _nombreN: normalizar(producto.nombre),
      _marcaN: normalizar(marca?.nombre ?? ''),
      _varianteN: normalizar(variante),
      _codigoInternoN: normalizar(producto.codigoInterno ?? ''),
      _codigosBarras: codigosBarras,
    }
  })
}

export function coincideBusquedaPOS(
  producto: ProductoPOS,
  terminoNormalizado: string,
): boolean {
  if (producto._nombreN.includes(terminoNormalizado)) return true
  if (producto._marcaN.includes(terminoNormalizado)) return true
  if (producto._varianteN.includes(terminoNormalizado)) return true
  if (producto._codigoInternoN === terminoNormalizado) return true
  return producto._codigosBarras.includes(terminoNormalizado)
}

export type CategoriaCatalogo = {
  id: number
  nombre: string
  conteo: number
}

export function construirCategorias(
  productos: ProductoPOS[],
  categorias: Categoria[],
  seleccionada?: string,
): CategoriaCatalogo[] {
  const conteos = new Map<number, number>()

  for (const producto of productos) {
    if (producto.categoriaId == null) continue
    conteos.set(producto.categoriaId, (conteos.get(producto.categoriaId) ?? 0) + 1)
  }

  return categorias
    .filter((categoria) => categoria.activo)
    .map((categoria) => ({
      id: categoria.id,
      nombre: categoria.nombre,
      conteo: conteos.get(categoria.id) ?? 0,
    }))
    .filter(
      (categoria) =>
        categoria.conteo > 0 || String(categoria.id) === seleccionada,
    )
}

export function filtrarCatalogoPOS(
  productos: ProductoPOS[],
  termino: string,
  categoriaId: string,
): ProductoPOS[] {
  const normalizado = normalizar(termino.trim())
  const catSeleccionada = categoriaId

  return productos.filter((producto) => {
    if (normalizado && !coincideBusquedaPOS(producto, normalizado)) return false
    if (catSeleccionada !== 'all' && String(producto.categoriaId) !== catSeleccionada) {
      return false
    }
    return true
  })
}

export type GrupoDisponibilidad = {
  vendibles: ProductoPOS[]
  noVendibles: ProductoPOS[]
}

export function separarPorDisponibilidad(productos: ProductoPOS[]): GrupoDisponibilidad {
  const vendibles: ProductoPOS[] = []
  const noVendibles: ProductoPOS[] = []

  for (const producto of productos) {
    if (esVendible(producto)) {
      vendibles.push(producto)
    } else {
      noVendibles.push(producto)
    }
  }

  return { vendibles, noVendibles }
}

export type ConteoBloqueados = {
  agotados: number
  vencidos: number
}

export function contarBloqueados(productos: ProductoPOS[]): ConteoBloqueados {
  let agotados = 0
  let vencidos = 0

  for (const producto of productos) {
    if (producto.estado === 'agotado') agotados++
    else if (producto.estado === 'vencido') vencidos++
  }

  return { agotados, vencidos }
}

export type MetodoPagoPOS = 'efectivo' | 'transferencia' | 'tarjeta'

export type ItemTicket = {
  productoId: number
  nombre: string
  precioVenta: number
  costo: number
  cantidad: number
  imgPath: string | null
}

export type LineaTicket = ItemTicket & {
  tipoTarifa: TipoTarifa
  precioUnitario: number
  importeMinorista: number
  ahorro: number
  importe: number
}

export type ResumenTicket = {
  lineas: LineaTicket[]
  unidades: number
  subtotal: number
  descuento: number
  impuesto: number
  total: number
}

export function tipoTarifaPorCantidad(cantidad: number): TipoTarifa {
  return cantidad >= UMBRAL_MAYOREO ? 'mayoreo' : 'minorista'
}

export function precioUnitarioPorCantidad(
  precioVenta: number,
  cantidad: number,
): number {
  return tipoTarifaPorCantidad(cantidad) === 'mayoreo'
    ? redondearMoneda(precioVenta * FACTOR_MAYOREO)
    : redondearMoneda(precioVenta)
}

export function agregarAlTicket(
  items: ItemTicket[],
  producto: ProductoPOS,
): ItemTicket[] {
  if (!esVendible(producto)) return items

  const existente = items.find((item) => item.productoId === producto.id)

  if (existente) {
    // Incrementar NO reordena: la línea sigue ocupando la posición en la que
    // entró. "Más nuevo primero" habla de cuándo se agregó la línea, no de
    // cuándo se le tocó por última vez. Si se moviera, agregar una segunda
    // unidad saltaría la fila al frente y el cajero perdería la referencia de
    // qué acaba de pasar.
    return items.map((item) =>
      item.productoId === producto.id
        ? { ...item, cantidad: item.cantidad + 1 }
        : item,
    )
  }

  // La línea nueva entra al frente: lo último agregado queda arriba, que es
  // donde está la atención del cajero. `unshift` y no un `ordenIngreso` con
  // timestamp porque `Date.now()` resuelve en milisegundos y dos altas en el
  // mismo tick (escaneo rápido, tests) empatarían y el orden quedaría al azar
  // del motor.
  return [
    {
      productoId: producto.id,
      nombre: producto.nombre,
      precioVenta: producto.precio,
      costo: producto.costo,
      cantidad: 1,
      imgPath: producto.imgPath,
    },
    ...items,
  ]
}

export function cambiarCantidadTicket(
  items: ItemTicket[],
  productoId: number,
  cantidad: number,
): ItemTicket[] {
  if (cantidad <= 0) return items.filter((item) => item.productoId !== productoId)

  return items.map((item) =>
    item.productoId === productoId ? { ...item, cantidad } : item,
  )
}

export function quitarDelTicket(
  items: ItemTicket[],
  productoId: number,
): ItemTicket[] {
  return items.filter((item) => item.productoId !== productoId)
}

export function calcularLinea(item: ItemTicket): LineaTicket {
  const tipoTarifa = tipoTarifaPorCantidad(item.cantidad)
  const precioUnitario = precioUnitarioPorCantidad(item.precioVenta, item.cantidad)
  const importeMinorista = redondearMoneda(item.precioVenta * item.cantidad)
  const importe = redondearMoneda(precioUnitario * item.cantidad)

  return {
    ...item,
    tipoTarifa,
    precioUnitario,
    importeMinorista,
    ahorro: redondearMoneda(importeMinorista - importe),
    importe,
  }
}

export function resumirTicket(items: ItemTicket[]): ResumenTicket {
  const lineas = items.map(calcularLinea)
  const subtotal = redondearMoneda(
    lineas.reduce((acc, linea) => acc + linea.importeMinorista, 0),
  )
  const total = redondearMoneda(lineas.reduce((acc, linea) => acc + linea.importe, 0))

  return {
    lineas,
    unidades: items.reduce((acc, item) => acc + item.cantidad, 0),
    subtotal,
    descuento: redondearMoneda(subtotal - total),
    impuesto: 0,
    total,
  }
}

export function formatearMoneda(valor: number): string {
  return `$${valor.toFixed(2)}`
}
