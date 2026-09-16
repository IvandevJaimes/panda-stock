import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import type { Lote } from "../../../../electron/db/types";
import { AjustarStockLoteForm } from "./AjustarStockLoteForm";
import { EditarCostoLoteForm } from "./EditarCostoLoteForm";
import { EditarVencimientoLoteForm } from "./EditarVencimientoLoteForm";
import { LoteQuickActionsMenu } from "./LoteQuickActionsMenu";
import { RegistrarPerdidaLoteForm } from "./RegistrarPerdidaLoteForm";
import { FORM_ID_LOTE, SUBMIT_LABEL_LOTE, type LoteQuickView } from "./types";

export interface LotQuickActionsModalProps {
  isOpen: boolean;
  lote: Lote;
  productoId: number;
  onClose: () => void;
  onMutated: () => void;
  onConfirmarPerdida: (lote: Lote) => void;
}

export function LotQuickActionsModal({
  isOpen,
  lote,
  productoId,
  onClose,
  onMutated,
  onConfirmarPerdida,
}: LotQuickActionsModalProps) {
  const [vistaActual, setVistaActual] = useState<LoteQuickView>("menu");
  const [submitting, setSubmitting] = useState(false);
  const [puedeGuardar, setPuedeGuardar] = useState(false);

  const VISTAS_EDICION: LoteQuickView[] = ["editar-vencimiento", "editar-costo"];

  const handleActionComplete = () => {
    setVistaActual("menu");
    setSubmitting(false);
    setPuedeGuardar(false);
    onMutated();
    onClose();
  };

  const handleClose = () => {
    setVistaActual("menu");
    setSubmitting(false);
    setPuedeGuardar(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="lg" title="Acciones del Lote">
      <div className="flex flex-col">
        {vistaActual === "menu" && (
          <LoteQuickActionsMenu
            lote={lote}
            onNavigate={(v) => { setPuedeGuardar(false); setVistaActual(v); }}
            onConfirmarPerdida={() => onConfirmarPerdida(lote)}
          />
        )}

        {vistaActual === "ajustar-stock" && (
          <AjustarStockLoteForm
            lote={lote}
            onCancel={() => setVistaActual("menu")}
            onSuccess={handleActionComplete}
            onSubmittingChange={setSubmitting}
          />
        )}

        {vistaActual === "registrar-perdida" && (
          <RegistrarPerdidaLoteForm
            lote={lote}
            productoId={productoId}
            onCancel={() => setVistaActual("menu")}
            onSuccess={handleActionComplete}
            onSubmittingChange={setSubmitting}
          />
        )}

        {vistaActual === "editar-vencimiento" && (
          <EditarVencimientoLoteForm
            lote={lote}
            onCancel={() => setVistaActual("menu")}
            onSuccess={handleActionComplete}
            onSubmittingChange={setSubmitting}
            onCanSaveChange={setPuedeGuardar}
          />
        )}

        {vistaActual === "editar-costo" && (
          <EditarCostoLoteForm
            lote={lote}
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
            form={FORM_ID_LOTE[vistaActual]}
            variant="primary"
            loading={submitting}
            disabled={VISTAS_EDICION.includes(vistaActual) && !puedeGuardar}
          >
            {SUBMIT_LABEL_LOTE[vistaActual]}
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={handleClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}