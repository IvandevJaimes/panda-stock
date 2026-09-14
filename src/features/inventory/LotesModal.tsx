import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { lotesService } from "../../services/lotes.service";
import { ProductLotsTab } from "./ProductLotsTab";
import type { Lote, Producto } from "../../../electron/db/types";

export interface LotesModalProps {
  isOpen: boolean;
  product: Producto;
  marcaNombre?: string;
  categoriaNombre?: string;
  onClose: () => void;
  onMutated: () => void;
}

/**
 * Modal independiente de gestión de lotes. Reemplaza la pestaña "Lotes" que
 * vivía dentro de ProductDetailModal: ahora es un modal propio al que se llega
 * desde la card del producto, las acciones rápidas y el detalle.
 */
export function LotesModal({
  isOpen,
  product,
  marcaNombre,
  categoriaNombre,
  onClose,
  onMutated,
}: LotesModalProps) {
  const [lotes, setLotes] = useState<Lote[] | null>(null);

  // Los lotes se cargan al abrir el modal. null = cargando; los setState viven
  // en callbacks asíncronos (.then/.catch), respetando react-hooks/set-state-in-effect.
  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, product.id]);

  /** Refresca lotes internamente y notifica al padre para que recargue el producto */
  const refreshData = () => {
    void lotesService
      .getByProducto(product.id)
      .then(setLotes)
      .catch(() => setLotes([]));
    onMutated();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title="Gestión de lotes"
      height="h-[80vh]"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <ProductLotsTab
        product={product}
        marcaNombre={marcaNombre}
        categoriaNombre={categoriaNombre}
        lotes={lotes}
        onMutated={refreshData}
      />
    </Modal>
  );
}