import { useMemo, useState } from "react";
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import {
  AlertTriangle,
  Clock,
  FilterX,
  PackagePlus,
  PackageX,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/cn";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { KpiCard } from "../../components/ui/KpiCard";
import { Tooltip } from "../../components/ui/Tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/Table";

type EstadoInventario = "vencido" | "por-vencer" | "ok";

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
  status: EstadoInventario;
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
];

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});

function darFormatoFecha(fecha: string | null): string {
  if (!fecha) return "—";
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

const features = tableFeatures({});

const columnHelper = createColumnHelper<typeof features, ProductoInventario>();

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function InventoryPage() {
  const [busqueda, setBusqueda] = useState("");

  const [activeKpiFilter, setActiveKpiFilter] = useState<KpiFilter>("all");

  const handleKpiClick = (filter: KpiFilter) => {
    setActiveKpiFilter((prev) => (prev === filter ? "all" : filter));
  };

  const hayFiltroActivo = busqueda.trim() !== "" || activeKpiFilter !== "all";

  const limpiarFiltros = () => {
    setBusqueda("");
    setActiveKpiFilter("all");
  };

  const filasFiltradas = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    const coincideTexto = (p: ProductoInventario) =>
      !texto ||
      normalizar(p.name).includes(texto) ||
      normalizar(p.category).includes(texto);

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

    return stockMock.filter((p) => coincideTexto(p) && coincideKpi(p));
  }, [busqueda, activeKpiFilter]);

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", {
          header: "Producto",
          cell: ({ getValue }) => (
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {getValue()}
            </span>
          ),
        }),
        columnHelper.accessor("category", {
          header: "Categoría",
          cell: ({ getValue }) => (
            <span className="text-slate-500 dark:text-slate-400">
              {getValue()}
            </span>
          ),
        }),
        columnHelper.accessor("price", {
          header: "Precio",
          cell: ({ getValue }) => (
            <span className="tabular-nums">
              {formatoMoneda.format(getValue())}
            </span>
          ),
        }),
        columnHelper.accessor("cost", {
          header: "Costo",
          cell: ({ getValue }) => (
            <span className="tabular-nums text-slate-500 dark:text-slate-400">
              {formatoMoneda.format(getValue())}
            </span>
          ),
        }),
        columnHelper.accessor("stock", {
          header: "Existencia",
          cell: ({ getValue }) => (
            <span className="block text-right tabular-nums">{getValue()}</span>
          ),
        }),
        columnHelper.accessor("minStock", {
          header: "Stock mínimo",
          cell: ({ getValue }) => (
            <span className="block text-right tabular-nums text-slate-500 dark:text-slate-400">
              {getValue()}
            </span>
          ),
        }),
        columnHelper.accessor("expiresAt", {
          header: "Vence",
          cell: ({ getValue }) => (
            <span className="tabular-nums text-slate-500 dark:text-slate-400">
              {darFormatoFecha(getValue())}
            </span>
          ),
        }),
        columnHelper.accessor("status", {
          header: "Estado",
          cell: ({ getValue }) => {
            const estado = getValue();
            if (estado === "vencido")
              return (
                <Badge variant="expired" dot>
                  Vencido
                </Badge>
              );
            if (estado === "por-vencer")
              return (
                <Badge variant="warning" dot>
                  Por vencer
                </Badge>
              );
            return <Badge>—</Badge>;
          },
        }),
        columnHelper.display({
          id: "accion",
          header: "Acción",
          cell: () => (
            <button
              type="button"
              onClick={() => toast.info("Edición de producto en desarrollo")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Pencil size={12} />
              Editar
            </button>
          ),
        }),
      ]),
    [],
  );

  const table = useTable({
    key: `inventory-${filasFiltradas.length}`,
    features,
    columns,
    data: filasFiltradas,
  });

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
    <div className="flex flex-col gap-3">
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
      <div className="mt-2 grid grid-cols-2 gap-2.5 sm:gap-3.5 xl:grid-cols-4">
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
          iconBgClass="bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
          title="Stock bajo"
          value={kpis.stockBajo}
          subtitle="por debajo del mínimo"
          onClick={() => handleKpiClick("low_stock")}
          isActive={activeKpiFilter === "low_stock"}
        />
        <KpiCard
          icon={<Clock className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
          iconBgClass="bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
          title="Por vencer"
          value={kpis.porVencer}
          subtitle="próximos 14 días"
          onClick={() => handleKpiClick("expiring_soon")}
          isActive={activeKpiFilter === "expiring_soon"}
        />
        <KpiCard
          icon={<PackageX className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
          iconBgClass="bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          title="Agotados"
          value={kpis.agotados}
          subtitle="sin existencias"
          onClick={() => handleKpiClick("out_of_stock")}
          isActive={activeKpiFilter === "out_of_stock"}
        />
        <KpiCard
          icon={<XCircle className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
          iconBgClass="bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
          title="Vencidos"
          value={kpis.vencidos}
          subtitle="requieren baja o descarte"
          subtitleHighlightClass="font-medium text-rose-500 dark:text-rose-400"
          onClick={() => handleKpiClick("expired")}
          isActive={activeKpiFilter === "expired"}
        />
      </div>

      {/* ── Barra de herramientas ── */}
      <div className="mt-3 flex flex-col items-stretch justify-between gap-3 lg:flex-row lg:items-center">
        {/* GRUPO BÚSQUEDA: siempre juntos, ancho completo en todos los breakpoints */}
        <div className="flex shrink-0 items-center gap-1.5 lg:flex-1">
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto…"
            leftIcon={<Search size={16} />}
            className="w-full"
            wrapperClassName="flex-1 min-w-0"
            aria-label="Buscar producto"
            rightAction={
              busqueda.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  aria-label="Limpiar búsqueda"
                  className="grid h-5 w-5 cursor-pointer place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                >
                  <X size={14} />
                </button>
              ) : undefined
            }
          />
          <Tooltip
            content={hayFiltroActivo ? "Limpiar todos los filtros" : undefined}
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
                  ? "cursor-pointer text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400"
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

      {/* ── Tabla ── */}
      <TableContainer className="mt-3 shadow-xs">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {filasFiltradas.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="py-10 text-center text-slate-500 dark:text-slate-400"
                >
                  Ningún producto coincide con la búsqueda.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b border-slate-100 dark:border-slate-800/60"
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
