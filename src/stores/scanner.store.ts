import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Scanner Store — Estado global del lector de códigos de barras.
//
// El contexto activo determina qué acción ejecutar al recibir un código.
// Los componentes se suscriben al store para reaccionar a escaneos.
// ---------------------------------------------------------------------------

/** Contextos donde el scanner tiene un comportamiento definido. */
export type BarcodeScannerContext =
  | 'product-form'
  | 'edit-code-form'
  | 'edit-product-form'
  | 'sales'
  | 'inventory'
  | 'inventory-action'
  | 'inventory-inactivos'
  | null

/**
 * Firma del callback que se invoca al recibir un código escaneado.
 * Cada contexto registra su propio handler cuando se activa.
 */
export type BarcodeScanHandler = (barcode: string) => void

type ScannerState = {
  /** Contexto actualmente activo (null = sin handler registrado). */
  context: BarcodeScannerContext
  /** Indica si el servicio de scanner está conectado y escuchando. */
  isAttached: boolean
  /** Handler del contexto activo. Se invoca al escanear un código válido. */
  _handler: BarcodeScanHandler | null

  // ── Acciones ──

  /** Registra un contexto con su handler de escaneo. */
  setContext: (context: BarcodeScannerContext, handler: BarcodeScanHandler | null) => void
  /** Limpia el contexto activo (solo si coincide para evitar race conditions). */
  clearContext: (context: BarcodeScannerContext) => void
  /** Marca el estado de conexión del servicio. */
  setAttached: (attached: boolean) => void
}

export const useScannerStore = create<ScannerState>((set, get) => ({
  context: null,
  isAttached: false,
  _handler: null,

  setContext: (context, handler) => set({ context, _handler: handler }),

  clearContext: (context) => {
    // Solo limpia si el contexto actual coincide. Esto evita que un componente
    // que se desmonta elimine el handler de un componente que acaba de montar.
    if (get().context === context) {
      set({ context: null, _handler: null })
    }
  },

  setAttached: (attached) => set({ isAttached: attached }),
}))
