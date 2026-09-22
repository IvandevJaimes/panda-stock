import { useEffect, useRef } from "react";
import {
  hotkeyMatchesEvent,
  isEditableTarget,
  parseHotkey,
  type HotkeyBinding,
} from "../lib/hotkeys";

export interface UseHotkeyOptions {
  /** Si es false el atajo queda desactivado (se desregistra el listener). */
  enabled?: boolean;
  /** Llamar event.preventDefault() antes del handler. Default: true. */
  preventDefault?: boolean;
  /** No disparar si el foco está en un input/textarea/contenteditable. Default: true. */
  ignoreInputs?: boolean;
}

/**
 * Registra un atajo global (sobre document) mientras el componente está montado.
 * El atajo se expresa como string: "mod+k", "ctrl+shift+f1", "escape", "a".
 * - `mod` = Cmd en macOS, Ctrl en el resto.
 * - El handler siempre se lee desde una ref, así no hace falta memoizarlo.
 * - Cambiar el `shortcut` no vuelve a suscribir el listener.
 */
export function useHotkey(
  shortcut: string | null | undefined,
  handler: (event: KeyboardEvent) => void,
  options?: UseHotkeyOptions,
) {
  const { enabled = true, preventDefault = true, ignoreInputs = true } =
    options ?? {};

  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const binding = shortcut ? parseHotkey(shortcut) : null;
  const bindingRef = useRef<HotkeyBinding | null>(binding);
  useEffect(() => {
    bindingRef.current = binding;
  }, [binding]);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const binding = bindingRef.current;
      if (!binding) return;

      if (ignoreInputs && isEditableTarget(event.target)) return;

      // Las teclas modificadoras solas nunca cuentan como atajo.
      if (["control", "alt", "shift", "meta"].includes(event.key.toLowerCase())) {
        return;
      }

      if (!hotkeyMatchesEvent(binding, event)) return;

      if (preventDefault) event.preventDefault();
      handlerRef.current(event);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled, preventDefault, ignoreInputs]);
}