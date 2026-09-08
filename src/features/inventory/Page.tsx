import { useMemo, useState } from "react";
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
import type { Categoria } from "../../../electron/db/types";

type KpiFilter =
  | "all"
  | "low_stock"
  | "expiring_soon"
  | "out_of_stock"
  | "expired";

type ProductoInventario = {
  id: number;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  expiresAt: string | null;
  status: "vencido" | "por-vencer" | "ok";
};

const stockMock: ProductoInventario[] = [
  {
    id: 1,
    name: "Shampoo Dove",
    category: "Cuidado capilar",
    price: 48,
    cost: 30,
    stock: 25,
    minStock: 10,
    expiresAt: "2027-01-15",
    status: "ok",
  },
  {
    id: 2,
    name: "Acondicionador Herbal",
    category: "Cuidado capilar",
    price: 42,
    cost: 25,
    stock: 8,
    minStock: 10,
    expiresAt: "2026-09-05",
    status: "por-vencer",
  },
  {
    id: 3,
    name: "Jabon Rosa Venus",
    category: "Cuidado personal",
    price: 15,
    cost: 8,
    stock: 60,
    minStock: 20,
    expiresAt: "2026-09-10",
    status: "por-vencer",
  },
  {
    id: 4,
    name: "Crema facial Nivea",
    category: "Cuidado facial",
    price: 75,
    cost: 48,
    stock: 15,
    minStock: 5,
    expiresAt: "2026-08-25",
    status: "vencido",
  },
  {
    id: 5,
    name: "Labial Rojo Mate",
    category: "Maquillaje",
    price: 55,
    cost: 32,
    stock: 12,
    minStock: 5,
    expiresAt: "2027-03-01",
    status: "ok",
  },
  {
    id: 6,
    name: "Máscara de pestañas",
    category: "Maquillaje",
    price: 62,
    cost: 38,
    stock: 0,
    minStock: 8,
    expiresAt: "2026-11-20",
    status: "ok",
  },
  {
    id: 7,
    name: "Base de maquillaje L'Oréal",
    category: "Maquillaje",
    price: 89,
    cost: 55,
    stock: 4,
    minStock: 6,
    expiresAt: "2027-05-12",
    status: "ok",
  },
  {
    id: 8,
    name: "Delineador negro",
    category: "Maquillaje",
    price: 28,
    cost: 14,
    stock: 34,
    minStock: 10,
    expiresAt: "2026-12-30",
    status: "ok",
  },
  {
    id: 9,
    name: "Sombra de ojos paleta",
    category: "Maquillaje",
    price: 120,
    cost: 78,
    stock: 7,
    minStock: 4,
    expiresAt: "2026-09-09",
    status: "por-vencer",
  },
  {
    id: 10,
    name: "Protector solar FPS 50",
    category: "Cuidado personal",
    price: 95,
    cost: 61,
    stock: 18,
    minStock: 12,
    expiresAt: "2026-09-02",
    status: "vencido",
  },
  {
    id: 11,
    name: "Desodorante Axe",
    category: "Cuidado personal",
    price: 32,
    cost: 18,
    stock: 40,
    minStock: 15,
    expiresAt: "2027-07-01",
    status: "ok",
  },
  {
    id: 12,
    name: "Gel para el cabello",
    category: "Cuidado capilar",
    price: 22,
    cost: 11,
    stock: 3,
    minStock: 10,
    expiresAt: "2027-02-14",
    status: "ok",
  },
  {
    id: 13,
    name: "Tónico facial",
    category: "Cuidado facial",
    price: 38,
    cost: 22,
    stock: 26,
    minStock: 8,
    expiresAt: "2026-09-11",
    status: "por-vencer",
  },
  {
    id: 14,
    name: "Serum vitamina C",
    category: "Cuidado facial",
    price: 145,
    cost: 98,
    stock: 5,
    minStock: 6,
    expiresAt: "2026-08-30",
    status: "vencido",
  },
  {
    id: 15,
    name: "Crema hidratante corporal",
    category: "Cuidado personal",
    price: 47,
    cost: 28,
    stock: 22,
    minStock: 9,
    expiresAt: "2027-08-05",
    status: "ok",
  },
  {
    id: 16,
    name: "Champú sólido",
    category: "Cuidado capilar",
    price: 54,
    cost: 33,
    stock: 0,
    minStock: 5,
    expiresAt: "2026-12-10",
    status: "ok",
  },
  {
    id: 17,
    name: "Perfume floral",
    category: "Fragancias",
    price: 210,
    cost: 132,
    stock: 9,
    minStock: 4,
    expiresAt: "2027-06-18",
    status: "ok",
  },
  {
    id: 18,
    name: "Colonia para hombre",
    category: "Fragancias",
    price: 165,
    cost: 104,
    stock: 6,
    minStock: 4,
    expiresAt: "2026-09-06",
    status: "por-vencer",
  },
  {
    id: 19,
    name: "Jabón de manos líquido",
    category: "Limpieza",
    price: 18,
    cost: 9,
    stock: 55,
    minStock: 20,
    expiresAt: "2027-04-22",
    status: "ok",
  },
  {
    id: 20,
    name: "Limpiador multiuso",
    category: "Limpieza",
    price: 26,
    cost: 13,
    stock: 0,
    minStock: 10,
    expiresAt: "2027-01-30",
    status: "ok",
  },
  {
    id: 21,
    name: "Lavandina 1L",
    category: "Limpieza",
    price: 12,
    cost: 6,
    stock: 70,
    minStock: 25,
    expiresAt: "2026-09-08",
    status: "por-vencer",
  },
  {
    id: 22,
    name: "Esponja de cocina x3",
    category: "Limpieza",
    price: 8,
    cost: 3,
    stock: 100,
    minStock: 30,
    expiresAt: null,
    status: "ok",
  },
  {
    id: 23,
    name: "Cepillo de dientes",
    category: "Higiene bucal",
    price: 14,
    cost: 7,
    stock: 2,
    minStock: 12,
    expiresAt: "2027-09-01",
    status: "ok",
  },
  {
    id: 24,
    name: "Pasta dental 90g",
    category: "Higiene bucal",
    price: 21,
    cost: 11,
    stock: 33,
    minStock: 15,
    expiresAt: "2026-10-01",
    status: "ok",
  },
  {
    id: 25,
    name: "Hilo dental",
    category: "Higiene bucal",
    price: 16,
    cost: 8,
    stock: 1,
    minStock: 10,
    expiresAt: "2027-11-11",
    status: "ok",
  },
  {
    id: 26,
    name: "Enjuague bucal",
    category: "Higiene bucal",
    price: 30,
    cost: 17,
    stock: 14,
    minStock: 8,
    expiresAt: "2026-09-04",
    status: "vencido",
  },
  {
    id: 27,
    name: "Toallitas desmaquillantes",
    category: "Cuidado facial",
    price: 35,
    cost: 20,
    stock: 11,
    minStock: 6,
    expiresAt: "2027-02-28",
    status: "ok",
  },
  {
    id: 28,
    name: "Crema para manos",
    category: "Cuidado personal",
    price: 25,
    cost: 14,
    stock: 8,
    minStock: 7,
    expiresAt: "2026-09-12",
    status: "por-vencer",
  },
];

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
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Categoria | null>(null);
  const { categories, addCategory, updateCategory, removeCategory } =
    useCategories();

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
    stockMock.forEach((p) => {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    });
    return counts;
  }, []);
  const totalProducts = stockMock.length;

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

    return stockMock.filter(
      (p) => coincideTexto(p) && coincideCategoria(p) && coincideKpi(p),
    );
  }, [busqueda, selectedCategory, activeKpiFilter, categories]);

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
      stockBajo: stockMock.filter((p) => p.stock <= p.minStock && p.stock > 0)
        .length,
      porVencer: stockMock.filter((p) => p.status === "por-vencer").length,
      agotados: stockMock.filter((p) => p.stock === 0).length,
      vencidos: stockMock.filter((p) => p.status === "vencido").length,
    }),
    [],
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
              {stockMock.length}
            </span>{" "}
            {stockMock.length === 1 ? "producto" : "productos"}
          </span>
        </div>

        {/* Botón Grande Esquinado */}
        <Button
          variant="primary"
          onClick={() => toast.info("Alta de producto en desarrollo")}
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
      {filasFiltradas.length === 0 ? (
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
      ) : (
        <div className="mt-2 px-0.5 flex w-full min-w-0 flex-col gap-2.5">
          {filasPagina.map((producto, index) => (
            <ProductCard
              key={producto.id}
              style={{ animationDelay: index < 8 ? `${index * 20}ms` : "0ms" }}
              category={producto.category}
              name={producto.name}
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
    </div>
  );
}
