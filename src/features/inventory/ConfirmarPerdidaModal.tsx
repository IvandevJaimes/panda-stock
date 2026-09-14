import { useState } from "react";
import { PackageX } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { movimientosService } from "../../services/movimientos.service";
import type { Lote, Producto } from "../../../electron/db/types";
import { toast } from "sonner";

function formatearPrecio(valor: number): string {
  return `$${valor.toFixed(2)}`;
}

interface ConfirmarPerdidaModalProps {
  isOpen: boolean;
  lote: Lote | null;
  producto: Producto | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ConfirmarPerdidaModal({
  isOpen,
  lote,
  producto,
  onClose,
  onSuccess,
}: ConfirmarPerdidaModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!lote || !producto) return null;

  const perdidaMonetaria = lote.cantidadActual * lote.costoUnitario;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await movimientosService.crearMovimiento({
        productoId: producto.id,
        loteId: lote.id,
        tipo: "merma",
        cantidad: lote.cantidadActual,
        motivo: "Producto vencido",
      });
      toast.success("Pérdida registrada y lote actualizado");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al confirmar pérdida",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm"
      title="Confirmar pérdida de lote"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => void handleConfirm()}
            loading={isSubmitting}
          >
            Confirmar pérdida
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 dark:bg-red-500/15">
          <PackageX className="h-7 w-7 text-red-500" strokeWidth={1.75} />
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Se registrará una <strong>merma total</strong> del lote{" "}
          <strong className="font-mono">{lote.numeroLote ?? `#${lote.id}`}</strong> y pasará al
          historial.
        </p>
        <div className="w-full rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4 dark:border-red-500/20 dark:bg-red-950/30">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-left text-xs">
            <dt className="text-slate-500 dark:text-slate-400">
              Stock a descontar
            </dt>
            <dd className="text-right font-semibold tabular-nums text-slate-800 dark:text-slate-100">
              {lote.cantidadActual}
            </dd>
            <dt className="text-slate-500 dark:text-slate-400">
              Costo unitario
            </dt>
            <dd className="text-right font-semibold tabular-nums text-slate-800 dark:text-slate-100">
              {formatearPrecio(lote.costoUnitario)}
            </dd>
            <dt className="border-t border-red-500/20 pt-2 font-medium text-red-600 dark:text-red-400">
              Pérdida estimada
            </dt>
            <dd className="border-t border-red-500/20 pt-2 text-right font-bold tabular-nums text-red-600 dark:text-red-400">
              {formatearPrecio(perdidaMonetaria)}
            </dd>
          </dl>
        </div>
      </div>
    </Modal>
  );
}
