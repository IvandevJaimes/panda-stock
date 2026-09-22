// ---------------------------------------------------------------------------
// Hotkeys — utilidades puras de parseo y matching de atajos de teclado.
// No depende de React: se puede testear y reutilizar fuera del render.
// ---------------------------------------------------------------------------

export interface HotkeyBinding {
  /** Tecla base normalizada (minúscula, sin modificadores). Ej: "a", "f1", "arrowup" */
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

/** En macOS los atajos usan Cmd (metaKey); en el resto, Ctrl. */
export const MOD_IS_META =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform);

const ALIASES: Record<string, string> = {
  esc: "escape",
  return: "enter",
  spacebar: " ",
  up: "arrowup",
  down: "arrowdown",
  left: "arrowleft",
  right: "arrowright",
  del: "delete",
  pageup: "pageup",
  pagedown: "pagedown",
};

export function normalizeKey(key: string): string {
  const lower = key.trim().toLowerCase();
  return ALIASES[lower] ?? lower;
}

/**
 * Convierte un atajo en un binding: "mod+k", "ctrl+shift+f1", "escape".
 * Devuelve null si el formato es inválido (sin tecla base o clave repetida).
 */
export function parseHotkey(shortcut: string): HotkeyBinding | null {
  const binding: HotkeyBinding = {
    key: "",
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
  };

  for (const parte of shortcut.split("+").map((p) => p.trim().toLowerCase())) {
    if (parte === "") return null;
    if (parte === "mod") {
      if (MOD_IS_META) binding.meta = true;
      else binding.ctrl = true;
    } else if (parte === "ctrl" || parte === "control") {
      binding.ctrl = true;
    } else if (parte === "meta" || parte === "cmd") {
      binding.meta = true;
    } else if (parte === "alt" || parte === "option") {
      binding.alt = true;
    } else if (parte === "shift") {
      binding.shift = true;
    } else if (binding.key === "") {
      binding.key = normalizeKey(parte);
    } else {
      return null;
    }
  }

  if (binding.key === "") return null;
  return binding;
}

/**
 * Coincidencia exacta: los modificadores presente en el evento deben ser
 * exactamente los del binding. Así "a" no se dispara con ctrl+a, etc.
 */
export function hotkeyMatchesEvent(
  binding: HotkeyBinding,
  event: KeyboardEvent,
): boolean {
  if (event.ctrlKey !== binding.ctrl) return false;
  if (event.altKey !== binding.alt) return false;
  if (event.shiftKey !== binding.shift) return false;
  if (event.metaKey !== binding.meta) return false;
  return event.key.toLowerCase() === binding.key;
}

/** Verdadero si el foco está en un campo editable (input, textarea, contenteditable). */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return true;
  }
  return target.isContentEditable;
}