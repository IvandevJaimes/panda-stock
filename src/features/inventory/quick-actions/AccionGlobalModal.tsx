import { useMemo, useRef, useState } from "react";
import { FilterX, ScanLine, Search, SearchX, X } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { HighlightMatch } from "../../../components/ui/HighlightMatch";
import { cn } from "../../../lib/cn";
import { Pagination } from "../../../components/ui/Pagination";
import { useBarcodeScanner } from "../../../hooks/useBarcodeScanner";
import { productosService } from "../../../services/productos.service";
import { formatearCodigo } from "./formatters";
import { AgregarInventarioForm } from "./AgregarInventarioForm";
import { AjustarStockLoteForm } from "../lote-actions/AjustarStockLoteForm";
import { RegistrarPerdidaLoteForm } from "../lote-actions/RegistrarPerdidaLoteForm";
import { lotesService } from "../../../services/lotes.service";
import { getLoteActivo } from "../loteHelpers";
import { ACCION_LABEL, FORM_ID, SUBMIT_LABEL } from "./types";
import type {
  Categoria,
  Lote,
  Marca,
  Producto,
  ProductoConLoteActivo,
} from "../../../../electron/db/types";
import { Tooltip } from "../../../components/ui/Tooltip";

export type AccionGlobal =
  | "agregar-inventario"
  | "ajustar-stock"
  | "registrar-perdida";

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** ¿El producto (activo) coincide con el término normalizado? Fuente única
 *  para el filtrado y para decidir si el escaneo sigue vigente. */
function coincideConProducto(
  p: ProductoConLoteActivo,
  texto: string,
  marcas: Marca[],
  categorias: Categoria[],
): boolean {
  const marca = marcas.find((m) => m.id === p.marcaId)?.nombre ?? "";
  const categoria =
    categorias.find((c) => c.id === p.categoriaId)?.nombre ?? "";
  const variant = p.variante ?? "";
  return (
    normalizar(p.nombre).includes(texto) ||
    normalizar(marca).includes(texto) ||
    normalizar(categoria).includes(texto) ||
    normalizar(variant).includes(texto) ||
    normalizar(p.codigoInterno ?? "").includes(texto) ||
    normalizar(p.codigosBarras ?? "").includes(texto)
  );
}

interface AccionGlobalModalProps {
  isOpen: boolean;
  accion: AccionGlobal | null;
  productos: ProductoConLoteActivo[];
  marcas: Marca[];
  categorias: Categoria[];
  barcodeEscaneadoInicial?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AccionGlobalModal({
  isOpen,
  accion,
  productos,
  marcas,
  categorias,
  barcodeEscaneadoInicial = null,
  onClose,
  onSuccess,
}: AccionGlobalModalProps) {
  const [busqueda, setBusqueda] = useState("");
  const [codigoEscaneado, setCodigoEscaneado] = useState<string | null>(
    barcodeEscaneadoInicial,
  );
  const [productoSeleccionado, setProductoSeleccionado] =
    useState<Producto | null>(null);
  const [loteActivo, setLoteActivo] = useState<Lote | null>(null);
  const [cargandoLote, setCargandoLote] = useState(false);
  const [seleccionando, setSeleccionando] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const buscadorRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setBusqueda("");
    setCodigoEscaneado(null);
    setProductoSeleccionado(null);
    setLoteActivo(null);
    setCargandoLote(false);
    setSeleccionando(true);
    setSubmitting(false);
    setPaginaActual(1);
    onClose();
  };

  // Búsqueda EN SEGUNDO PLANO (contexto strict, igual que la grilla de
  // inventario): el scanner jamás escribe en el input; filtra la lista para
  // mostrar SOLO el producto escaneado y enfoca el buscador.
  const buscarPorEscaneo = async (barcode: string) => {
    const producto = await productosService.scan(barcode);
    if (!producto) {
      toast.error(`No existe ningún producto con el código "${barcode}"`);
      return;
    }
    if (!producto.activo) {
      toast.error(
        `El producto "${producto.nombre}" está desactivado: no aparece en la búsqueda`,
      );
      return;
    }
    setBusqueda("");
    setCodigoEscaneado(barcode);
    setPaginaActual(1);
    buscadorRef.current?.focus();
  };

  useBarcodeScanner(
    "inventory-action",
    (barcode) => {
      void buscarPorEscaneo(barcode);
    },
    isOpen && seleccionando && !cargandoLote,
  );

  // Escaneo DERIVADO (igual que la grilla de inventario): el filtro escaneado
  // queda vigente SOLO mientras su código coincida con un producto activo. Si
  // el producto se desactiva o se elimina, el badge desaparece solo y la lista
  // vuelve a mostrar los productos activos.
  const { productosFiltrados, escaneoVigente } = useMemo(() => {
    const activos = productos.filter((p) => p.activo);

    const filasConEscaneo = codigoEscaneado
      ? activos.filter((p) =>
          coincideConProducto(p, normalizar(codigoEscaneado.trim()), marcas, categorias),
        )
      : null;
    const coincideEscaneo = filasConEscaneo !== null && filasConEscaneo.length > 0;

    let filtradas: ProductoConLoteActivo[];
    if (codigoEscaneado === null) {
      filtradas = activos;
    } else if (coincideEscaneo) {
      filtradas = filasConEscaneo!;
    } else {
      const textoBusqueda = normalizar(busqueda.trim());
      filtradas = textoBusqueda
        ? activos.filter((p) =>
            coincideConProducto(p, textoBusqueda, marcas, categorias),
          )
        : activos;
    }

    return { productosFiltrados: filtradas, escaneoVigente: coincideEscaneo };
  }, [productos, busqueda, codigoEscaneado, marcas, categorias]);

  const tituloModal = accion ? ACCION_LABEL[accion] : "Acción";
  const formId = accion
    ? accion === "agregar-inventario"
      ? FORM_ID["agregar-inventario"]
      : accion === "ajustar-stock"
        ? FORM_ID["ajustar-stock"]
        : FORM_ID["registrar-perdida"]
    : undefined;

  const accionRequiereLote =
    accion === "ajustar-stock" || accion === "registrar-perdida";

  const PAGE_SIZE = 20;
  const totalPaginas = Math.ceil(productosFiltrados.length / PAGE_SIZE);
  const paginaSegura = Math.min(paginaActual, Math.max(totalPaginas, 1));
  const productosPaginados = productosFiltrados.slice(
    (paginaSegura - 1) * PAGE_SIZE,
    paginaSegura * PAGE_SIZE,
  );

  const handleSeleccionarProducto = async (producto: ProductoConLoteActivo) => {
    if (accion === "agregar-inventario") {
      setProductoSeleccionado(producto);
      setSeleccionando(false);
      return;
    }
    setCargandoLote(true);
    try {
      const lotes = await lotesService.getByProducto(producto.id);
      const activo = getLoteActivo(lotes);
      if (!activo) {
        toast.error(
          "Este producto no tiene ningún lote con stock para esta acción",
        );
        return;
      }
      setProductoSeleccionado(producto);
      setLoteActivo(activo);
      setSeleccionando(false);
    } catch {
      toast.error("No se pudieron cargar los lotes del producto");
    } finally {
      setCargandoLote(false);
    }
  };

  const handleVolver = () => {
    setProductoSeleccionado(null);
    setLoteActivo(null);
    setSeleccionando(true);
  };

  const hayFiltroActivo =
    busqueda.trim() !== "" ||
    (codigoEscaneado !== null && escaneoVigente);

  const limpiarFiltros = () => {
    setBusqueda("");
    setCodigoEscaneado(null);
    setPaginaActual(1);
    buscadorRef.current?.focus();
  };

  const handleComplete = () => {
    onSuccess();
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="xl"
      title={tituloModal}
      height="h-[80vh]"
      footer={
        accion && !seleccionando && accion in SUBMIT_LABEL && formId ? (
          <div className="flex w-full items-center justify-end gap-2">
            <Button type="submit" form={formId} variant="primary" loading={submitting}>
              {SUBMIT_LABEL[accion]}
            </Button>
          </div>
        ) : seleccionando && totalPaginas > 1 ? (
          <div className="flex w-full items-center justify-between gap-3  pt-3 ">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
              {(paginaSegura - 1) * PAGE_SIZE + 1}–
              {Math.min(paginaSegura * PAGE_SIZE, productosFiltrados.length)}{" "}
              de {productosFiltrados.length} productos
            </span>
            <Pagination
              currentPage={paginaSegura}
              totalPages={totalPaginas}
              onPageChange={setPaginaActual}
            />
          </div>
        ) : undefined
      }
    >
      {seleccionando ? (
        <div className="flex min-h-0 h-full flex-col gap-3">
          <div className="flex items-center gap-2">
            <Input
              ref={buscadorRef}
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setCodigoEscaneado(null);
                setPaginaActual(1);
              }}
              placeholder="Buscar producto por nombre, marca, categoría o código..."
              leftIcon={<Search size={16} />}
              onClear={hayFiltroActivo ? limpiarFiltros : undefined}
              autoFocus
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
          {codigoEscaneado && escaneoVigente && (
            <div className="flex shrink-0 items-center justify-between gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 dark:border-emerald-400/20 dark:bg-emerald-400/10">
              <div className="flex items-center justify-center gap-2 min-w-0">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300">
                  <ScanLine size={13} />
                </span>
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Escaneado:
                </span>
                <code className="min-w-0 max-w-[16rem] truncate text-sm mt-0.5 font-semibold tracking-wide text-emerald-900 dark:text-emerald-100">
                  {codigoEscaneado}
                </code>
              </div>
              <Tooltip content="Salir del filtro escaneado">
              <button
                type="button"
                onClick={() => {
                  setCodigoEscaneado(null);
                  setPaginaActual(1);
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
          <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
            {cargandoLote ? (
              <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                Cargando lotes del producto…
              </p>
            ) : productosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <SearchX className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No se encontraron productos con esa búsqueda
                </p>
              </div>
            ) : (
              productosPaginados.map((producto) => {
                const marca =
                  marcas.find((m) => m.id === producto.marcaId)?.nombre ?? "";
                const categoria =
                  categorias.find((c) => c.id === producto.categoriaId)
                    ?.nombre ?? "";
                const detalle = [
                  marca,
                  categoria,
                  formatearCodigo(
                    producto.codigoInterno || producto.codigosBarras,
                  ),
                ]
                  .filter(Boolean)
                  .join(" · ");
                const sinStock =
                  accionRequiereLote && producto.stockActual <= 0;
                return (
                  <button
                    key={producto.id}
                    type="button"
                    onClick={() => void handleSeleccionarProducto(producto)}
                    disabled={sinStock}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5 text-left transition-colors dark:border-slate-800",
                      sinStock
                        ? "cursor-not-allowed opacity-40 dark:opacity-40"
                        : "cursor-pointer hover:border-emerald-500/40 hover:bg-emerald-500/5 dark:hover:border-emerald-500/30",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        <HighlightMatch
                          text={producto.nombre}
                          query={busqueda}
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
                    <span
                      className={
                        producto.stockActual > 0
                          ? "shrink-0 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                          : "shrink-0 text-xs font-semibold text-red-500 dark:text-red-400"
                      }
                    >
                      {producto.stockActual} und
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : productoSeleccionado && accion === "agregar-inventario" ? (
        <AgregarInventarioForm
          producto={productoSeleccionado}
          onCancel={handleVolver}
          onSuccess={handleComplete}
          onSubmittingChange={setSubmitting}
        />
      ) : productoSeleccionado && loteActivo && accion === "ajustar-stock" ? (
        <AjustarStockLoteForm
          lote={loteActivo}
          formId={formId}
          esLoteActivo
          onCancel={handleVolver}
          onSuccess={handleComplete}
          onSubmittingChange={setSubmitting}
        />
      ) : productoSeleccionado &&
        loteActivo &&
        accion === "registrar-perdida" ? (
        <RegistrarPerdidaLoteForm
          lote={loteActivo}
          productoId={productoSeleccionado.id}
          formId={formId}
          esLoteActivo
          onCancel={handleVolver}
          onSuccess={handleComplete}
          onSubmittingChange={setSubmitting}
        />
      ) : null}
    </Modal>
  );
}
