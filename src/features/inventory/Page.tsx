import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Boxes,
  Clock,
  FilterX,
  PackagePlus,
  PackageX,
  Plus,
  Minus,
  Search,
  SlidersHorizontal,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/cn";
import { evaluateExpiry } from "../../lib/dateUtils";
import { Button } from "../../components/ui/Button";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { CreateCategoryModal } from "../../components/inventory/CreateCategoryModal";
import { EditCategoryModal } from "../../components/inventory/EditCategoryModal";
import { CreateProductModal } from "./CreateProductModal";
import { ProductDetailModal } from "./ProductDetailModal";
import { LotesModal } from "./LotesModal";
import { ConfirmarPerdidaModal } from "./ConfirmarPerdidaModal";
import { MarcasModal } from "./MarcasModal";
import { InactivosModal } from "./InactivosModal";
import { ScanBadge } from "./ScanBadge";
import { esLoteVencido } from "./loteHelpers";
import { ProductQuickActionsModal } from "./quick-actions";
import { AccionGlobalModal } from "./quick-actions/AccionGlobalModal";
import type { AccionGlobal } from "./quick-actions/AccionGlobalModal";
import type { QuickActionView } from "./quick-actions/types";
import { EmptyState } from "../../components/ui/EmptyState";
import { useCategories } from "../../hooks/useCategories";
import { useHotkey } from "../../hooks/useHotkey";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";
import { MOD_IS_META } from "../../lib/hotkeys";
import { Input } from "../../components/ui/Input";
import { KpiCard } from "../../components/ui/KpiCard";
import { Pagination } from "../../components/ui/Pagination";
import { Pill } from "../../components/ui/Pill";
import { CustomSelect } from "../../components/ui/CustomSelect";
import {
  ProductCard,
  type ProductStatus,
} from "../../components/ui/ProductCard";
import { Tooltip } from "../../components/ui/Tooltip";
import { productosService } from "../../services/productos.service";
import { marcasService } from "../../services/marcas.service";
import { lotesService } from "../../services/lotes.service";
import type {
  Categoria,
  Lote,
  Marca,
  Producto,
  ProductoConLoteActivo,
} from "../../../electron/db/types";

type KpiFilter =
  | "all"
  | "low_stock"
  | "expiring_soon"
  | "out_of_stock"
  | "expired";

type OrdenInventario =
  | "creado_desc"
  | "creado_asc"
  | "nombre_asc"
  | "nombre_desc"
  | "stock_asc"
  | "stock_desc"
  | "margen_asc"
  | "sin_marca"
  | "sin_minimo";

const OPCIONES_ORDEN: { value: OrdenInventario; label: string }[] = [
  { value: "creado_desc", label: "Más nuevos primero" },
  { value: "creado_asc", label: "Más antiguos primero" },
  { value: "nombre_asc", label: "Alfabético A→Z" },
  { value: "nombre_desc", label: "Alfabético Z→A" },
  { value: "stock_asc", label: "Menor stock" },
  { value: "stock_desc", label: "Mayor stock" },
  { value: "margen_asc", label: "Menor margen" },
  { value: "sin_marca", label: "Sin marca" },
  { value: "sin_minimo", label: "Sin mínimo" },
];

/** Margen porcentual sobre el costo: null si no hay costo cargado (no computable). */
function margenPorcentaje(p: ProductoConLoteActivo): number | null {
  return p.costo > 0 ? ((p.precioVenta - p.costo) / p.costo) * 100 : null;
}

function ordenarProductos(
  productos: ProductoConLoteActivo[],
  orden: OrdenInventario,
): ProductoConLoteActivo[] {
  const comparadorNombre = (
    a: ProductoConLoteActivo,
    b: ProductoConLoteActivo,
  ) => a.nombre.localeCompare(b.nombre, "es");
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
        (a, b) => a.stockActual - b.stockActual || comparadorNombre(a, b),
      );
    case "stock_desc":
      return [...productos].sort(
        (a, b) => b.stockActual - a.stockActual || comparadorNombre(a, b),
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

type ProductoInventario = {
  id: number;
  name: string;
  variant: string | null;
  brand: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  expiresAt: string | null;
  codigoInterno: string;
  codigosBarras: string;
  status: "vencido" | "por-vencer" | "ok";
};

function derivarEstadoVencimiento(
  vencimiento: string | null,
): "vencido" | "por-vencer" | "ok" {
  if (!vencimiento) return "ok";
  const result = evaluateExpiry(vencimiento);
  if (!result) return "ok";
  if (result.status === "expired") return "vencido";
  if (result.status === "expiring_soon") return "por-vencer";
  return "ok";
}

function mapearProducto(
  producto: ProductoConLoteActivo,
  categorias: Categoria[],
  marcas: Marca[],
): ProductoInventario {
  const categoria = categorias.find((c) => c.id === producto.categoriaId);
  const marca = marcas.find((m) => m.id === producto.marcaId);
  // El vencimiento de la card sigue la regla FIFO: primer lote activo con stock.
  const vencimientoFifo = producto.loteActivoVencimiento;
  return {
    id: producto.id,
    name: producto.nombre,
    variant: producto.variante,
    brand: marca?.nombre ?? "",
    category: categoria?.nombre ?? "",
    price: producto.precioVenta,
    cost: producto.costo,
    stock: producto.stockActual,
    minStock: producto.stockMinimo,
    expiresAt: vencimientoFifo,
    codigoInterno: producto.codigoInterno ?? "",
    codigosBarras: producto.codigosBarras ?? "",
    status: derivarEstadoVencimiento(vencimientoFifo),
  };
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function derivarStatus(p: ProductoInventario): ProductStatus {
  if (p.status === "vencido") return "expired";
  if (p.status === "por-vencer") return "expiring_soon";
  if (p.stock === 0) return "out_of_stock";
  if (p.stock < p.minStock) return "low_stock";
  return "normal";
}

const PAGE_SIZE = 50;

/** Modificador de atajos según plataforma: "Ctrl" o "Cmd". */
const MOD_TEXTO = MOD_IS_META ? "Cmd" : "Ctrl";
/** Formato W3C para aria-keyshortcuts (ej: "Control+KeyN"). */
const modAtajo = (tecla: string, shift = false) =>
  `${MOD_IS_META ? "Meta" : "Control"}${shift ? "+Shift" : ""}+Key${tecla}`;

export function InventoryPage() {
  const [busqueda, setBusqueda] = useState("");
  const [barcodeEscaneado, setBarcodeEscaneado] = useState<string | null>(null);
  const [inactivosAbierta, setInactivosAbierta] = useState(false);
  const [activeKpiFilter, setActiveKpiFilter] = useState<KpiFilter>("all");
  const [paginaActual, setPaginaActual] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [orden, setOrden] = useState<OrdenInventario>("creado_desc");
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [marcasAbiertas, setMarcasAbiertas] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] =
    useState<Producto | null>(null);
  const [productForQuickActions, setProductForQuickActions] =
    useState<Producto | null>(null);
  const [vistaAccionInicial, setVistaAccionInicial] =
    useState<QuickActionView>("menu");
  const [aperturaAcciones, setAperturaAcciones] = useState(0);
  const [lotesProducto, setLotesProducto] = useState<Producto | null>(null);
  const [abrirInventarioAuto, setAbrirInventarioAuto] = useState(false);
  const [togglingActivoId, setTogglingActivoId] = useState<number | null>(null);
  const [perdidaSeleccion, setPerdidaSeleccion] = useState<{
    producto: Producto;
    lote: Lote;
  } | null>(null);
  const [accionGlobal, setAccionGlobal] = useState<AccionGlobal | null>(null);
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(
    null,
  );
  const [deletingCategory, setDeletingCategory] = useState<Categoria | null>(
    null,
  );
  const [deletingProduct, setDeletingProduct] = useState<Producto | null>(null);
  const { categories, addCategory, updateCategory, removeCategory } =
    useCategories();

  const buscadorRef = useRef<HTMLInputElement>(null);
  const grillaRef = useRef<HTMLDivElement>(null);
  /** Índice de la card seleccionada para navegar con ↑/↓ (null = sin foco de teclado). */
  const [cardFoco, setCardFoco] = useState<number | null>(null);

  const [productosCrudos, setProductosCrudos] = useState<
    ProductoConLoteActivo[]
  >([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState<string | null>(null);

  const obtenerProductos = useCallback(async (): Promise<
    ProductoConLoteActivo[]
  > => {
    return productosService.getAll();
  }, []);

  const obtenerMarcas = useCallback(async (): Promise<Marca[]> => {
    return marcasService.getAll();
  }, []);

  const recargarMarcas = useCallback(async () => {
    const data = await marcasService.getAll();
    setMarcas(data);
  }, []);

  // Fetch inicial al montar. Los setState viven en callbacks asíncronos (.then/.catch)
  // y el flag "activo" evita setState después del desmontaje. Nunca setState síncrono
  // en el cuerpo del effect (regla react-hooks/set-state-in-effect).
  useEffect(() => {
    let activo = true;
    void Promise.all([obtenerProductos(), obtenerMarcas()])
      .then(([data, marcasData]) => {
        if (!activo) return;
        setProductosCrudos(data);
        setMarcas(marcasData);
        setCargandoProductos(false);
      })
      .catch((err) => {
        if (!activo) return;
        setErrorProductos(
          err instanceof Error ? err.message : "Error al cargar productos",
        );
        setCargandoProductos(false);
      });
    return () => {
      activo = false;
    };
  }, [obtenerProductos, obtenerMarcas]);

  const refreshProductos = useCallback(async (): Promise<
    ProductoConLoteActivo[]
  > => {
    setCargandoProductos(true);
    setErrorProductos(null);
    try {
      const [data, marcasData] = await Promise.all([
        obtenerProductos(),
        obtenerMarcas(),
      ]);
      setProductosCrudos(data);
      setMarcas(marcasData);
      return data;
    } catch (err) {
      setErrorProductos(
        err instanceof Error ? err.message : "Error al cargar productos",
      );
      return [];
    } finally {
      setCargandoProductos(false);
    }
  }, [obtenerProductos, obtenerMarcas]);

  const productosActivos = useMemo(() => {
    const activos = productosCrudos.filter((p) => p.activo);
    const filtrados = activos.filter(
      (p) =>
        (orden !== "sin_marca" || p.marcaId === null) &&
        (orden !== "sin_minimo" || p.stockMinimo === 0),
    );
    return ordenarProductos(filtrados, orden).map((p) =>
      mapearProducto(p, categories, marcas),
    );
  }, [productosCrudos, orden, categories, marcas]);

  const productosBase = useMemo(() => {
    return ordenarProductos(
      productosCrudos.filter((p) => p.activo),
      "creado_desc",
    ).map((p) => mapearProducto(p, categories, marcas));
  }, [productosCrudos, categories, marcas]);

  const productos = useMemo(() => {
    const visibles = productosCrudos.filter((p) => p.activo);
    const filtrados = visibles.filter(
      (p) =>
        (orden !== "sin_marca" || p.marcaId === null) &&
        (orden !== "sin_minimo" || p.stockMinimo === 0),
    );
    return ordenarProductos(filtrados, orden).map((p) =>
      mapearProducto(p, categories, marcas),
    );
  }, [productosCrudos, orden, categories, marcas]);

  const handleKpiClick = (filter: KpiFilter) => {
    setActiveKpiFilter((prev) => {
      const nuevo = prev === filter ? "all" : filter;
      if (nuevo !== prev) {
        setPaginaActual(1);
        setCardFoco(null);
      }
      return nuevo;
    });
    setBarcodeEscaneado(null);
  };

  const hayFiltroActivo =
    barcodeEscaneado !== null ||
    busqueda.trim() !== "" ||
    activeKpiFilter !== "all" ||
    selectedCategory !== "all" ||
    orden !== "creado_desc";

  const limpiarFiltros = () => {
    setBusqueda("");
    setBarcodeEscaneado(null);
    setActiveKpiFilter("all");
    setSelectedCategory("all");
    setOrden("creado_desc");
    setPaginaActual(1);
    setCardFoco(null);
  };

  const handleOpenLotes = (producto: Producto) => {
    setSelectedProductForDetail(null);
    setAbrirInventarioAuto(false);
    setLotesProducto(producto);
  };

  const abrirAccionesRapidas = (producto: Producto, vista: QuickActionView) => {
    setVistaAccionInicial(vista);
    setAperturaAcciones((n) => n + 1);
    setProductForQuickActions(producto);
  };

  const handleToggleActivo = useCallback(
    async (producto: Producto, activo: boolean) => {
      setTogglingActivoId(producto.id);
      try {
        await productosService.toggle(producto.id, activo);
        toast.success(
          activo
            ? `Producto "${producto.nombre}" reactivado`
            : `Producto "${producto.nombre}" desactivado`,
        );
        await refreshProductos();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "No se pudo cambiar el estado",
        );
      } finally {
        setTogglingActivoId(null);
      }
    },
    [refreshProductos],
  );

  const handleConfirmarPerdida = async (producto: Producto) => {
    try {
      const lotes = await lotesService.getByProducto(producto.id);
      const loteActivo =
        lotes
          .filter(
            (l): l is Lote & { fechaVence: string } =>
              l.cantidadActual > 0 && l.fechaVence !== null,
          )
          .sort((a, b) => a.fechaVence.localeCompare(b.fechaVence))[0] ?? null;
      if (!loteActivo || !esLoteVencido(loteActivo.fechaVence)) return;
      setPerdidaSeleccion({ producto, lote: loteActivo });
    } catch {
      toast.error("No se pudieron cargar los lotes del producto");
    }
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    productos.forEach((p) => {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    });
    return counts;
  }, [productos]);
  const totalProducts = productos.length;
  const totalInactivos = productosCrudos.filter((p) => !p.activo).length;

  const { filasFiltradas, escaneoVigente } = useMemo(() => {
    // El escaneo filtra "en segundo plano": la grilla muestra solo el producto
    // escaneado SIN escribir el código en el input. Cuando el cajero vuelve a
    // teclear, el filtro textual retoma el control (onChange limpia el estado).
    // El escaneo es DERIVADO (no se limpia con setState): solo está vigente
    // mientras su código coincida con algún producto. Si el código se borra o
    // se renombra, el badge desaparece y la grilla vuelve sola al filtro
    // textual (filtros "limpios" sin efecto ni escritura de refs).
    const coincideTexto = (p: ProductoInventario, termino: string) => {
      const texto = normalizar(termino.trim());
      return (
        !texto ||
        normalizar(p.name).includes(texto) ||
        normalizar(p.brand).includes(texto) ||
        normalizar(p.variant ?? "").includes(texto) ||
        normalizar(p.codigoInterno).includes(texto) ||
        normalizar(p.codigosBarras).includes(texto)
      );
    };

    const coincideCategoria = (p: ProductoInventario) => {
      if (selectedCategory === "all") return true;
      const catSel = categories.find((c) => String(c.id) === selectedCategory);
      return catSel ? p.category === catSel.nombre : false;
    };

    const coincideKpi = (p: ProductoInventario) => {
      switch (activeKpiFilter) {
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
    };

    const pasaFiltros = (p: ProductoInventario, termino: string) =>
      coincideTexto(p, termino) && coincideCategoria(p) && coincideKpi(p);

    const filasConEscaneo = barcodeEscaneado
      ? productos.filter((p) => pasaFiltros(p, barcodeEscaneado))
      : null;
    const coincideEscaneo =
      filasConEscaneo !== null && filasConEscaneo.length > 0;

    let filasFiltradas: ProductoInventario[];
    if (barcodeEscaneado === null) {
      filasFiltradas = productos.filter((p) => pasaFiltros(p, busqueda));
    } else if (coincideEscaneo) {
      filasFiltradas = filasConEscaneo!;
    } else {
      filasFiltradas = productosBase;
    }

    return {
      filasFiltradas,
      escaneoVigente: coincideEscaneo,
    };
  }, [barcodeEscaneado, busqueda, selectedCategory, activeKpiFilter, categories, productos, productosBase]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(filasFiltradas.length / PAGE_SIZE),
  );
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const filasPagina = filasFiltradas.slice(
    (paginaSegura - 1) * PAGE_SIZE,
    paginaSegura * PAGE_SIZE,
  );

  const totalItems = filasFiltradas.length;

  const kpis = useMemo(
    () => ({
      stockBajo: productosActivos.filter(
        (p) => p.stock < p.minStock && p.stock > 0,
      ).length,
      porVencer: productosActivos.filter((p) => p.status === "por-vencer")
        .length,
      agotados: productosActivos.filter((p) => p.stock === 0).length,
      vencidos: productosActivos.filter((p) => p.status === "vencido").length,
    }),
    [productosActivos],
  );

  // Ajuste de stock y merma requieren un lote activo (stock > 0): sin productos
  // con stock, esas acciones globales no tienen sentido y se bloquean.
  const hayStockDisponible = productosActivos.some((p) => p.stock > 0);

  // ── Atajos de teclado (deshabilitados mientras hay un modal abierto) ──
  const hayModalAbierto =
    inactivosAbierta ||
    isCreateProductOpen ||
    marcasAbiertas ||
    isCreateCategoryOpen ||
    selectedProductForDetail !== null ||
    productForQuickActions !== null ||
    lotesProducto !== null ||
    deletingProduct !== null ||
    deletingCategory !== null ||
    editingCategory !== null ||
    perdidaSeleccion !== null ||
    accionGlobal !== null;

  // ── Scanner de código de barras (deshabilitado mientras hay un modal abierto) ──
  // Búsqueda EN SEGUNDO PLANO: el scanner jamás escribe en el buscador (el
  // servicio lo retiene en bloqueo). Si el producto existe y está activo, el
  // código filtra la grilla para mostrar SOLO esa card, SIN resaltar con ring;
  // si no existe, o está desactivado, se avisa con toast y el input queda intacto.
  const buscarPorEscaneo = async (barcode: string) => {
    const producto = await productosService.scan(barcode);
    if (!producto) {
      toast.error(`No existe ningún producto con el código "${barcode}"`);
      setBarcodeEscaneado(null);
      return;
    }

    if (!producto.activo) {
      toast.error(
        `El producto "${producto.nombre}" está desactivado: no aparece en la búsqueda`,
      );
      setBarcodeEscaneado(null);
      return;
    }
    setBusqueda("");
    setBarcodeEscaneado(barcode);
    setActiveKpiFilter("all");
    setSelectedCategory("all");
    setOrden("creado_desc");
    setPaginaActual(1);
    buscadorRef.current?.focus();
  };

  useBarcodeScanner(
    "inventory",
    (barcode) => {
      void buscarPorEscaneo(barcode);
    },
    !hayModalAbierto,
  );

  /** Índice de cardFoco solo si sigue siendo válido para la página actual. */
  const cardFocoValida =
    cardFoco !== null && cardFoco >= 0 && cardFoco < filasPagina.length
      ? cardFoco
      : null;

  const enfocarBuscador = () => {
    buscadorRef.current?.focus();
    buscadorRef.current?.select();
  };

  /** true si el evento proviene de un control interactivo (button, link, input…). */
  const esTargetInteractivo = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return (
      target.closest(
        'button, a, select, textarea, input, [role="button"], [role="menuitem"], [role="option"], [role="listbox"], [aria-expanded="true"], [contenteditable]',
      ) !== null
    );
  };

  const navegarCard = (delta: number) => {
    if (filasPagina.length === 0) return;
    const base = cardFocoValida ?? (delta > 0 ? -1 : 0);
    const nuevo = Math.min(Math.max(base + delta, 0), filasPagina.length - 1);
    setCardFoco(nuevo);
    grillaRef.current
      ?.querySelector(`[data-card-idx="${nuevo}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const abrirCardFoco = () => {
    if (cardFocoValida === null) return;
    const fila = filasPagina[cardFocoValida];
    const raw = productosCrudos.find((p) => p.id === fila.id);
    if (raw) abrirAccionesRapidas(raw, "menu");
  };

  // F2 o "/" → foco al buscador (también mientras se escribe en otro input).
  useHotkey("f2", enfocarBuscador, {
    enabled: !hayModalAbierto,
    ignoreInputs: false,
  });
  useHotkey("/", enfocarBuscador, { enabled: !hayModalAbierto });
  // Ctrl+N → nuevo producto.
  useHotkey(
    "mod+n",
    () => {
      setIsCreateProductOpen(true);
    },
    { enabled: !hayModalAbierto, ignoreInputs: false },
  );
  // Ctrl+D → limpiar filtros activos.
  useHotkey(
    "mod+d",
    () => {
      if (hayFiltroActivo) limpiarFiltros();
    },
    { enabled: !hayModalAbierto, ignoreInputs: false },
  );
  // Ctrl+M → marcas.
  useHotkey(
    "mod+m",
    () => {
      setMarcasAbiertas(true);
    },
    { enabled: !hayModalAbierto, ignoreInputs: false },
  );
  // Ctrl+Shift+N → nueva categoría.
  useHotkey(
    "mod+shift+n",
    () => {
      setIsCreateCategoryOpen(true);
    },
    { enabled: !hayModalAbierto, ignoreInputs: false },
  );
  // ↑ / ↓ → navegar entre cards; Enter → abrir quick actions de la card foco.
  useHotkey(
    "arrowdown",
    (event) => {
      if (esTargetInteractivo(event.target)) return;
      navegarCard(1);
    },
    { enabled: !hayModalAbierto },
  );
  useHotkey(
    "arrowup",
    (event) => {
      if (esTargetInteractivo(event.target)) return;
      navegarCard(-1);
    },
    { enabled: !hayModalAbierto },
  );
  useHotkey(
    "enter",
    (event) => {
      if (esTargetInteractivo(event.target)) return;
      abrirCardFoco();
    },
    { enabled: !hayModalAbierto },
  );

  return (
    <div className="flex flex-col gap-3 pt-4 md:pt-6">
      {/* ── Encabezado ── */}
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="flex  items-center gap-2">
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            Inventario
          </h1>
          <Tooltip
            content={`${productos.length} ${
              productos.length === 1 ? "producto" : "productos"
            }`}
            placement="top"
          >
            <span className="inline-flex shrink-0 select-none items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-display text-base font-bold text-emerald-600 dark:border-slate-700/80 dark:bg-slate-800 dark:text-emerald-400">
              {productos.length}
            </span>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip
            content={`Ver los productos desactivados (${totalInactivos})`}
            placement="top"
          >
            <button
              type="button"
              onClick={() => setInactivosAbierta(true)}
              aria-label="Ver desactivados"
              className="flex shrink-0 select-none cursor-pointer items-center gap-1.5 rounded-2xl border border-slate-200 px-2 py-2 text-sm font-medium text-slate-400 transition-colors duration-150 hover:border-slate-300 hover:text-slate-600 dark:border-slate-700/80 dark:text-slate-500 dark:hover:border-slate-600 dark:hover:text-slate-300"
            >
              <Archive className="h-5 w-5" />
              <span className="select-none rounded-full bg-slate-200 px-1.5 py-0.5 text-xs font-semibold leading-none text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {totalInactivos}
              </span>
            </button>
          </Tooltip>
          <Tooltip
            content={`Abrir marcas · ${MOD_TEXTO}+M`}
            placement="bottom"
          >
            <Button
              variant="outline"
              onClick={() => setMarcasAbiertas(true)}
              aria-keyshortcuts={modAtajo("M")}
              className="whitespace-nowrap rounded-2xl px-2 py-2 text-xs sm:text-sm "
            >
              Marcas
              <span className=" select-none rounded-full  border border-slate-200 bg-slate-100 px-2  py-0.5 text-[10px] sm:text-xs font-semibold text-slate-600 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-300">
                {marcas.filter((m) => m.activo).length}
              </span>
            </Button>
          </Tooltip>
          <Tooltip
            content={`Nuevo producto · ${MOD_TEXTO}+N`}
            placement="bottom"
          >
            <Button
              variant="primary"
              onClick={() => setIsCreateProductOpen(true)}
              aria-keyshortcuts={modAtajo("N")}
              className="h-10 shrink-0 gap-2 rounded-2xl px-4 text-sm font-bold shadow-xs sm:h-12 sm:px-6 sm:text-base"
            >
              <PackagePlus className="h-5 w-5" />
              <span>Nuevo producto</span>
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="mt-2 grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4">
        <KpiCard
          className="animate-entry-up stagger-1"
          icon={<AlertTriangle className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
          iconBgClass="bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
          title="Stock bajo"
          value={kpis.stockBajo}
          subtitle="por debajo del mínimo"
          subtitleHighlightClass="font-medium text-amber-600 dark:text-amber-400"
          onClick={() => handleKpiClick("low_stock")}
          isActive={activeKpiFilter === "low_stock"}
          activeColor="amber"
        />
        <KpiCard
          className="animate-entry-up stagger-2"
          icon={<Clock className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
          iconBgClass="bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
          title="Por vencer"
          value={kpis.porVencer}
          subtitle="próximos 14 días"
          subtitleHighlightClass="font-medium text-amber-600 dark:text-amber-400"
          onClick={() => handleKpiClick("expiring_soon")}
          isActive={activeKpiFilter === "expiring_soon"}
          activeColor="amber"
        />
        <KpiCard
          className="animate-entry-up stagger-3"
          icon={<PackageX className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
          iconBgClass="bg-red-100 text-red-600 border border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-900/60"
          title="Agotados"
          value={kpis.agotados}
          subtitle="sin existencias"
          subtitleHighlightClass="font-medium text-red-600/80 dark:text-red-400/80"
          onClick={() => handleKpiClick("out_of_stock")}
          isActive={activeKpiFilter === "out_of_stock"}
          activeColor="red"
        />
        <KpiCard
          className="animate-entry-up stagger-4"
          icon={<XCircle className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
          iconBgClass="bg-red-100 text-red-600 border border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-900/60"
          title="Vencidos"
          value={kpis.vencidos}
          subtitle="requieren baja o descarte"
          subtitleHighlightClass="font-medium text-red-600/80 dark:text-red-400/80"
          onClick={() => handleKpiClick("expired")}
          isActive={activeKpiFilter === "expired"}
          activeColor="red"
        />
      </div>

      {/* ── Contenedor sticky: categorías + toolbar se anclan al top al scrollear ── */}
      <div className="sticky top-0 z-20 flex w-full min-w-0 flex-col gap-2.5 border-slate-200/80 bg-[#f4f6f8] pt-3 pb-3 transition-colors select-none relative after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-3 after:bg-gradient-to-b after:from-slate-900/10 after:to-transparent after:content-[''] dark:border-slate-800/60 dark:bg-[#0b0f17] dark:after:from-black/45">
        {/* ── Barra de categorías: anclaje fijo + carrusel desplazable ── */}
        <div className="flex w-full items-center select-none">
            {/* 1. Anclaje fijo: botón Nueva + separador + fondo opaco + máscara degradada */}
            <div className="relative z-10 flex shrink-0 items-center bg-[#f4f6f8]  pb-2 dark:bg-[#0b0f17]">
              <Tooltip
                content={`Crear una nueva categoría · ${MOD_TEXTO}+Shift+N`}
                placement="top"
              >
                <button
                  type="button"
                  onClick={() => setIsCreateCategoryOpen(true)}
                  aria-label="Nueva categoría"
                  aria-keyshortcuts={modAtajo("N", true)}
                  className={cn(
                    "h-8 px-3 rounded-full text-xs font-semibold shrink-0 select-none",
                    "flex items-center gap-1.5 transition-all duration-150 shadow-xs cursor-pointer",
                    "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/30",
                    "dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30",
                    "active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                  )}
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>Nueva</span>
                </button>
              </Tooltip>

              <div
                className="mx-2.5 h-4 w-px shrink-0 bg-slate-300 dark:bg-slate-700/60"
                aria-hidden="true"
              />
            </div>

            {/* 2. Carrusel desplazable: Todas + categorías */}
            <div className="custom-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pl-1 pb-2 pr-8 sm:pr-10">
              <Pill
                label="Todas"
                active={selectedCategory === "all"}
                showActions={false}
                count={totalProducts}
                onSelect={() => {
                  setSelectedCategory("all");
                  setBarcodeEscaneado(null);
                  setPaginaActual(1);
                  setCardFoco(null);
                }}
              />
              {categories.map((categoria) => (
                <Pill
                  key={categoria.id}
                  label={categoria.nombre}
                  count={categoryCounts[categoria.nombre] || 0}
                  active={selectedCategory === String(categoria.id)}
                  canDelete={(categoryCounts[categoria.nombre] || 0) === 0}
                  onSelect={() => {
                    setSelectedCategory((prev) =>
                      prev === String(categoria.id)
                        ? "all"
                        : String(categoria.id),
                    );
                    setBarcodeEscaneado(null);
                    setPaginaActual(1);
                    setCardFoco(null);
                  }}
                  onEdit={() => setEditingCategory(categoria)}
                  onDelete={() => setDeletingCategory(categoria)}
                />
              ))}
              <div
                className="w-6 shrink-0 pointer-events-none"
                aria-hidden="true"
              />
            </div>
        </div>

        {/* ── Barra de herramientas ── */}
        <div className="flex pt-0.5 w-full  min-w-0 flex-col items-stretch justify-between gap-3 lg:flex-row lg:items-center">
          {/* GRUPO BÚSQUEDA: siempre juntos, ancho completo en todos los breakpoints */}
          <div className="flex min-w-0 flex-1 shrink-0 items-center gap-1.5 lg:flex-1">
            <Input
              ref={buscadorRef}
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setBarcodeEscaneado(null);
                setPaginaActual(1);
                setCardFoco(null);
              }}
              placeholder="Buscar por producto, marca, variante o código..."
              leftIcon={<Search size={16} />}
              className="w-full"
              wrapperClassName="flex-1 min-w-[240px]"
              aria-label="Buscar producto"
              aria-keyshortcuts="F2"
              rightAction={
                busqueda.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setBusqueda("");
                      setPaginaActual(1);
                    }}
                    aria-label="Limpiar búsqueda"
                    className="grid h-5 w-5 cursor-pointer place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  >
                    <X size={14} />
                  </button>
                ) : undefined
              }
            />
            <CustomSelect
              options={OPCIONES_ORDEN}
              value={orden}
              onChange={(value) => {
                setOrden(value as OrdenInventario);
                setBarcodeEscaneado(null);
                setPaginaActual(1);
                setCardFoco(null);
              }}
              className="w-44 shrink-0 sm:w-48"
            />

            <Tooltip
              content={
                hayFiltroActivo
                  ? `Limpiar todos los filtros · ${MOD_TEXTO}+D`
                  : undefined
              }
              placement="top"
            >
              <button
                type="button"
                onClick={limpiarFiltros}
                disabled={!hayFiltroActivo}
                aria-label="Limpiar todos los filtros"
                aria-keyshortcuts={modAtajo("D")}
                className={cn(
                  "shrink-0 select-none rounded-xl p-2 transition-colors duration-150",
                  hayFiltroActivo
                    ? "cursor-pointer text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
                    : "cursor-not-allowed text-slate-400 opacity-25 dark:text-slate-600",
                )}
              >
                <FilterX className="h-5 w-5" />
              </button>
            </Tooltip>
          </div>
          <div className="flex flex-nowrap items-center gap-2.5 overflow-x-auto pb-1 lg:pb-0">
            <div
              className="h-6 w-px hidden lg:block shrink-0 self-center bg-slate-200 sm:h-7 dark:bg-slate-700/60"
              aria-hidden="true"
            />

            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setAccionGlobal("agregar-inventario")}
              disabled={productos.length === 0}
              className="whitespace-nowrap"
            >
              Agregar Inventario
            </Button>
            <Button
              variant="outline"
              icon={<SlidersHorizontal size={16} />}
              onClick={() => setAccionGlobal("ajustar-stock")}
              disabled={!hayStockDisponible}
              className="whitespace-nowrap"
            >
              Ajustar stock
            </Button>
            <Button
              variant="danger"
              icon={<Minus size={16} />}
              onClick={() => setAccionGlobal("registrar-perdida")}
              disabled={!hayStockDisponible}
              className="whitespace-nowrap"
            >
              Registrar merma
            </Button>
          </div>
        </div>
      </div>

      {/* ── Cuadrícula de productos ── */}
      {cargandoProductos && productos.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-12 w-12 stroke-[1.5]" />}
          title="Cargando productos…"
          description="Estamos trayendo el inventario desde la base de datos."
        />
      ) : errorProductos && productos.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="h-12 w-12 stroke-[1.5]" />}
          title="No se pudieron cargar los productos"
          description={errorProductos}
          action={
            <Button variant="outline" onClick={() => void refreshProductos()}>
              Reintentar
            </Button>
          }
        />
      ) : filasFiltradas.length === 0 ? (
        productos.length === 0 ? (
          <EmptyState
            icon={<Boxes className="h-12 w-12 stroke-[1.5]" />}
            title="Todavía no hay productos"
            description="Creá tu primer producto para empezar a controlar el inventario."
            action={
              <Button
                variant="primary"
                onClick={() => setIsCreateProductOpen(true)}
              >
                <PackagePlus className="h-4 w-4" />
                Nuevo producto
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Boxes className="h-12 w-12 stroke-[1.5]" />}
            title="No se encontraron productos"
            description="No hay productos que coincidan con tu búsqueda o filtros actuales. Probá con otra búsqueda o limpiá los filtros."
            action={
              hayFiltroActivo ? (
                <Tooltip content={`Limpiar todos los filtros · ${MOD_TEXTO}+D`}>
                  <Button variant="outline" onClick={limpiarFiltros}>
                    Limpiar filtros
                  </Button>
                </Tooltip>
              ) : undefined
            }
          />
        )
      ) : (
        <div
          ref={grillaRef}
          className="mt-2 px-0.5 flex w-full min-w-0 flex-col gap-2.5"
        >
          {filasPagina.map((producto, index) => {
            const raw = productosCrudos.find((p) => p.id === producto.id);
            return (
              <div
                key={producto.id}
                data-card-idx={index}
                className="w-full scroll-mt-36"
              >
                <ProductCard
                  className={cn(
                    cardFocoValida === index && "ring-2 ring-emerald-500/70",
                  )}
                  style={{
                    animationDelay: index < 8 ? `${index * 20}ms` : "0ms",
                  }}
                  producto={raw}
                  category={producto.category}
                  name={producto.name}
                  variant={producto.variant}
                  brand={producto.brand || undefined}
                  stock={producto.stock}
                  minStock={producto.minStock}
                  price={producto.price}
                  expiresAt={producto.expiresAt ?? undefined}
                  status={derivarStatus(producto)}
                  codigoInterno={producto.codigoInterno}
                  codigosBarras={producto.codigosBarras}
                  highlightQuery={busqueda}
                  inactivo={false}
                  onToggleActivo={raw ? handleToggleActivo : undefined}
                  togglingActivo={togglingActivoId === producto.id}
                  onOpenQuickActions={
                    raw ? (p) => abrirAccionesRapidas(p, "menu") : undefined
                  }
                  onOpenLotes={
                    raw
                      ? (p) => {
                          setSelectedProductForDetail(null);
                          setAbrirInventarioAuto(false);
                          setLotesProducto(p);
                        }
                      : undefined
                  }
                  onDeleteProduct={
                    raw ? (p) => setDeletingProduct(p) : undefined
                  }
                  onOpenDetail={() => {
                    const detalle = productosCrudos.find(
                      (p) => p.id === producto.id,
                    );
                    if (detalle) setSelectedProductForDetail(detalle);
                  }}
                  onEditPrice={
                    raw
                      ? (p) => abrirAccionesRapidas(p, "precio-venta")
                      : undefined
                  }
                  onConfirmarPerdida={
                    producto.status === "vencido" && producto.stock > 0
                      ? () => {
                          const lote = productosCrudos.find(
                            (p) => p.id === producto.id,
                          );
                          if (lote) void handleConfirmarPerdida(lote);
                        }
                      : undefined
                  }
                  onAgregarInventario={
                    raw && producto.stock <= 0
                      ? () => abrirAccionesRapidas(raw, "agregar-inventario")
                      : undefined
                  }
                />
              </div>
            );
          })}

          <div className="mt-2 flex flex-col items-center justify-between gap-2 sm:flex-row">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
              Mostrando{" "}
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {(paginaSegura - 1) * PAGE_SIZE + 1}–
                {Math.min(paginaSegura * PAGE_SIZE, totalItems)}
              </span>{" "}
              de {totalItems} productos
            </span>
            <Pagination
              currentPage={paginaSegura}
              totalPages={totalPaginas}
              onPageChange={(p) => {
                setPaginaActual(p);
                setCardFoco(null);
              }}
            />
          </div>
        </div>
      )}

      {barcodeEscaneado && escaneoVigente && (
        <ScanBadge
          key={barcodeEscaneado}
          barcode={barcodeEscaneado}
          onClose={() => {
            setBarcodeEscaneado(null);
            setPaginaActual(1);
            setCardFoco(null);
            buscadorRef.current?.focus();
          }}
        />
      )}

      <CreateCategoryModal
        isOpen={isCreateCategoryOpen}
        onClose={() => setIsCreateCategoryOpen(false)}
        categories={categories}
        onSuccess={(newCategory) => {
          addCategory(newCategory);
          setSelectedCategory(String(newCategory.id));
          toast.success(`Categoría "${newCategory.nombre}" creada`);
        }}
      />

      <MarcasModal
        isOpen={marcasAbiertas}
        onClose={() => setMarcasAbiertas(false)}
        marcas={marcas}
        productos={productosCrudos}
        onChanged={() => void recargarMarcas()}
        onSelectMarca={(nombre) => {
          setBusqueda(nombre);
          setMarcasAbiertas(false);
          setPaginaActual(1);
        }}
      />

      <InactivosModal
        isOpen={inactivosAbierta}
        onClose={() => setInactivosAbierta(false)}
        productos={productosCrudos.filter((p) => !p.activo)}
        marcas={marcas}
        categorias={categories}
        onChanged={() => void refreshProductos()}
      />

      <EditCategoryModal
        isOpen={editingCategory !== null}
        onClose={() => setEditingCategory(null)}
        category={editingCategory}
        categories={categories}
        onSuccess={(updatedCategory) => {
          updateCategory(updatedCategory);
          setEditingCategory(null);
          toast.success(`Categoría "${updatedCategory.nombre}" actualizada`);
        }}
      />

      <ConfirmModal
        isOpen={deletingCategory !== null}
        onClose={() => setDeletingCategory(null)}
        onConfirm={async () => {
          if (!deletingCategory) return;
          try {
            await removeCategory(deletingCategory.id);
            if (selectedCategory === String(deletingCategory.id)) {
              setSelectedCategory("all");
              setPaginaActual(1);
            }
            toast.success(`Categoría "${deletingCategory.nombre}" eliminada`);
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "No se pudo eliminar la categoría",
            );
            throw error;
          }
        }}
        title="Eliminar categoría"
        description={`¿Estás seguro de que deseas eliminar la categoría "${deletingCategory?.nombre}"? Esta acción no se puede deshacer.`}
      />

      <ConfirmModal
        isOpen={deletingProduct !== null}
        onClose={() => setDeletingProduct(null)}
        onConfirm={async () => {
          if (!deletingProduct) return;
          try {
            await productosService.delete(deletingProduct.id);
            setProductForQuickActions((prev) =>
              prev?.id === deletingProduct.id ? null : prev,
            );
            setLotesProducto((prev) =>
              prev?.id === deletingProduct.id ? null : prev,
            );
            toast.success(`Producto "${deletingProduct.nombre}" eliminado`);
            void refreshProductos();
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "No se pudo eliminar el producto",
            );
            throw error;
          }
        }}
        title="Eliminar producto"
        description={`¿Estás seguro de que deseas eliminar "${deletingProduct?.nombre}"? Se eliminarán sus lotes. Los movimientos y las ventas históricas se conservan para auditoría, pero quedan desvinculados del producto. Esta acción no se puede deshacer.`}
      />

      <CreateProductModal
        isOpen={isCreateProductOpen}
        onClose={() => setIsCreateProductOpen(false)}
        categorias={categories}
        onSuccess={() => void refreshProductos()}
        onCategoriaCreada={addCategory}
      />

      {selectedProductForDetail && (
        <ProductDetailModal
          isOpen={!!selectedProductForDetail}
          product={selectedProductForDetail}
          marcaNombre={
            marcas.find(
              (marca) => marca.id === selectedProductForDetail.marcaId,
            )?.nombre ?? ""
          }
          categoriaNombre={
            categories.find(
              (categoria) =>
                categoria.id === selectedProductForDetail.categoriaId,
            )?.nombre ?? ""
          }
          onClose={() => setSelectedProductForDetail(null)}
          onOpenLotes={() => {
            setSelectedProductForDetail(null);
            setLotesProducto(selectedProductForDetail);
            setAbrirInventarioAuto(false);
          }}
          onAgregarInventario={() => {
            setSelectedProductForDetail(null);
            setAbrirInventarioAuto(true);
            setLotesProducto(selectedProductForDetail);
          }}
          onEdit={() => {
            setProductForQuickActions(selectedProductForDetail);
            setSelectedProductForDetail(null);
          }}
          onDelete={() => {
            setDeletingProduct(selectedProductForDetail);
            setSelectedProductForDetail(null);
          }}
          onMutated={() => {
            void refreshProductos().then((dataActualizada) => {
              setSelectedProductForDetail((prev) =>
                prev
                  ? (dataActualizada.find((p) => p.id === prev.id) ?? prev)
                  : prev,
              );
            });
          }}
        />
      )}

      <ProductQuickActionsModal
        key={aperturaAcciones}
        isOpen={productForQuickActions !== null}
        product={productForQuickActions}
        vistaInicial={vistaAccionInicial}
        marcaNombre={
          productForQuickActions
            ? (marcas.find(
                (marca) => marca.id === productForQuickActions.marcaId,
              )?.nombre ?? "")
            : ""
        }
        categoriaNombre={
          productForQuickActions
            ? (categories.find(
                (categoria) =>
                  categoria.id === productForQuickActions.categoriaId,
              )?.nombre ?? "")
            : ""
        }
        categorias={categories}
        onClose={() => setProductForQuickActions(null)}
        onSuccess={() => {
          void refreshProductos().then((dataActualizada) => {
            setProductForQuickActions((prev) =>
              prev
                ? (dataActualizada.find((p) => p.id === prev.id) ?? prev)
                : prev,
            );
          });
        }}
        onCategoriaCreada={addCategory}
        onOpenLotes={() => {
          if (productForQuickActions) {
            setProductForQuickActions(null);
            handleOpenLotes(productForQuickActions);
          }
        }}
        onConfirmarPerdida={(producto, lote) => {
          setProductForQuickActions(null);
          setPerdidaSeleccion({ producto, lote });
        }}
      />

      {lotesProducto && (
        <LotesModal
          isOpen={lotesProducto !== null}
          product={lotesProducto}
          marcaNombre={
            marcas.find((m) => m.id === lotesProducto.marcaId)?.nombre ?? ""
          }
          categoriaNombre={
            categories.find((c) => c.id === lotesProducto.categoriaId)
              ?.nombre ?? ""
          }
          abrirInventarioInicial={abrirInventarioAuto}
          onClose={() => {
            setAbrirInventarioAuto(false);
            setLotesProducto(null);
          }}
          onMutated={() => {
            void refreshProductos().then((dataActualizada) => {
              setLotesProducto((prev) =>
                prev
                  ? (dataActualizada.find((p) => p.id === prev.id) ?? prev)
                  : prev,
              );
            });
          }}
        />
      )}

      <ConfirmarPerdidaModal
        isOpen={perdidaSeleccion !== null}
        lote={perdidaSeleccion?.lote ?? null}
        producto={perdidaSeleccion?.producto ?? null}
        onClose={() => setPerdidaSeleccion(null)}
        onSuccess={() => {
          setPerdidaSeleccion(null);
          void refreshProductos();
        }}
      />

      <AccionGlobalModal
        key={accionGlobal ?? "cerrado"}
        isOpen={accionGlobal !== null}
        accion={accionGlobal}
        productos={productosCrudos}
        marcas={marcas}
        categorias={categories}
        barcodeEscaneadoInicial={barcodeEscaneado}
        onClose={() => setAccionGlobal(null)}
        onSuccess={() => void refreshProductos()}
      />
    </div>
  );
}
