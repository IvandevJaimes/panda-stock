import {
  alIniciarAlertaStock,
  hayAlertaStockActiva,
} from '../../lib/prioridadSonidos'

const NOTAS_HZ = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6: acorde ascendente agradable
const VOLUMEN = 0.16
const ENTRE_NOTAS_S = 0.06
const DURACION_NOTA_S = 0.25

const INTERVALO_MINIMO_MS = 800
let ultimaReproduccion = 0

let contexto: AudioContext | null = null
let master: GainNode | null = null
let osciladoresActivos: OscillatorNode[] = []

function silenciarVentaEnCurso(): void {
  if (!master) return
  const ahora = contexto!.currentTime
  master.gain.cancelScheduledValues(ahora)
  master.gain.setValueAtTime(master.gain.value, ahora)
  master.gain.linearRampToValueAtTime(0, ahora + 0.04)
  for (const oscilador of osciladoresActivos) {
    try {
      oscilador.stop(ahora + 0.05)
    } catch {
      // Ya detenido
    }
  }
  osciladoresActivos = []
}

alIniciarAlertaStock(silenciarVentaEnCurso)

export function reproducirSonidoVentaExitosa(): void {
  const ahora = Date.now()
  if (ahora - ultimaReproduccion < INTERVALO_MINIMO_MS) return

  // Prioridad absoluta: no pisa una alerta de stock que ya está sonando.
  if (hayAlertaStockActiva()) return

  try {
    if (!contexto) {
      contexto = new AudioContext()
      master = contexto.createGain()
      master.gain.value = VOLUMEN
      master.connect(contexto.destination)
    }
    if (contexto.state === 'suspended') void contexto.resume()

    const salida = master
    if (!salida) return
    const inicioGlobal = contexto.currentTime
    salida.gain.cancelScheduledValues(inicioGlobal)
    salida.gain.setValueAtTime(VOLUMEN, inicioGlobal)

    osciladoresActivos = []
    NOTAS_HZ.forEach((frecuencia, indice) => {
      const inicio = inicioGlobal + indice * ENTRE_NOTAS_S
      const oscilador = contexto!.createOscillator()
      const ganancia = contexto!.createGain()
      oscilador.type = 'sine'
      oscilador.frequency.value = frecuencia
      ganancia.gain.setValueAtTime(0, inicio)
      ganancia.gain.linearRampToValueAtTime(1, inicio + 0.02)
      ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + DURACION_NOTA_S)
      oscilador.connect(ganancia).connect(salida)
      oscilador.start(inicio)
      oscilador.stop(inicio + DURACION_NOTA_S)
      osciladoresActivos.push(oscilador)
    })
    ultimaReproduccion = ahora

    const ultima = osciladoresActivos[osciladoresActivos.length - 1]
    ultima.onended = () => {
      osciladoresActivos = []
    }
  } catch {
    // Silencioso si no hay audio
  }
}
