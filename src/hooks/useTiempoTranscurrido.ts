import { useCallback, useSyncExternalStore } from 'react'
import { formatearDuracionTranscurrida } from '../lib/dateUtils'

/**
 * El reloj del sistema es un sistema externo, no estado de React: por eso va con
 * `useSyncExternalStore` y no con un `useState` + `setInterval`. El tick es la
 * suscripción, y leer la hora es el snapshot.
 */

/**
 * Segundos transcurridos, no milisegundos: el snapshot tiene que ser estable
 * entre ticks o React re-renderiza en bucle. Con `Date.now()` crudo cada lectura
 * devuelve un valor nuevo y el hook entra en loop; redondeando al segundo, dos
 * lecturas seguidas dan lo mismo.
 */
function getSegundos(): number {
  return Math.floor(Date.now() / 1000)
}

/**
 * Suscripción al tick. Sin `activo` no hay intervalo: colgado un `setInterval` de
 * un segundo mientras nadie mira la pantalla es gasto de CPU y de renders para
 * nada. Quien lo usa decide qué es "activo" — en la caja, que el modal esté
 * abierto.
 */
function useSuscripcionAlSegundo(activo: boolean) {
  return useCallback(
    (alCambiar: () => void) => {
      if (!activo) return () => {}
      const id = setInterval(alCambiar, 1000)
      return () => clearInterval(id)
    },
    [activo],
  )
}

export function useTiempoTranscurrido(
  desdeIso: string | null | undefined,
  activo: boolean,
): string | null {
  const suscribir = useSuscripcionAlSegundo(activo)
  const segundos = useSyncExternalStore(suscribir, getSegundos, getSegundos)

  if (!desdeIso) return null
  return formatearDuracionTranscurrida(desdeIso, segundos * 1000)
}
