import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { ConfirmModal } from "../components/ui/ConfirmModal";

export function useUnsavedChangesGuard() {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingClose, setPendingClose] = useState<(() => void) | null>(null);

  const requestClose = useCallback(
    (hasChanges: boolean, close: () => void) => {
      if (!hasChanges) {
        close();
        return;
      }
      setPendingClose(() => close);
      setIsConfirmOpen(true);
    },
    [],
  );

  const cancelDiscard = useCallback(() => {
    setIsConfirmOpen(false);
    setPendingClose(null);
  }, []);

  const confirmDiscard = useCallback(() => {
    const close = pendingClose;
    cancelDiscard();
    close?.();
  }, [cancelDiscard, pendingClose]);

  const confirmation: ReactNode = (
    <ConfirmModal
      isOpen={isConfirmOpen}
      onClose={cancelDiscard}
      onConfirm={confirmDiscard}
      title="Descartar cambios"
      description="Hay cambios sin guardar. Si salís ahora, se perderán."
      confirmText="Descartar y salir"
      cancelText="Seguir editando"
    />
  );

  return { requestClose, confirmation };
}
