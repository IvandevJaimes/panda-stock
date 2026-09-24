import { useScannerStore } from '../stores/scanner.store'

// ---------------------------------------------------------------------------
// Barcode Scanner Service — Captura global en fase CAPTURE (fuente de verdad).
//
// Una lectora USB HID "escribe" el código como ráfagas de teclas a velocidad
// imposible para un humano (habitualmente ≤30ms entre teclas) seguidas de Enter.
// Este servicio intercepta esas teclas en window con capture=true — ANTES de que
// lleguen al input con foco, a React y al formulario.
//
// Estrategia: BUFFER ESPECULATIVO con ENTREGA EN VIVO y REVERSIÓN.
//   • Todo carácter imprimible que llega se BLOQUEA (fase capture) para que el
//     lector nunca "tipee" el código en bruto, pero además se ENTREGA al input
//     con foco como si fuera tecleo normal: el input y el estado React se
//     actualizan AL INSTANTE (filtrado en vivo, sin retardo).
//   • La secuencia se CONFIRMA como escaneo cuando llega el Enter y cumple los
//     criterios (longitud mínima, Enter dentro de la ventana y presupuesto de
//     velocidad). El Enter se consume por completo (no submit, no click), el
//     input se REVIERTE al valor que tenía antes de la ráfaga (se descartan los
//     caracteres entregados de forma especulativa) y se emite el código al
//     handler, que es quien dispone el valor final.
//   • Si NO llega a confirmarse (silencio mayor a timeBeforeScanTest, Enter que
//     no cumple criterios, o una tecla no imprimible) era tecleo humano: los
//     caracteres ya se entregaron en vivo, no hay nada más que hacer.
//   • La reversión al confirmar mantiene intacta la tolerancia al arranque lento
//     de la lectora (gap inicial 30-90ms): el buffer completo sigue retenido en
//     paralelo a la visualización en vivo, así que nunca se pierde el primer
//     dígito del código.
// ---------------------------------------------------------------------------

// ── Configuración ───────────────────────────────────────────────────────────

export interface BarcodeScannerConfig {
  /** Longitud mínima del código para confirmar un escaneo. */
  minLength: number
  /** Presupuesto medio (ms/carácter) del código completo: el tecleo humano
   *  sostenido (≥60ms/tecla) jamás lo cumple. */
  avgTimeByChar: number
  /** Silencio (ms) tras la última tecla tras el cual el buffer pendiente se
   *  entrega como tecleo humano. También es la ventana en la que el Enter se
   *  considera fin de escaneo. */
  timeBeforeScanTest: number
  /** Tecla de fin de escaneo (estándar de lectores USB HID). */
  suffixKey: string
}

const DEFAULT_CONFIG: BarcodeScannerConfig = {
  minLength: 4,
  avgTimeByChar: 45,
  timeBeforeScanTest: 120,
  suffixKey: 'Enter',
}

let config: BarcodeScannerConfig = { ...DEFAULT_CONFIG }

// ── Estado interno del singleton ────────────────────────────────────────────

/** Ráfaga pendiente de confirmar (escaneo o tecleo humano). */
interface PendingBurst {
  chars: string
  startTime: number
  lastCharTime: number
  /** Input/textarea donde se entregan (vivo) y revierten los caracteres. */
  element: HTMLInputElement | HTMLTextAreaElement | null
  /** Valor del elemento AL EMPEZAR la ráfaga: base para la reversión si se
   *  confirma escaneo. */
  valueAtStart: string
  /** Timer de silencio: al vencer, la ráfaga se descarta como tecleo humano. */
  idleTimer: ReturnType<typeof setTimeout> | null
}

let burst: PendingBurst | null = null
/** Ventana para absorber un Enter duplicado inmediato del propio scanner. */
let suppressNextEnterUntil = 0
let initialized = false
let listenerAttached = false

// Bandera de desarrollo para trazar la detección (off por defecto).
const DEBUG = false

function debug(...args: unknown[]): void {
  if (DEBUG) console.info('[BarcodeScanner]', ...args)
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function isPrintableKey(event: KeyboardEvent): boolean {
  if (event.key.length !== 1) return false
  if (event.ctrlKey || event.metaKey || event.altKey) return false
  if (event.repeat) return false
  return true
}

function focusedEditable(): HTMLInputElement | HTMLTextAreaElement | null {
  const el = document.activeElement
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el
  }
  return null
}

function blockEvent(event: KeyboardEvent): void {
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
}

/**
 * Entrega los caracteres retenidos como si hubieran sido pulsados normalmente.
 * Prioriza Element.insertText (Chromium/Electron: dispara beforeinput+input,
 * sincroniza con React). Si no está disponible (jsdom/tests), inserta en el
 * cursor y dispara un input event real.
 */
function deliverHeldText(
  element: HTMLInputElement | HTMLTextAreaElement,
  text: string,
): void {
  const maybeInsertText = element as HTMLInputElement & {
    insertText?: (chars: string) => void
  }
  if (typeof maybeInsertText.insertText === 'function') {
    maybeInsertText.insertText(text)
    return
  }
  const start = element.selectionStart ?? element.value.length
  const end = element.selectionEnd ?? element.value.length
  element.value =
    element.value.slice(0, start) + text + element.value.slice(end)
  try {
    element.setSelectionRange(start + text.length, start + text.length)
  } catch {
    // Algunos inputs (ej. type=number) rechazan setSelectionRange.
  }
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

function clearIdleTimer(pending: PendingBurst): void {
  if (pending.idleTimer !== null) {
    clearTimeout(pending.idleTimer)
    pending.idleTimer = null
  }
}

/** Entrega el buffer pendiente y lo descarta. Con entrega en vivo los
 *  caracteres YA están en el input; aquí solo se limpia el estado. */
function flushAsHuman(pending: PendingBurst): void {
  clearIdleTimer(pending)
  burst = null
}

/**
 * Revierte el input al valor anterior a la ráfaga (descarta los caracteres
 * entregados de forma especulativa) y notifica a React mediante un evento input
 * real, de modo que el estado controlado vuelva a su valor previo.
 */
function revertBurst(pending: PendingBurst): void {
  const { element, valueAtStart } = pending
  if (!element || !element.isConnected) return
  element.value = valueAtStart
  try {
    element.setSelectionRange(valueAtStart.length, valueAtStart.length)
  } catch {
    // Algunos inputs (ej. type=number) rechazan setSelectionRange.
  }
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Crea una ráfaga con el primer carácter, lo entrega en vivo y agenda la
 *  espera de confirmación por silencio. */
function startBurst(event: KeyboardEvent, now: number): void {
  const element = focusedEditable()
  const next: PendingBurst = {
    chars: event.key,
    startTime: now,
    lastCharTime: now,
    element,
    valueAtStart: element?.value ?? '',
    idleTimer: null,
  }
  if (element) deliverHeldText(element, event.key)
  next.idleTimer = setTimeout(() => {
    if (burst === next) flushAsHuman(next)
  }, config.timeBeforeScanTest)
  burst = next
}

function appendCharToBurst(event: KeyboardEvent, now: number): void {
  if (!burst) return
  clearIdleTimer(burst)
  burst.chars += event.key
  burst.lastCharTime = now
  if (burst.element && burst.element.isConnected) {
    deliverHeldText(burst.element, event.key)
  }
  burst.idleTimer = setTimeout(() => {
    if (burst) flushAsHuman(burst)
  }, config.timeBeforeScanTest)
}

function emitBarcode(barcode: string): void {
  const handler = useScannerStore.getState()._handler
  if (handler) handler(barcode)
}

function finalizeScan(event: KeyboardEvent): void {
  const pending = burst
  if (!pending) return
  const barcode = pending.chars

  // Consume el Enter del scanner: NO submit, NO click, NO cambio de foco.
  blockEvent(event)
  debug('barcode detected:', barcode)

  clearIdleTimer(pending)
  burst = null

  // Revierte los caracteres entregados de forma especulativa al input.
  revertBurst(pending)

  // Ahoga un posible Enter duplicado del scanner (algunos modelos lo re-emiten).
  suppressNextEnterUntil = Date.now() + 300

  // Emisión diferida a un microtask para no interferir con el parseo del keydown.
  queueMicrotask(() => {
    emitBarcode(barcode)
  })
}

// ── Listener global (fase capture) ─────────────────────────────────────────

function handleKeyDown(event: KeyboardEvent): void {
  if (!initialized) return
  if (event.isComposing) return

  const now = Date.now()

  // ── Enter ──
  if (event.key === config.suffixKey) {
    if (burst) {
      const dentroDeVentana =
        now - burst.lastCharTime <= config.timeBeforeScanTest
      const presupuestoOk =
        now - burst.startTime <= burst.chars.length * config.avgTimeByChar
      if (burst.chars.length >= config.minLength && dentroDeVentana && presupuestoOk) {
        finalizeScan(event)
      } else {
        // No cumple los criterios: era Enter humano. Se entrega lo tecleado
        // y el Enter fluye con su comportamiento normal.
        flushAsHuman(burst)
      }
      return
    }

    if (now <= suppressNextEnterUntil) {
      suppressNextEnterUntil = 0
      blockEvent(event)
    }
    return
  }

  if (!isPrintableKey(event)) {
    // Una tecla no imprimible cierra cualquier ráfaga pendiente: se entrega
    // lo acumulado como tecleo humano.
    if (burst) flushAsHuman(burst)
    return
  }

  // ── Carácter imprimible ──

  if (burst) {
    // La ráfaga sigue viva: BLOQUEAR antes de que llegue a React/input.
    blockEvent(event)
    debug('keydown', event.key, 'phase capture, blocked: true')
    appendCharToBurst(event, now)
    return
  }

  // Primer carácter de un posible escaneo (o de tecleo humano): se bloquea y
  // retiene a la espera de seguimiento o de confirmar que es humano.
  startBurst(event, now)
  blockEvent(event)
  debug('keydown', event.key, 'phase capture, scannerCandidate: true, blocked: true')
}

// ── API pública del singleton ─────────────────────────────────────────────

export const barcodeScannerService = {
  /**
   * Conecta el captor global. Idempotente: llamarlo dos veces NO duplica listeners.
   */
  initialize(): void {
    if (initialized) return
    initialized = true
    if (!listenerAttached) {
      window.addEventListener('keydown', handleKeyDown, true)
      listenerAttached = true
    }
    useScannerStore.getState().setAttached(true)
  },

  /**
   * Desconecta el captor global y limpia TODO el estado interno.
   */
  destroy(): void {
    if (listenerAttached) {
      window.removeEventListener('keydown', handleKeyDown, true)
      listenerAttached = false
    }
    if (burst) {
      clearIdleTimer(burst)
      burst = null
    }
    suppressNextEnterUntil = 0
    initialized = false
    useScannerStore.getState().setAttached(false)
  },

  isInitialized(): boolean {
    return initialized
  },

  /** Indica si hay una ráfaga pendiente de confirmar (detección en progreso). */
  isScanInProgress(): boolean {
    return burst !== null
  },

  getConfig(): BarcodeScannerConfig {
    return { ...config }
  },

  configure(partial: Partial<BarcodeScannerConfig>): void {
    config = { ...config, ...partial }
  },
} as const