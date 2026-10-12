import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import type { Lote } from "../../../../electron/db/types";
import { AjustarStockLoteForm } from "./AjustarStockLoteForm";
import { EditarCostoLoteForm } from "./EditarCostoLoteForm";
import { EditarVencimientoLoteForm } from "./EditarVencimientoLoteForm";
import { LoteQuickActionsMenu } from "./LoteQuickActionsMenu";
import { RegistrarPerdidaLoteForm } from "./RegistrarPerdidaLoteForm";
import { FORM_ID_LOTE, SUBMIT_LABEL_LOTE, type LoteQuickView } from "./types";
import { useUnsavedChangesGuard } from "../../../hooks/useUnsavedChangesGuard";

export interface LotQuickActionsModalProps {
  isOpen: boolean;
  lote: Lote;
  stockActualProducto?: number;
  productoId: number;
  onClose: () => void;
  onMutated: () => void;
  onConfirmarPerdida: (lote: Lote) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function LotQuickActionsModal({
  isOpen,
  lote,
  stockActualProducto,
  productoId,
  onClose,
  onMutated,
  onConfirmarPerdida,
  onDirtyChange,
}: LotQuickActionsModalProps) {
  const [vistaActual, setVistaActual] = useState<LoteQuickView>("menu");
  const [submitting, setSubmitting] = useState(false);
  const [puedeGuardar, setPuedeGuardar] = useState(false);
  const [hayCambiosPendientes, setHayCambiosPendientes] = useState(false);
  const { requestClose, confirmation } = useUnsavedChangesGuard();

  const VISTAS_EDICION: LoteQuickView[] = ["editar-vencimiento", "editar-costo"];

  const handleActionComplete = () => {
    setVistaActual("menu");
    setSubmitting(false);
    setPuedeGuardar(false);
    setHayCambiosPendientes(false);
    onDirtyChange?.(false);
    onMutated();
    onClose();
  };

  const handleClose = () => {
    setVistaActual("menu");
    setSubmitting(false);
    setPuedeGuardar(false);
    setHayCambiosPendientes(false);
    onDirtyChange?.(false);
    onClose();
  };

  const handleBack = () => {
    setVistaActual("menu");
    setSubmitting(false);
    setPuedeGuardar(false);
    setHayCambiosPendientes(false);
    onDirtyChange?.(false);
  };

  useEffect(() => onDirtyChange?.(hayCambiosPendientes), [hayCambiosPendientes, onDirtyChange]);

  const intentarCerrar = () => requestClose(hayCambiosPendientes, handleClose);
  const intentarVolver = () => requestClose(hayCambiosPendientes, handleBack);

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={intentarCerrar}
      maxWidth="lg"
      title="Acciones del Lote"
      headerIcon={<Pencil className="h-4 w-4" />}
    >
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
            stockActualProducto={stockActualProducto}
            onCancel={intentarVolver}
            onSuccess={handleActionComplete}
            onSubmittingChange={setSubmitting}
            onDirtyChange={setHayCambiosPendientes}
          />
        )}

        {vistaActual === "registrar-perdida" && (
          <RegistrarPerdidaLoteForm
            lote={lote}
            productoId={productoId}
            onCancel={intentarVolver}
            onSuccess={handleActionComplete}
            onSubmittingChange={setSubmitting}
            onDirtyChange={setHayCambiosPendientes}
          />
        )}

        {vistaActual === "editar-vencimiento" && (
          <EditarVencimientoLoteForm
            lote={lote}
            onCancel={intentarVolver}
            onSuccess={handleActionComplete}
            onSubmittingChange={setSubmitting}
            onCanSaveChange={setPuedeGuardar}
            onDirtyChange={setHayCambiosPendientes}
          />
        )}

        {vistaActual === "editar-costo" && (
          <EditarCostoLoteForm
            lote={lote}
            onCancel={intentarVolver}
            onSuccess={handleActionComplete}
            onSubmittingChange={setSubmitting}
            onCanSaveChange={setPuedeGuardar}
            onDirtyChange={setHayCambiosPendientes}
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
        <Button type="button" variant="ghost" onClick={intentarCerrar}>
          Cerrar
        </Button>
      </div>
    </Modal>
    {confirmation}
    </>
  );
}
