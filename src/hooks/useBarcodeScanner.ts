import { useEffect, useRef } from 'react'
import {
  useScannerStore,
  type BarcodeScannerContext,
  type BarcodeScanHandler,
} from '../stores/scanner.store'
import { barcodeScannerService } from '../services/barcode-scanner.service'

// ---------------------------------------------------------------------------
// useBarcodeScanner — Hook para registrar un contexto de scanner.
//
// Uso típico:
//   useBarcodeScanner('product-form', (barcode) => {
//     setValue('codigosBarras', barcode)
//   })
//
// Al montar, registra el contexto y handler en el store global.
// Al desmontar, limpia el contexto (solo si sigue siendo el mismo).
// El handler se lee siempre desde una ref para evitar re-suscripciones.
// ---------------------------------------------------------------------------

/**
 * Registra un contexto de scanner con su handler.
 *
 * @param context — Identificador del contexto activo.
 * @param handler — Callback invocado cuando el scanner detecta un código.
 *                  Se llama con el barcode ya sanitizado como string.
 * @param enabled — Si es false, el contexto no se registra (útil para modales cerrados).
 */
export function useBarcodeScanner(
  context: BarcodeScannerContext,
  handler: BarcodeScanHandler,
  enabled = true,
): void {
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    if (!context || !enabled) return

    const setContext = useScannerStore.getState().setContext
    const clearContext = useScannerStore.getState().clearContext

    // Wrapper estable que siempre llama al handler más reciente.
    const stableHandler: BarcodeScanHandler = (barcode) => {
      handlerRef.current(barcode)
    }

    setContext(context, stableHandler)

    return () => {
      clearContext(context)
    }
  }, [context, enabled])
}

// ---------------------------------------------------------------------------
// useScannerInit — Hook de inicialización global del scanner.
//
// Debe usarse UNA SOLA VEZ en el componente raíz (App.tsx).
// Conecta el captor global en fase capture (singleton).
// Es seguro con StrictMode: initialize es idempotente y destroy limpia todo.
// ---------------------------------------------------------------------------

/**
 * Inicializa el servicio de barcode scanner.
 * Llamar exclusivamente en App.tsx o el componente raíz equivalente.
 */
export function useScannerInit(): void {
  useEffect(() => {
    barcodeScannerService.initialize()
    return () => {
      barcodeScannerService.destroy()
    }
  }, [])
}