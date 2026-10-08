const NOTAS_HZ = [659.25, 783.99, 1046.5] // E5, G5, C6: tercera ascendente, corta y redonda
const VOLUMEN = 0.12
const ENTRE_NOTAS_S = 0.08
const DURACION_NOTA_S = 0.22

/** Para no duplicar la campanita si dos revisiones se pisan (ej: StrictMode). */
const INTERVALO_MINIMO_MS = 1000
let ultimaReproduccion = 0

let contexto: AudioContext | null = null

export function reproducirSonidoNotificacion(): void {
  const ahora = Date.now()
  if (ahora - ultimaReproduccion < INTERVALO_MINIMO_MS) return

  try {
    if (!contexto) contexto = new AudioContext()
    if (contexto.state === 'suspended') void contexto.resume()

    const inicioGlobal = contexto.currentTime
    NOTAS_HZ.forEach((frecuencia, indice) => {
      const inicio = inicioGlobal + indice * ENTRE_NOTAS_S
      const oscilador = contexto!.createOscillator()
      const ganancia = contexto!.createGain()
      oscilador.type = 'sine'
      oscilador.frequency.value = frecuencia
      ganancia.gain.setValueAtTime(0, inicio)
      ganancia.gain.linearRampToValueAtTime(VOLUMEN, inicio + 0.02)
      ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + DURACION_NOTA_S)
      oscilador.connect(ganancia).connect(contexto!.destination)
      oscilador.start(inicio)
      oscilador.stop(inicio + DURACION_NOTA_S)
    })
    ultimaReproduccion = ahora
  } catch {
    // Sin audio disponible: la notificación igual queda en la campanita.
  }
}
