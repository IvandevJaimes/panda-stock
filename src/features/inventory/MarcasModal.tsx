import { useState } from "react";
import { FilterX, Pencil, Plus, Search, Store, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/cn";
import { Modal } from "../../components/ui/Modal";
import { CustomSelect } from "../../components/ui/CustomSelect";
import { Tooltip } from "../../components/ui/Tooltip";
import { EmptyStateCompact } from "../../components/ui/EmptyStateCompact";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Pagination } from "../../components/ui/Pagination";
import { CreateBrandModal } from "../../components/inventory/CreateBrandModal";
import { EditBrandModal } from "../../components/inventory/EditBrandModal";
import { marcasService } from "../../services/marcas.service";
import type { Marca, ProductoConLoteActivo } from "../../../electron/db/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface MarcasModalProps {
  isOpen: boolean;
  onClose: () => void;
  marcas: Marca[];
  productos: ProductoConLoteActivo[];
  /** Se llama después de crear/renombrar/eliminar para refrescar las marcas */
  onChanged?: () => void;
  /** Se llama al hacer click en una card de marca (para filtrar por ella) */
  onSelectMarca?: (nombre: string) => void;
}

const MARCAS_POR_PAGINA = 20;

type OrdenMarca = "defecto" | "alfa_asc" | "alfa_desc" | "mas_productos" | "menos_productos";

const ORDENES_MARCA: { value: OrdenMarca; label: string }[] = [
  { value: "defecto", label: "Por defecto" },
  { value: "alfa_asc", label: "Alfabético A→Z" },
  { value: "alfa_desc", label: "Alfabético Z→A" },
  { value: "mas_productos", label: "Más productos" },
  { value: "menos_productos", label: "Menos productos" },
];

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export function MarcasModal({ isOpen, onClose, marcas, productos, onChanged, onSelectMarca }: MarcasModalProps) {
  const [busquedaMarca, setBusquedaMarca] = useState("");
  const [orden, setOrden] = useState<OrdenMarca>("defecto");
  const [creandoMarca, setCreandoMarca] = useState(false);
  const [editandoMarca, setEditandoMarca] = useState<Marca | null>(null);
  const [eliminando, setEliminando] = useState<Marca | null>(null);
  const [pagina, setPagina] = useState(1);

  // Reset de la página al reabrir el modal: ajuste durante el render (patrón
  // oficial de React), evitando el setState en effect.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) setPagina(1);
  }

  // Las marcas desactivadas se consideran eliminadas: no se muestran.
  const marcasActivas = marcas.filter((m) => m.activo);

  const productosDeMarca = (marcaId: number) =>
    productos.filter((p) => p.marcaId === marcaId);

  const totalProductos = marcasActivas.reduce(
    (suma, marca) => suma + productosDeMarca(marca.id).length,
    0,
  );

  const cantidadDeMarca = (marcaId: number) =>
    productosDeMarca(marcaId).length;

  const comparadorNombre = (a: Marca, b: Marca) =>
    a.nombre.localeCompare(b.nombre, "es");

  const marcasOrdenadas = [...marcasActivas].sort((a, b) => {
    switch (orden) {
      case "alfa_asc":
        return comparadorNombre(a, b);
      case "alfa_desc":
        return comparadorNombre(b, a);
      case "mas_productos":
        return (
          cantidadDeMarca(b.id) - cantidadDeMarca(a.id) ||
          comparadorNombre(a, b)
        );
      case "menos_productos":
        return (
          cantidadDeMarca(a.id) - cantidadDeMarca(b.id) ||
          comparadorNombre(a, b)
        );
      default:
        return 0;
    }
  });

  const marcasFiltradas = marcasOrdenadas.filter((marca) => {
    const texto = busquedaMarca.trim().toLowerCase();
    if (texto === "") return true;
    return marca.nombre.toLowerCase().includes(texto);
  });

  const hayFiltrosActivos = busquedaMarca !== "" || orden !== "defecto";

  const totalPaginas = Math.max(
    1,
    Math.ceil(marcasFiltradas.length / MARCAS_POR_PAGINA),
  );
  const paginaSegura = Math.min(pagina, totalPaginas);
  const marcasPagina = marcasFiltradas.slice(
    (paginaSegura - 1) * MARCAS_POR_PAGINA,
    paginaSegura * MARCAS_POR_PAGINA,
  );

  const confirmarEliminar = async () => {
    if (!eliminando) return;
    try {
      await marcasService.delete(eliminando.id);
      setEliminando(null);
      onChanged?.();
      toast.success(`Marca "${eliminando.nombre}" eliminada`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la marca");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl" title="Marcas" height="h-[80vh]">
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Gestionar marcas
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-400 dark:text-slate-500">
              {marcasActivas.length}{" "}
              {marcasActivas.length === 1 ? "marca" : "marcas"} · {totalProductos}{" "}
              {totalProductos === 1 ? "producto asignado" : "productos asignados"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreandoMarca(true)}
            className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-500/20 active:scale-95 dark:text-emerald-400"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nueva marca
          </button>
        </div>

        {/* Buscador + orden + limpiar */}
        <div className="mb-4 flex items-center gap-2">
          <div className="relative w-full">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              aria-hidden
            />
            <input
              value={busquedaMarca}
              onChange={(e) => {
                setBusquedaMarca(e.target.value);
                setPagina(1);
              }}
              placeholder="Buscar marcas por nombre…"
              maxLength={40}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700/80 dark:bg-[#0B1120] dark:text-slate-100 dark:placeholder:text-slate-600"
            />
            {busquedaMarca && (
              <button
                type="button"
                onClick={() => setBusquedaMarca("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <CustomSelect
            options={ORDENES_MARCA}
            value={orden}
            onChange={(value) => {
              setOrden(value as OrdenMarca);
              setPagina(1);
            }}
            className="w-40 shrink-0"
          />
          <Tooltip
              content={
                hayFiltrosActivos ? "Limpiar todos los filtros" : undefined
              }
              placement="top"
            >
              <button
                type="button"
                onClick={() => {
                  setBusquedaMarca("");
                  setOrden("defecto");
                  setPagina(1);
                }}
                disabled={!hayFiltrosActivos}
                aria-label="Limpiar todos los filtros"
                className={cn(
                  "shrink-0 select-none rounded-xl p-2 transition-colors duration-150",
                  hayFiltrosActivos
                    ? "cursor-pointer text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
                    : "cursor-not-allowed text-slate-400 opacity-25 dark:text-slate-600",
                )}
              >
                <FilterX className="h-5 w-5" />
              </button>
            </Tooltip>
          </div>

{marcasActivas.length === 0 ? (
          <EmptyStateCompact
            icon={<Store className="h-6 w-6" />}
            title="Todavía no hay marcas"
            description="Creá la primera marca o cargá productos con marca."
          />
        ) : marcasFiltradas.length === 0 ? (
          <EmptyStateCompact
            icon={<Search className="h-6 w-6" />}
            title="No se encontraron marcas"
            description="Ninguna marca coincide con la búsqueda o los filtros actuales."
          />
        ) : (
          <>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar">
              {marcasPagina.map((marca) => {
                const cantidad = productosDeMarca(marca.id).length;
                return (
                  <div
                    key={marca.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectMarca?.(marca.nombre)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onSelectMarca?.(marca.nombre);
                      }
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition-colors duration-150 hover:border-emerald-500/50 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 dark:border-slate-700/70 dark:bg-slate-800/70 dark:shadow-black/10 dark:hover:border-emerald-500/50"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-display text-[15px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
                        {marca.nombre}
                      </span>
                      <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                        {cantidad === 0
                          ? "Sin productos asignados"
                          : `${cantidad} ${cantidad === 1 ? "producto asignado" : "productos asignados"}`}
                      </span>
                    </span>

                    <div
                      className="flex shrink-0 items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Tooltip content="Editar marca" placement="top">
                        <button
                          type="button"
                          onClick={() => setEditandoMarca(marca)}
                          aria-label={`Renombrar ${marca.nombre}`}
                          className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </Tooltip>
                      {cantidad === 0 && (
                        <Tooltip content="Eliminar marca" placement="top">
                          <button
                            type="button"
                            onClick={() => setEliminando(marca)}
                            aria-label={`Eliminar ${marca.nombre}`}
                            className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPaginas > 1 && (
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800/60">
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  {(paginaSegura - 1) * MARCAS_POR_PAGINA + 1}–
                  {Math.min(paginaSegura * MARCAS_POR_PAGINA, marcasFiltradas.length)}{" "}
                  de {marcasFiltradas.length} marcas
                </span>
                <Pagination
                  currentPage={paginaSegura}
                  totalPages={totalPaginas}
                  onPageChange={setPagina}
                />
              </div>
            )}
          </>
        )}

        <CreateBrandModal
          isOpen={creandoMarca}
          onClose={() => setCreandoMarca(false)}
          brands={marcasActivas}
          onSuccess={() => {
            setCreandoMarca(false);
            onChanged?.();
            toast.success("Marca creada correctamente");
          }}
        />

        <EditBrandModal
          isOpen={editandoMarca !== null}
          onClose={() => setEditandoMarca(null)}
          brand={editandoMarca}
          brands={marcasActivas}
          onSuccess={() => {
            setEditandoMarca(null);
            onChanged?.();
            toast.success("Marca actualizada correctamente");
          }}
        />

        <ConfirmModal
          isOpen={eliminando !== null}
          onClose={() => setEliminando(null)}
          onConfirm={confirmarEliminar}
          title="Eliminar marca"
          description={
            eliminando
              ? `¿Seguro que querés eliminar la marca "${eliminando.nombre}"? Los productos la dejarán de mostrar.`
              : ""
          }
          confirmText="Eliminar"
        />
      </div>
    </Modal>
  );
}