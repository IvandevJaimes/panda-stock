import { useEffect, useRef } from "react";

const modalStack: symbol[] = [];

export function useModalEscape(isOpen: boolean, onEscape: () => void) {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!isOpen) return;

    const modalId = Symbol("modal");
    modalStack.push(modalId);

    const handleKeyDown = (event: KeyboardEvent) => {
      // Los modales comparten z-index: solo el último abierto debe consumir Escape.
      if (event.key !== "Escape" || modalStack.at(-1) !== modalId) return;
      event.stopPropagation();
      onEscapeRef.current();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      const index = modalStack.lastIndexOf(modalId);
      if (index >= 0) modalStack.splice(index, 1);
    };
  }, [isOpen]);
}
