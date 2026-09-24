import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { lotesService } from "../../../services/lotes.service";
import { evaluateExpiry } from "../../../lib/dateUtils";
import { esLoteVencido, getLoteActivo } from "../loteHelpers";
import type { Categoria, Lote, Producto } from "../../../../electron/db/types";
import { EditarProductoForm } from "./EditarProductoForm";
import { AgregarInventarioForm } from "./AgregarInventarioForm";
import { EditarCodigoForm } from "./EditarCodigoForm";
import { EditarVarianteForm } from "./EditarVarianteForm";
import { ModificarPrecioForm } from "./ModificarPrecioForm";
import { QuickActionsMenu } from "./QuickActionsMenu";
import { StockMinimoForm } from "./StockMinimoForm";
import { ToggleActivoProducto } from "../ToggleActivoProducto";
import { AjustarStockLoteForm } from "../lote-actions/AjustarStockLoteForm";
import { RegistrarPerdidaLoteForm } from "../lote-actions/RegistrarPerdidaLoteForm";
import { FORM_ID, SUBMIT_LABEL, type QuickActionView } from "./types";

export interface ProductQuickActionsModalProps {
  isOpen: boolean;
  product: Producto | null;
  marcaNombre: string;
  categoriaNombre: string;
  categorias: Categoria[];
  vistaInicial?: QuickActionView;
  onClose: () => void;
  onOpenLotes: () => void;
  onConfirmarPerdida?: (producto: Producto, lote: Lote) => void;
  onSuccess?: () => void;
  onCategoriaCreada?: (categoria: Categoria) => void;
}

export function ProductQuickActionsModal({
  isOpen,
  product,
  marcaNombre,
  categoriaNombre,
  categorias,
  vistaInicial = "menu",
  onClose,
  onOpenLotes,
  onConfirmarPerdida,
  onSuccess,
  onCategoriaCreada,
}: ProductQuickActionsModalProps) {
  const [lotes, setLotes] = useState<Lote[] | null>(null);
  const [vistaActual, setVistaActual] = useState<QuickActionView>(vistaInicial);
  const [submitting, setSubmitting] = useState(false);
  const [puedeGuardar, setPuedeGuardar] = useState(false);

  useEffect(() => {
    if (!isOpen || !product) return;
    let activo = true;

    void lotesService
      .getByProducto(product.id)
      .then((data) => {
        if (!activo) return;
        setLotes(data);
      })
      .catch(() => {
        if (!activo) return;
        setLotes([]);
      });

    return () => {
      activo = false;
    };
  }, [isOpen, product]);

  const loteActivo = getLoteActivo(lotes);
  const loteIdentidad = loteActivo
    ? (loteActivo.numeroLote ?? `Lote #${loteActivo.id}`)
    : null;
  const loteActivoVencido = loteActivo
    ? esLoteVencido(loteActivo.fechaVence)
    : false;
  const loteActivoPorVencer = loteActivo?.fechaVence
    ? evaluateExpiry(loteActivo.fechaVence)?.status === "expiring_soon"
    : false;

  const accionesConLoteRequerido: QuickActionView[] = [
    "ajustar-stock",
    "registrar-perdida",
  ];

  const VISTAS_EDICION: QuickActionView[] = [
    "precio-venta",
    "editar-codigo",
    "variante-detalle",
    "stock-minimo",
    "editar-producto",
  ];

  const handleNavigate = (vista: QuickActionView) => {
    setPuedeGuardar(false);
    if (!accionesConLoteRequerido.includes(vista)) {
      setVistaActual(vista);
      return;
    }
    if (lotes === null) {
      toast.info("Cargando lotes, intentá de nuevo");
      return;
    }
    if (!loteActivo) {
      toast.error("No hay lote activo para esta acción");
      return;
    }
    setVistaActual(vista);
  };

  const handleActionComplete = () => {
    setVistaActual("menu");
    setSubmitting(false);
    setPuedeGuardar(false);
    if (onSuccess) onSuccess();
    else onClose();
  };

  const handleClose = () => {
    setVistaActual("menu");
    setSubmitting(false);
    setPuedeGuardar(false);
    onClose();
  };

  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="xl"
      title="Acciones Rápidas"
      headerExtra={
        <ToggleActivoProducto
          producto={product}
          onChanged={onSuccess}
          onDesactivado={handleClose}
        />
      }
    >
      <div className="flex flex-col">
        {vistaActual === "menu" && (
          <QuickActionsMenu
            producto={product}
            marcaNombre={marcaNombre}
            categoriaNombre={categoriaNombre}
            loteIdentidad={loteIdentidad}
            lotesCargando={lotes === null}
            tieneLoteActivo={loteActivo !== null}
            loteVencido={loteActivoVencido}
            loteActivoPorVencer={loteActivoPorVencer}
            loteFechaVence={loteActivo?.fechaVence ?? null}
            onNavigate={handleNavigate}
            onConfirmarPerdida={
              loteActivoVencido && product && loteActivo
                ? () => onConfirmarPerdida?.(product, loteActivo)
                : undefined
            }
            onOpenLotes={onOpenLotes}
            onImagenChanged={handleActionComplete}
          />
        )}

        {vistaActual === "agregar-inventario" && (
          <AgregarInventarioForm
            producto={product}
            onCancel={() => setVistaActual("menu")}
            onSuccess={handleActionComplete}
            onSubmittingChange={setSubmitting}
          />
        )}

        {vistaActual === "ajustar-stock" && loteActivo && (
          <AjustarStockLoteForm
            lote={loteActivo}
            formId={FORM_ID["ajustar-stock"]}
            esLoteActivo
            onOpenLotes={onOpenLotes}
            onCancel={() => setVistaActual("menu")}
            onSuccess={handleActionComplete}
            onSubmittingChange={setSubmitting}
          />
        )}

        {vistaActual === "registrar-perdida" && loteActivo && (
          <RegistrarPerdidaLoteForm
            lote={loteActivo}
            productoId={product.id}
            formId={FORM_ID["registrar-perdida"]}
            esLoteActivo
            onOpenLotes={onOpenLotes}
            onCancel={() => setVistaActual("menu")}
            onSuccess={handleActionComplete}
            onSubmittingChange={setSubmitting}
          />
        )}

        {vistaActual === "precio-venta" && (
          <ModificarPrecioForm
            producto={product}
            precioInicial={product.precioVenta}
            onCancel={() => setVistaActual("menu")}
            onSuccess={handleActionComplete}
            onSubmittingChange={setSubmitting}
            onCanSaveChange={setPuedeGuardar}
          />
        )}

        {vistaActual === "editar-codigo" && (
          <EditarCodigoForm
            producto={product}
            onCancel={() => setVistaActual("menu")}
            onSuccess={handleActionComplete}
            onSubmittingChange={setSubmitting}
            onCanSaveChange={setPuedeGuardar}
          />
        )}

        {vistaActual === "variante-detalle" && (
          <EditarVarianteForm
            producto={product}
            varianteInicial={product.variante || ""}
            onCancel={() => setVistaActual("menu")}
            onSuccess={handleActionComplete}
            onSubmittingChange={setSubmitting}
            onCanSaveChange={setPuedeGuardar}
          />
        )}

        {vistaActual === "editar-producto" && (
          <EditarProductoForm
            producto={product}
            categorias={categorias}
            onCancel={() => setVistaActual("menu")}
            onSuccess={handleActionComplete}
            onSubmittingChange={setSubmitting}
            onCanSaveChange={setPuedeGuardar}
            onCategoriaCreada={onCategoriaCreada}
          />
        )}

        {vistaActual === "stock-minimo" && (
          <StockMinimoForm
            producto={product}
            stockMinimoInicial={product.stockMinimo}
            onCancel={() => setVistaActual("menu")}
            onSuccess={handleActionComplete}
            onSubmittingChange={setSubmitting}
            onCanSaveChange={setPuedeGuardar}
          />
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800/60">
        {vistaActual !== "menu" && (
          <Button
            type="submit"
            form={FORM_ID[vistaActual]}
            variant="primary"
            loading={submitting}
            disabled={VISTAS_EDICION.includes(vistaActual) && !puedeGuardar}
          >
            {SUBMIT_LABEL[vistaActual]}
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={handleClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}