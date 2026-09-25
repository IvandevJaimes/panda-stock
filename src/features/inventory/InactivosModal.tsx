import { useRef, useState } from "react";
import { Archive, FilterX, RotateCcw, ScanLine, Search, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/cn";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Tooltip } from "../../components/ui/Tooltip";
import { EmptyStateCompact } from "../../components/ui/EmptyStateCompact";
import { Pagination } from "../../components/ui/Pagination";
import { HighlightMatch } from "../../components/ui/HighlightMatch";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";
import { formatearCodigo } from "./quick-actions/formatters";
import { productosService } from "../../services/productos.service";
import { buildAssetUrl } from "../../lib/assets";
import { getProductPlaceholder } from "../../lib/productPlaceholder";
import type {
  Categoria,
  Marca,
  ProductoConLoteActivo,
} from "../../../electron/db/types";

const PRODUCTOS_POR_PAGINA = 20;

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

interface InactivosModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Solo productos desactivados. */
  productos: ProductoConLoteActivo[];
  marcas: Marca[];
  categorias: Categoria[];
  /** Se llama al reactivar un producto para refrescar la grilla. */
  onChanged?: () => void;
}

export function InactivosModal({
  isOpen,
  onClose,
  productos,
  marcas,
  categorias,
  onChanged,
}: InactivosModalProps) {
  const [busqueda, setBusqueda] = useState("");
  const [codigoEscaneado, setCodigoEscaneado] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const [reactivandoId, setReactivandoId] = useState<number | null>(null);
  const buscadorRef = useRef<HTMLInputElement>(null);

  // Reset al reabrir el modal: ajuste durante el render (patrón de React,
  // igual que MarcasModal), evitando setState en effect.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setBusqueda("");
      setCodigoEscaneado(null);
      setPagina(1);
    }
  }

  // Búsqueda EN SEGUNDO PLANO (contexto strict, igual que la grilla): el
  // scanner jamás escribe en el input; filtra la lista para mostrar SOLO el
  // producto desactivado escaneado. Si el producto está activo, se avisa que
  // no vive en esta lista; si no existe, toast de error.
  const buscarPorEscaneo = async (barcode: string) => {
    const producto = await productosService.scan(barcode);
    if (!producto) {
      toast.error(`No existe ningún producto con el código "${barcode}"`);
      return;
    }
    if (producto.activo) {
      toast.error(
        `El producto "${producto.nombre}" está activo: no aparece en la lista de desactivados`,
      );
      return;
    }
    setBusqueda("");
    setCodigoEscaneado(barcode);
    setPagina(1);
    buscadorRef.current?.focus();
  };

  useBarcodeScanner(
    "inventory-inactivos",
    (barcode) => {
      void buscarPorEscaneo(barcode);
    },
    isOpen,
  );

  const productosFiltrados = productos.filter((p) => {
    const texto = normalizar((codigoEscaneado ?? busqueda).trim());
    if (!texto) return true;
    const marca = marcas.find((m) => m.id === p.marcaId)?.nombre ?? "";
    const categoria =
      categorias.find((c) => c.id === p.categoriaId)?.nombre ?? "";
    return (
      normalizar(p.nombre).includes(texto) ||
      normalizar(p.variante ?? "").includes(texto) ||
      normalizar(marca).includes(texto) ||
      normalizar(categoria).includes(texto) ||
      normalizar(p.codigoInterno ?? "").includes(texto) ||
      normalizar(p.codigosBarras ?? "").includes(texto)
    );
  });

  const totalPaginas = Math.max(
    1,
    Math.ceil(productosFiltrados.length / PRODUCTOS_POR_PAGINA),
  );
  const paginaSegura = Math.min(pagina, totalPaginas);
  const productosPagina = productosFiltrados.slice(
    (paginaSegura - 1) * PRODUCTOS_POR_PAGINA,
    paginaSegura * PRODUCTOS_POR_PAGINA,
  );

  const hayFiltroActivo = busqueda.trim() !== "" || codigoEscaneado !== null;

  const limpiarFiltros = () => {
    setBusqueda("");
    setCodigoEscaneado(null);
    setPagina(1);
    buscadorRef.current?.focus();
  };

  const reactivar = async (producto: ProductoConLoteActivo) => {
    setReactivandoId(producto.id);
    try {
      await productosService.toggle(producto.id, true);
      if (codigoEscaneado !== null) setCodigoEscaneado(null);
      onChanged?.();
      toast.success(`Producto "${producto.nombre}" reactivado`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo reactivar el producto",
      );
    } finally {
      setReactivandoId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title="Productos desactivados"
      height="h-[80vh]"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
        <Input
          ref={buscadorRef}
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setCodigoEscaneado(null);
            setPagina(1);
          }}
          placeholder="Buscar producto desactivado por nombre, marca o código..."
          leftIcon={<Search size={16} />}
          onClear={hayFiltroActivo ? limpiarFiltros : undefined}
          autoFocus
          className="w-full"
          wrapperClassName="min-w-0 flex-1"
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
                ? "cursor-pointer text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
                : "cursor-not-allowed text-slate-400 opacity-25 dark:text-slate-600",
            )}
          >
            <FilterX className="h-5 w-5" />
          </button>
        </Tooltip>
      </div>

        {codigoEscaneado && (
          <div className="flex shrink-0 items-center justify-between gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 dark:border-emerald-400/20 dark:bg-emerald-400/10">
            <div className="flex min-w-0 items-center justify-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300">
                <ScanLine size={13} />
              </span>
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Escaneado:
              </span>
              <code className="mt-0.5 min-w-0 max-w-[16rem] truncate text-sm font-semibold tracking-wide text-emerald-900 dark:text-emerald-100">
                {codigoEscaneado}
              </code>
            </div>
            <Tooltip content="Salir del filtro escaneado">
              <button
                type="button"
                onClick={() => {
                  setCodigoEscaneado(null);
                  setPagina(1);
                  buscadorRef.current?.focus();
                }}
                aria-label="Salir del filtro escaneado"
                className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-emerald-600 transition-colors hover:bg-emerald-500/20 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-400/20 dark:hover:text-emerald-200"
              >
                <X size={13} />
              </button>
            </Tooltip>
          </div>
        )}

        {productosFiltrados.length === 0 ? (
          <EmptyStateCompact
            icon={<Archive className="h-8 w-8 stroke-[1.5]" />}
            title="No hay productos desactivados"
            description="Todos los productos del inventario están activos."
          />
        ) : (
          <>
            <div className="custom-scrollbar flex max-h-[50vh] min-h-0 flex-col gap-1.5 overflow-y-auto pr-1">
              {productosPagina.map((producto) => {
                const marca =
                  marcas.find((m) => m.id === producto.marcaId)?.nombre ?? "";
                const categoria =
                  categorias.find((c) => c.id === producto.categoriaId)?.nombre ??
                  "";
                const detalle = [
                  marca,
                  categoria,
                  formatearCodigo(
                    producto.codigoInterno || producto.codigosBarras,
                  ),
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <div
                    key={producto.id}
                    className="flex w-full items-stretch overflow-hidden rounded-xl border border-slate-200 text-left dark:border-slate-800"
                  >
                    <div className="flex w-13 shrink-0 items-center justify-center overflow-hidden bg-slate-200/60 sm:w-15 dark:bg-slate-800/60">
                      {(() => {
                        const imgUrl = producto.imgPath
                          ? buildAssetUrl(producto.imgPath)
                          : null;
                        return (
                          <img
                            src={imgUrl ?? getProductPlaceholder(producto.id)}
                            alt={imgUrl ? producto.nombre : `${producto.nombre} sin foto`}
                            loading="lazy"
                            draggable={false}
                            className="h-full w-full object-cover opacity-70 saturate-50"
                          />
                        );
                      })()}
                    </div>
                    <span className="flex min-w-0 flex-1 flex-col justify-center py-2.5 pl-3 pr-3">
                      <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        <HighlightMatch
                          text={producto.nombre}
                          query={codigoEscaneado ?? busqueda}
                          compact
                        />
                        {producto.variante && (
                          <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">
                            · {producto.variante}
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-slate-400 dark:text-slate-500">
                        {detalle || "Sin categoría"}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center pr-3">
                      <Tooltip content="Reactivar producto" placement="top">
                        <button
                          type="button"
                          onClick={() => void reactivar(producto)}
                          disabled={reactivandoId === producto.id}
                          aria-label={`Reactivar ${producto.nombre}`}
                          className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-400"
                        >
                          <RotateCcw
                            className={cn(
                              "h-4 w-4",
                              reactivandoId === producto.id && "animate-spin",
                            )}
                          />
                        </button>
                      </Tooltip>
                    </span>
                  </div>
                );
              })}
            </div>

            {productosFiltrados.length > 1 && (
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800/60">
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  {(paginaSegura - 1) * PRODUCTOS_POR_PAGINA + 1}–
                  {Math.min(
                    paginaSegura * PRODUCTOS_POR_PAGINA,
                    productosFiltrados.length,
                  )}{" "}
                  de {productosFiltrados.length} productos
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
      </div>
    </Modal>
  );
}