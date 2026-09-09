import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  Clock,
  FilterX,
  PackagePlus,
  PackageX,
  Plus,
  Search,
  SlidersHorizontal,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/cn";
import { Button } from "../../components/ui/Button";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { CreateCategoryModal } from "../../components/inventory/CreateCategoryModal";
import { EditCategoryModal } from "../../components/inventory/EditCategoryModal";
import { CreateProductModal } from "./CreateProductModal";
import { EmptyState } from "../../components/ui/EmptyState";
import { useCategories } from "../../hooks/useCategories";
import { Input } from "../../components/ui/Input";
import { KpiCard } from "../../components/ui/KpiCard";
import { Pagination } from "../../components/ui/Pagination";
import { Pill } from "../../components/ui/Pill";
import {
  ProductCard,
  type ProductStatus,
} from "../../components/ui/ProductCard";
import { Tooltip } from "../../components/ui/Tooltip";
import { productosService } from "../../services/productos.service";
import { marcasService } from "../../services/marcas.service";
import type { Categoria, Marca, Producto } from "../../../electron/db/types";

type KpiFilter =
  | "all"
  | "low_stock"
  | "expiring_soon"
  | "out_of_stock"
  | "expired";

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
  status: "vencido" | "por-vencer" | "ok";
};

function derivarEstadoVencimiento(
  vencimiento: string | null,
  hoy: Date = new Date(),
): "vencido" | "por-vencer" | "ok" {
  if (!vencimiento) return "ok";
  const fecha = new Date(vencimiento);
  if (Number.isNaN(fecha.getTime())) return "ok";
  if (fecha < hoy) return "vencido";
  const limite = new Date(hoy);
  limite.setDate(hoy.getDate() + 14);
  return fecha <= limite ? "por-vencer" : "ok";
}

function mapearProducto(
  producto: Producto,
  categorias: Categoria[],
  marcas: Marca[],
  hoy: Date = new Date(),
): ProductoInventario {
  const categoria = categorias.find((c) => c.id === producto.categoriaId);
  const marca = marcas.find((m) => m.id === producto.marcaId);
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
    expiresAt: producto.vencimiento,
    status: derivarEstadoVencimiento(producto.vencimiento, hoy),
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
  if (p.stock <= p.minStock) return "low_stock";
  return "normal";
}

const PAGE_SIZE = 20;

export function InventoryPage() {
  const [busqueda, setBusqueda] = useState("");
  const [activeKpiFilter, setActiveKpiFilter] = useState<KpiFilter>("all");
  const [paginaActual, setPaginaActual] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Categoria | null>(null);
  const { categories, addCategory, updateCategory, removeCategory } =
    useCategories();

  const [productosCrudos, setProductosCrudos] = useState<Producto[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState<string | null>(null);

  const obtenerProductos = useCallback(async (): Promise<Producto[]> => {
    const data = await productosService.getAll();
    return data.filter((p) => p.activo);
  }, []);

  const obtenerMarcas = useCallback(async (): Promise<Marca[]> => {
    return marcasService.getAll();
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

  const refreshProductos = useCallback(async () => {
    setCargandoProductos(true);
    setErrorProductos(null);
    try {
      const [data, marcasData] = await Promise.all([
        obtenerProductos(),
        obtenerMarcas(),
      ]);
      setProductosCrudos(data);
      setMarcas(marcasData);
    } catch (err) {
      setErrorProductos(
        err instanceof Error ? err.message : "Error al cargar productos",
      );
    } finally {
      setCargandoProductos(false);
    }
  }, [obtenerProductos, obtenerMarcas]);

  const productos = useMemo(
    () => productosCrudos.map((p) => mapearProducto(p, categories, marcas)),
    [productosCrudos, categories, marcas],
  );

  const handleKpiClick = (filter: KpiFilter) => {
    setActiveKpiFilter((prev) => {
      const nuevo = prev === filter ? "all" : filter;
      if (nuevo !== prev) setPaginaActual(1);
      return nuevo;
    });
  };

  const hayFiltroActivo =
    busqueda.trim() !== "" ||
    activeKpiFilter !== "all" ||
    selectedCategory !== "all";

  const limpiarFiltros = () => {
    setBusqueda("");
    setActiveKpiFilter("all");
    setSelectedCategory("all");
    setPaginaActual(1);
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

  const filasFiltradas = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    const coincideTexto = (p: ProductoInventario) =>
      !texto ||
      normalizar(p.name).includes(texto) ||
      normalizar(p.category).includes(texto);

    const coincideCategoria = (p: ProductoInventario) => {
      if (selectedCategory === "all") return true;
      const catSel = categories.find(
        (c) => String(c.id) === selectedCategory,
      );
      return catSel ? p.category === catSel.nombre : false;
    };

    const coincideKpi = (p: ProductoInventario) => {
      switch (activeKpiFilter) {
        case "low_stock":
          return p.stock <= p.minStock && p.stock > 0;
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

    return productos.filter(
      (p) => coincideTexto(p) && coincideCategoria(p) && coincideKpi(p),
    );
  }, [busqueda, selectedCategory, activeKpiFilter, categories, productos]);

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
      stockBajo: productos.filter((p) => p.stock <= p.minStock && p.stock > 0)
        .length,
      porVencer: productos.filter((p) => p.status === "por-vencer").length,
      agotados: productos.filter((p) => p.stock === 0).length,
      vencidos: productos.filter((p) => p.status === "vencido").length,
    }),
    [productos],
  );

  return (
    <div className="flex flex-col gap-3 pt-4 md:pt-6">
      {/* ── Encabezado ── */}
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            Control de inventario
          </h1>
          <span className="select-none rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-300">
            <span className="font-display text-base font-bold text-emerald-600 dark:text-emerald-400">
              {productos.length}
            </span>{" "}
            {productos.length === 1 ? "producto" : "productos"}
          </span>
        </div>

        {/* Botón Grande Esquinado */}
        <Button
          variant="primary"
          onClick={() => setIsCreateProductOpen(true)}
          className="h-10 shrink-0 gap-2 rounded-2xl px-4 text-sm font-bold shadow-xs sm:h-12 sm:px-6 sm:text-base"
        >
          <PackagePlus className="h-5 w-5" />
          <span>Nuevo producto</span>
        </Button>
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
      <div className="sticky top-0 z-20 flex w-full min-w-0 flex-col gap-2.5 border-b border-slate-200/80 bg-[#f4f6f8] pt-3 pb-3 transition-colors select-none relative after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-3 after:bg-gradient-to-b after:from-slate-900/10 after:to-transparent after:content-[''] dark:border-slate-800/60 dark:bg-[#0b0f17] dark:after:from-black/45">
        {/* ── Barra de categorías: anclaje fijo + carrusel desplazable ── */}
        <div className="flex w-full items-center select-none">
          {/* 1. Anclaje fijo: botón Nueva + separador + fondo opaco + máscara degradada */}
          <div className="relative z-10 flex shrink-0 items-center bg-[#f4f6f8] pr-3 pb-2 dark:bg-[#0b0f17]">
            <Tooltip content="Crear una nueva categoría" placement="top">
              <button
                type="button"
                onClick={() => setIsCreateCategoryOpen(true)}
                aria-label="Nueva categoría"
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
                setPaginaActual(1);
              }}
            />
            {categories.map((categoria) => (
              <Pill
                key={categoria.id}
                label={categoria.nombre}
                count={categoryCounts[categoria.nombre] || 0}
                active={selectedCategory === String(categoria.id)}
                onSelect={() => {
                  setSelectedCategory((prev) =>
                    prev === String(categoria.id) ? "all" : String(categoria.id),
                  );
                  setPaginaActual(1);
                }}
                onEdit={() => setEditingCategory(categoria)}
                onDelete={() => {
                  const count = categoryCounts[categoria.nombre] || 0;
                  if (count > 0) {
                    toast.error(
                      `No podés eliminar "${categoria.nombre}" porque tiene ${count} ${count === 1 ? "producto asociado" : "productos asociados"}. Reasignalos o eliminalos primero.`,
                    );
                    return;
                  }
                  setDeletingCategory(categoria);
                }}
              />
            ))}
            <div
              className="w-6 shrink-0 pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* ── Barra de herramientas ── */}
        <div className="flex pt-0.5 w-full min-w-0 flex-col items-stretch justify-between gap-3 lg:flex-row lg:items-center">
          {/* GRUPO BÚSQUEDA: siempre juntos, ancho completo en todos los breakpoints */}
          <div className="flex min-w-0 flex-1 shrink-0 items-center gap-1.5 lg:flex-1">
            <Input
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPaginaActual(1);
              }}
              placeholder="Buscar producto…"
              leftIcon={<Search size={16} />}
              className="w-full"
              wrapperClassName="flex-1 min-w-[240px]"
              aria-label="Buscar producto"
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
            <Tooltip
              content={
                hayFiltroActivo ? "Limpiar todos los filtros" : undefined
              }
              placement="top"
            >
              <button
                type="button"
                onClick={limpiarFiltros}
                disabled={!hayFiltroActivo}
                aria-label="Limpiar todos los filtros"
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
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => toast.info("Alta de inventario en desarrollo")}
              className="whitespace-nowrap"
            >
              Agregar Inventario
            </Button>
            <Button
              variant="outline"
              icon={<SlidersHorizontal size={16} />}
              onClick={() => toast.info("Ajuste de stock en desarrollo")}
              className="whitespace-nowrap"
            >
              Ajustar stock
            </Button>
            <Button
              variant="danger"
              icon={<Plus size={16} />}
              onClick={() => toast.info("Registro de pérdida en desarrollo")}
              className="whitespace-nowrap"
            >
              Registrar pérdida
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
                <Button variant="outline" onClick={limpiarFiltros}>
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        )
      ) : (
        <div className="mt-2 px-0.5 flex w-full min-w-0 flex-col gap-2.5">
          {filasPagina.map((producto, index) => (
            <ProductCard
              key={producto.id}
              style={{ animationDelay: index < 8 ? `${index * 20}ms` : "0ms" }}
              category={producto.category}
              name={producto.name}
              variant={producto.variant}
              brand={producto.brand || undefined}
              stock={producto.stock}
              minStock={producto.minStock}
              price={producto.price}
              expiresAt={producto.expiresAt ?? undefined}
              status={derivarStatus(producto)}
              onEdit={() => toast.info(`Editar ${producto.name} en desarrollo`)}
              onDelete={() =>
                toast.info(`Eliminar ${producto.name} en desarrollo`)
              }
            />
          ))}

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
              onPageChange={setPaginaActual}
            />
          </div>
        </div>
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

      <CreateProductModal
        isOpen={isCreateProductOpen}
        onClose={() => setIsCreateProductOpen(false)}
        categorias={categories}
        onSuccess={() => void refreshProductos()}
      />
    </div>
  );
}
