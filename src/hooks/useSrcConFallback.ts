import { useCallback, useState } from 'react'

export type SrcConFallback = {
  /** src a renderizar en el `<img>`. */
  src: string
  /** Handler para `onError`. */
  onError: () => void
  /** true cuando el src original falló y se está mostrando el preview. */
  cayo: boolean
}

/**
 * Resuelve el caso "la DB tiene `img_path` pero el archivo no está en la
 * máquina": el `<img>` dispara `onError` y el producto queda con el ícono de
 * imagen rota del navegador. Acá se cae al preview en su lugar.
 *
 * El fallo se recuerda para no reintentar en loop: si el preview tampoco carga,
 * volver a asignar el mismo src hace que el navegador lo vuelva a pedir y
 * dispare `onError` otra vez, indefinidamente.
 */
export function useSrcConFallback(src: string, fallback: string): SrcConFallback {
  const [estado, setEstado] = useState({ src, cayo: false })
  const [previo, setPrevio] = useState(src)

  // Ajusta durante el render con estado y no con un ref: la regla react-hooks/refs
  // no permite escribir refs acá, y es el mismo patrón que ya usa ProductImageBox
  // para sincronizar su `imgPath`. Un efecto dejaría un frame con el preview del
  // producto anterior.
  if (src !== previo) {
    setPrevio(src)
    setEstado({ src, cayo: false })
  }

  const onError = useCallback(() => {
    // Guarda de loop: si el preview tampoco carga, reasignarlo hace que el
    // navegador lo vuelva a pedir y dispare `onError` indefinidamente.
    setEstado((previo) =>
      previo.cayo || previo.src === fallback
        ? previo
        : { src: fallback, cayo: true },
    )
  }, [fallback])

  return { src: estado.src, onError, cayo: estado.cayo }
}