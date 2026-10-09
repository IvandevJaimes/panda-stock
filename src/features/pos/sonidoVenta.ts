const NOTAS_HZ = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6: acorde ascendente agradable
const VOLUMEN = 0.16
const ENTRE_NOTAS_S = 0.06
const DURACION_NOTA_S = 0.25

const INTERVALO_MINIMO_MS = 800
let ultimaReproduccion = 0

let contexto: AudioContext | null = null

export function reproducirSonidoVentaExitosa(): void {
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
    // Silencioso si no hay audio
  }
}
