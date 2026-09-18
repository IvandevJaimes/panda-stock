import { useMemo, useState } from "react";
import { Search, SearchX } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { HighlightMatch } from "../../../components/ui/HighlightMatch";
import { cn } from "../../../lib/cn";
import { Pagination } from "../../../components/ui/Pagination";
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

export type AccionGlobal = "agregar-inventario" | "ajustar-stock" | "registrar-perdida";

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

interface AccionGlobalModalProps {
  isOpen: boolean;
  accion: AccionGlobal | null;
  productos: ProductoConLoteActivo[];
  marcas: Marca[];
  categorias: Categoria[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AccionGlobalModal({
  isOpen,
  accion,
  productos,
  marcas,
  categorias,
  onClose,
  onSuccess,
}: AccionGlobalModalProps) {
  const [busqueda, setBusqueda] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [loteActivo, setLoteActivo] = useState<Lote | null>(null);
  const [cargandoLote, setCargandoLote] = useState(false);
  const [seleccionando, setSeleccionando] = useState(true);
  const [paginando, setPaginando] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);

  const handleClose = () => {
    setBusqueda("");
    setProductoSeleccionado(null);
    setLoteActivo(null);
    setCargandoLote(false);
    setSeleccionando(true);
    setSubmitting(false);
    setPaginaActual(1);
    onClose();
  };

  const productosFiltrados = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    const activos = productos.filter((p) => p.activo);
    if (!texto) return activos;
    return activos.filter((p) => {
      const marca = marcas.find((m) => m.id === p.marcaId)?.nombre ?? "";
      const categoria = categorias.find((c) => c.id === p.categoriaId)?.nombre ?? "";
      const variant = p.variante ?? "";
      return (
        normalizar(p.nombre).includes(texto) ||
        normalizar(marca).includes(texto) ||
        normalizar(categoria).includes(texto) ||
        normalizar(variant).includes(texto) ||
        normalizar(p.codigoInterno ?? "").includes(texto) ||
        normalizar(p.codigosBarras ?? "").includes(texto)
      );
    });
  }, [productos, busqueda, marcas, categorias]);

  const tituloModal = accion ? ACCION_LABEL[accion] : "Acción";
  const formId = accion
    ? accion === "agregar-inventario"
      ? FORM_ID["agregar-inventario"]
      : accion === "ajustar-stock"
        ? FORM_ID["ajustar-stock"]
        : FORM_ID["registrar-perdida"]
    : undefined;

  const accionRequiereLote = accion === "ajustar-stock" || accion === "registrar-perdida";

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
        toast.error("Este producto no tiene ningún lote con stock para esta acción");
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

  const handleComplete = () => {
    onSuccess();
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="lg"
      title={tituloModal}
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          {accion && !seleccionando && accion in SUBMIT_LABEL && formId && (
            <Button
              type="submit"
              form={formId}
              variant="primary"
              loading={submitting}
            >
              {SUBMIT_LABEL[accion]}
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cerrar
          </Button>
        </div>
      }
    >
      {seleccionando ? (
        <div className="flex flex-col gap-3">
          <Input
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPaginaActual(1);
            }}
            placeholder="Buscar producto por nombre, marca, categoría o código..."
            leftIcon={<Search size={16} />}
            onClear={busqueda ? () => setBusqueda("") : undefined}
            autoFocus
          />
          <div className="custom-scrollbar flex max-h-[45vh] flex-col gap-1.5 overflow-y-auto pr-1">
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
                const marca = marcas.find((m) => m.id === producto.marcaId)?.nombre ?? "";
                const categoria = categorias.find((c) => c.id === producto.categoriaId)?.nombre ?? "";
                const detalle = [marca, categoria, formatearCodigo(producto.codigoInterno || producto.codigosBarras)]
                  .filter(Boolean)
                  .join(" · ");
                const sinStock = accionRequiereLote && producto.stockActual <= 0;
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
                        <HighlightMatch text={producto.nombre} query={busqueda} compact />
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
          {totalPaginas > 1 && (
            <Pagination
              currentPage={paginaSegura}
              totalPages={totalPaginas}
              onPageChange={setPaginaActual}
            />
          )}
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
      ) : productoSeleccionado && loteActivo && accion === "registrar-perdida" ? (
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