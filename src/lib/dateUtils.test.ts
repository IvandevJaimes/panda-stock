import { describe, expect, it } from 'vitest'
import { formatearDuracionTranscurrida } from './dateUtils'

const AHORA = new Date('2026-09-30T15:00:00.000Z').getTime()

describe('formatearDuracionTranscurrida', () => {
  it('descompone la duración en horas, minutos y segundos', () => {
    expect(formatearDuracionTranscurrida('2026-09-30T12:45:27.000Z', AHORA)).toBe('02:14:33')
  })

  it('rellena con cero los segmentos de un solo dígito', () => {
    // 00:05:04 y no "0:5:4": el ancho tiene que ser estable porque el número tickea.
    expect(formatearDuracionTranscurrida('2026-09-30T14:54:56.000Z', AHORA)).toBe('00:05:04')
  })

  it('no trunca los segundos al cruzar el minuto', () => {
    expect(formatearDuracionTranscurrida('2026-09-30T14:58:59.500Z', AHORA)).toBe('00:01:00')
  })

  it('deja correr las horas más de 24 en vez de volver a cero', () => {
    // El caso que motiva el "sin tope": 26h leído como "02h" pasaría por un
    // turno que arranca a las dos de la mañana.
    expect(formatearDuracionTranscurrida('2026-09-29T13:00:00.000Z', AHORA)).toBe('26:00:00')
  })

  it('devuelve un hueco visible cuando la fecha no existe o no parsea', () => {
    expect(formatearDuracionTranscurrida(null, AHORA)).toBe('—')
    expect(formatearDuracionTranscurrida(undefined, AHORA)).toBe('—')
    expect(formatearDuracionTranscurrida('no-es-una-fecha', AHORA)).toBe('—')
  })

  it('clampa en cero una apertura cargada en el futuro', () => {
    // Reloj del sistema atrasado: sin el clamp saldría "−1:59:59".
    expect(formatearDuracionTranscurrida('2026-09-30T16:00:00.000Z', AHORA)).toBe('00:00:00')
  })

  it('avanza con el reloj', () => {
    const apertura = '2026-09-30T14:00:00.000Z'
    expect(formatearDuracionTranscurrida(apertura, AHORA)).toBe('01:00:00')
    expect(formatearDuracionTranscurrida(apertura, AHORA + 1000)).toBe('01:00:01')
  })
})
