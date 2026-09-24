import { useScannerStore } from '../stores/scanner.store'

// ---------------------------------------------------------------------------
// Barcode Scanner Service — Captura global en fase CAPTURE (fuente de verdad).
//
// Una lectora USB HID "escribe" el código como ráfagas de teclas a velocidad
// imposible para un humano (habitualmente ≤30ms entre teclas) seguidas de Enter.
// Este servicio intercepta esas teclas en window con capture=true — ANTES de que
// lleguen al input con foco, a React y al formulario.
//
// Estrategia: DOBLE MODO según contexto.
//
//   MODO ESTRICTO (contextos 'inventory' e 'inventory-action' — buscadores de
//   la grilla y del modal de acciones globales):
//   • El scanner trabaja EN SEGUNDO PLANO: captura completa en fase capture,
//     cada carácter del lector se BLOQUEA y NUNCA llega al input. Al Enter con
//     criterios se emite el código al handler y el buscador queda intacto.
//   • El tecleo humano se retiene en el buffer y se ENTREGA de golpe apenas se
//     detecta silencio: la primera tecla espera 100ms (tolera el arranque lento
//     de la lectora, 30-90ms) y las siguientes 45ms (la lectora va a ≤40ms/char,
//     un humano a 60ms+). Latencia imperceptible, filtrado en vivo a escala
//     humana sin que el código escaneado toque jamás el input.
//   • El handler del contexto es quien muestra el resultado en la grilla
//     (búsqueda en background), sin escribir nada en el buscador.
//
//   MODO BLOQUEO (formularios y ventas: product-form, edit-code-form,
//   edit-product-form, sales):
//   • Todo carácter imprimible se BLOQUEA y se acumula en un buffer pendiente,
//     PERO se ENTREGA en vivo al input (vía set-value + dispatch de input),
//     para que el estado React se actualice al instante.
//   • Si la ráfaga se CONFIRMA como escaneo (Enter + criterios), el input se
//     REVIERTE al valor previo y se emite el código al handler. Así el código
//     jamás queda pegado a un campo de formulario.
//   • Si NO se confirma (silencio, Enter inválido o tecla no imprimible), era
//     tecleo humano: los caracteres ya se entregaron en vivo, no hay más que
//     hacer.
//
//   Criterios de escaneo (ambos modos): longitud mínima, Enter dentro de la
//   ventana y presupuesto de velocidad (tecleo humano sostenido ≥60ms/tecla
//   jamás lo cumple). El arranque lento de la lectora (gap inicial 30-90ms) se
//   tolera: en modo bloqueo el buffer completo queda retenido en paralelo a la
//   entrega en vivo; en modo estricto la primera tecla se retiene 100ms antes
//   de liberarse como humano.
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

// Ventanas de retención del MODO ESTRICTO (inventario). La primera tecla
// espera más porque la lectora arranca con un gap inicial de 30-90ms; las
// siguientes usan una ventana corta: la lectora emite a ≤40ms/char pero un
// humano rara vez baja de 60ms.
const STRICT_FIRST_CHAR_MS = 100
const STRICT_NEXT_CHAR_MS = 45

let config: BarcodeScannerConfig = { ...DEFAULT_CONFIG }

// ── Estado interno del singleton ────────────────────────────────────────────

/** Ráfaga pendiente de confirmar (escaneo o tecleo humano). */
interface PendingBurst {
  chars: string
  startTime: number
  lastCharTime: number
  /** Modo estricto (buscador de inventario): el scanner NUNCA escribe en el
   *  input; el buffer se entrega de golpe como tecleo humano tras el silencio. */
  strict: boolean
  /** Input/textarea donde se entregan (vivo) y revierten los caracteres en
   *  modo bloqueo, o donde se libera el buffer acumulado en modo estricto. */
  element: HTMLInputElement | HTMLTextAreaElement | null
  /** Valor del elemento AL EMPEZAR la ráfaga: base para la reversión si se
   *  confirma escaneo (modo bloqueo). */
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
 * Escribe el valor usando el SETTER NATIVO del prototipo, NO el asignador
 * `element.value = x`.
 *
 * Por qué: React 19 reemplaza el descriptor `value` de la instancia con un
 * wrapper que registra el cambio en su value-tracker interno. Asignar
 * `element.value` pasa por ese wrapper, así que cuando después disparamos el
 * Event('input'), React ya "vio" el cambio como programático y NO ejecuta
 * onChange → el estado controlado del input se queda congelado en el valor
 * anterior (exactamente el desfase de búsqueda reportado). El setter del
 * prototipo lo omite: React detecta la diferencia en el evento y onChange
 * dispara con normalidad.
 */
function writeNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): void {
  const proto =
    element instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value')
  if (descriptor?.set) {
    descriptor.set.call(element, value)
  } else {
    element.value = value
  }
}

/**
 * Entrega texto al input en el cursor (o al final) y dispara un evento input
 * real para que React actualice el estado controlado.
 *
 * Se usa deliberadamente el mismo camino en TODOS los entornos (Chromium real,
 * jsdom y Electron): SET del valor vía setter NATIVO + dispatch de Event('input').
 */
function deliverHeldText(
  element: HTMLInputElement | HTMLTextAreaElement,
  text: string,
): void {
  const start = element.selectionStart ?? element.value.length
  const end = element.selectionEnd ?? element.value.length
  writeNativeValue(
    element,
    element.value.slice(0, start) + text + element.value.slice(end),
  )
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

/**
 * Descarta la ráfaga como tecleo humano.
 * • Modo bloqueo: los caracteres YA se entregaron en vivo, solo limpiar.
 * • Modo estricto: nunca se entregó nada; hay que LIBERAR el buffer acumulado
 *   al input (edición normal) para que el tecleo humano se vea.
 */
function flushAsHuman(pending: PendingBurst): void {
  if (pending.strict && pending.element && pending.element.isConnected) {
    deliverHeldText(pending.element, pending.chars)
  }
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
  writeNativeValue(element, valueAtStart)
  try {
    element.setSelectionRange(valueAtStart.length, valueAtStart.length)
  } catch {
    // Algunos inputs (ej. type=number) rechazan setSelectionRange.
  }
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Crea una ráfaga.
 *  • Modo estricto: NO entrega nada aún (el scanner no escribe); el buffer se
 *    liberará como tecleo humano recién al vencer el silencio (ventana amplia
 *    para la primera tecla, por arranque lento de la lectora).
 *  • Modo bloqueo: entrega el primer carácter en vivo y agenda la espera de
 *    confirmación por silencio. */
function startBurst(event: KeyboardEvent, now: number): void {
  const strict =
    useScannerStore.getState().context === 'inventory' ||
    useScannerStore.getState().context === 'inventory-action'
  // En modo estricto el elemento se captura igualmente: hay que liberarle el
  // buffer al descartar el tecleo humano.
  const element = focusedEditable()
  const next: PendingBurst = {
    chars: event.key,
    startTime: now,
    lastCharTime: now,
    strict,
    element,
    valueAtStart: element?.value ?? '',
    idleTimer: null,
  }
  if (!strict && element) deliverHeldText(element, event.key)
  next.idleTimer = setTimeout(() => {
    if (burst === next) flushAsHuman(next)
  }, strict ? STRICT_FIRST_CHAR_MS : config.timeBeforeScanTest)
  burst = next
}

function appendCharToBurst(event: KeyboardEvent, now: number): void {
  if (!burst) return
  clearIdleTimer(burst)
  burst.chars += event.key
  burst.lastCharTime = now
  if (!burst.strict && burst.element && burst.element.isConnected) {
    deliverHeldText(burst.element, event.key)
  }
  burst.idleTimer = setTimeout(() => {
    if (burst) flushAsHuman(burst)
  }, burst.strict ? STRICT_NEXT_CHAR_MS : config.timeBeforeScanTest)
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

  // Modo bloqueo: revierte los caracteres entregados de forma especulativa al
  // input. Modo estricto: nunca se entregó nada, el input queda intacto y el
  // handler muestra el producto en la grilla (búsqueda en background).
  if (!pending.strict) revertBurst(pending)

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
      const ventana = burst.strict
        ? STRICT_NEXT_CHAR_MS
        : config.timeBeforeScanTest
      const dentroDeVentana = now - burst.lastCharTime <= ventana
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
    // La ráfaga sigue viva: SIEMPRE se bloquea (en estricto el scanner no debe
    // escribir en el input; en bloqueo antes de que llegue a React/input).
    blockEvent(event)
    debug('keydown', event.key, 'phase capture, blocked: true')
    appendCharToBurst(event, now)
    return
  }

  // Primer carácter de un posible escaneo (o de tecleo humano).
  startBurst(event, now)
  blockEvent(event)
  debug(
    'keydown',
    event.key,
    'phase capture, scannerCandidate: true, blocked: true',
  )
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