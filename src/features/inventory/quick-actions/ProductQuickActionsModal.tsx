import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { lotesService } from "../../../services/lotes.service";
import type { Lote, Producto } from "../../../../electron/db/types";
import { AgregarInventarioForm } from "./AgregarInventarioForm";
import { AjustarStockForm } from "./AjustarStockForm";
import { EditarCodigoForm } from "./EditarCodigoForm";
import { EditarVarianteForm } from "./EditarVarianteForm";
import { ModificarPrecioForm } from "./ModificarPrecioForm";
import { QuickActionsMenu } from "./QuickActionsMenu";
import { RegistrarPerdidaForm } from "./RegistrarPerdidaForm";
import { FORM_ID, SUBMIT_LABEL, type QuickActionView } from "./types";

export interface ProductQuickActionsModalProps {
  isOpen: boolean;
  product: Producto | null;
  marcaNombre: string;
  categoriaNombre: string;
  onClose: () => void;
  onFullEdit: () => void;
  onOpenLotes: () => void;
  onSuccess?: () => void;
}

export function ProductQuickActionsModal({
  isOpen,
  product,
  marcaNombre,
  categoriaNombre,
  onClose,
  onFullEdit,
  onOpenLotes,
  onSuccess,
}: ProductQuickActionsModalProps) {
  const [lotes, setLotes] = useState<Lote[] | null>(null);
  const [vistaActual, setVistaActual] = useState<QuickActionView>("menu");
  const [submitting, setSubmitting] = useState(false);

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

  const loteActivo = lotes
    ? (lotes.find((lote) => lote.cantidadActual > 0) ?? lotes[0] ?? null)
    : null;
  const loteIdentidad = loteActivo
    ? (loteActivo.numeroLote ?? `Lote #${loteActivo.id}`)
    : null;

  const accionesConLoteRequerido: QuickActionView[] = [
    "ajustar-stock",
    "registrar-perdida",
  ];

  const handleNavigate = (vista: QuickActionView) => {
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
    if (onSuccess) onSuccess();
    else onClose();
  };

  const handleClose = () => {
    setVistaActual("menu");
    setSubmitting(false);
    onClose();
  };

  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="lg"
      title="Acciones Rápidas"
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
            onNavigate={handleNavigate}
            onFullEdit={onFullEdit}
            onOpenLotes={onOpenLotes}
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

        {vistaActual === "ajustar-stock" && (
          <AjustarStockForm
            producto={product}
            lote={loteActivo}
            onCancel={() => setVistaActual("menu")}
            onSuccess={handleActionComplete}
            onSubmittingChange={setSubmitting}
            onOpenLotes={onOpenLotes}
          />
        )}

        {vistaActual === "registrar-perdida" && (
          <RegistrarPerdidaForm
            producto={product}
            lote={loteActivo}
            onCancel={() => setVistaActual("menu")}
            onSuccess={handleActionComplete}
            onSubmittingChange={setSubmitting}
            onOpenLotes={onOpenLotes}
          />
        )}

        {vistaActual === "precio-venta" && (
          <ModificarPrecioForm
            producto={product}
            precioInicial={product.precioVenta}
            onCancel={() => setVistaActual("menu")}
            onSuccess={handleActionComplete}
            onSubmittingChange={setSubmitting}
          />
        )}

        {vistaActual === "editar-codigo" && (
          <EditarCodigoForm
            producto={product}
            codigoInicial={product.codigosBarras || product.codigoInterno || ""}
            onCancel={() => setVistaActual("menu")}
            onSuccess={handleActionComplete}
            onSubmittingChange={setSubmitting}
          />
        )}

        {vistaActual === "variante-detalle" && (
          <EditarVarianteForm
            producto={product}
            varianteInicial={product.variante || ""}
            onCancel={() => setVistaActual("menu")}
            onSuccess={handleActionComplete}
            onSubmittingChange={setSubmitting}
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