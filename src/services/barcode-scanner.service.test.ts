import { beforeEach, describe, expect, it, vi } from 'vitest'
import { barcodeScannerService } from './barcode-scanner.service'
import { useScannerStore } from '../stores/scanner.store'

const BARCODE = '7791234567890'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function press(key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  })
  document.dispatchEvent(event)
  return event
}

/** Simula una ráfaga de scanner: una tecla cada `interKeyMs`. */
async function scanBurst(keys: string[], interKeyMs = 12): Promise<void> {
  for (const key of keys) {
    press(key)
    await sleep(interKeyMs)
  }
}

describe('barcodeScannerService', () => {
  const onScan = vi.fn()

  beforeEach(() => {
    onScan.mockReset()
    barcodeScannerService.configure({
      minLength: 4,
      avgTimeByChar: 45,
      timeBeforeScanTest: 120,
      suffixKey: 'Enter',
    })
    barcodeScannerService.initialize()
    useScannerStore.getState().setContext('sales', onScan)
  })

  it('captura el escaneo en fase capture y emite una sola vez', async () => {
    // El primer carácter de la ráfaga se bloquea y retiene en el buffer
    // especulativo: NUNCA debe llegar al input con foco.
    const first = press(BARCODE[0])
    expect(first.defaultPrevented).toBe(true)
    expect(barcodeScannerService.isScanInProgress()).toBe(true)

    await scanBurst([...BARCODE.slice(1)])
    const enter = press('Enter')
    await sleep(0)

    expect(enter.defaultPrevented).toBe(true)
    expect(onScan).toHaveBeenCalledTimes(1)
    expect(onScan).toHaveBeenCalledWith(BARCODE)
    expect(barcodeScannerService.isScanInProgress()).toBe(false)
  })

  it('initialize es idempotente y destroy limpia los listeners (StrictMode/HMR)', async () => {
    // Doble initialize → un solo listener → una sola emisión.
    barcodeScannerService.initialize()
    barcodeScannerService.initialize()
    await scanBurst([...BARCODE])
    const enter = press('Enter')
    await sleep(0)
    expect(enter.defaultPrevented).toBe(true)
    expect(onScan).toHaveBeenCalledTimes(1)

    // destroy → ya no hay captura global: el Enter fluye y no hay emisión.
    barcodeScannerService.destroy()
    await scanBurst([...BARCODE])
    const enter2 = press('Enter')
    await sleep(0)
    expect(enter2.defaultPrevented).toBe(false)
    expect(onScan).toHaveBeenCalledTimes(1)
  })

  it('tecleo humano lento se retiene y se entrega sin emitir como escaneo (Test 5/6 nivel evento)', async () => {
    // Cada carácter se bloquea y se acumula en el buffer especulativo; al no
    // cumplir el presupuesto de velocidad en el Enter, se entrega como tecleo
    // humano (por eso los keydown quedan preventeados pero no se pierde nada).
    const events: KeyboardEvent[] = []
    for (const key of '779123'.split('')) {
      events.push(press(key))
      expect(barcodeScannerService.isScanInProgress()).toBe(true)
      await sleep(60)
    }
    const enter = press('Enter')
    await sleep(0)

    expect(events.every((e) => e.defaultPrevented === true)).toBe(true)
    expect(enter.defaultPrevented).toBe(false)
    expect(onScan).not.toHaveBeenCalled()
    expect(barcodeScannerService.isScanInProgress()).toBe(false)
  })

  it('tecla no imprimible y comandos con modificadores no se tocan (Test 6)', async () => {
    const esc = press('Escape')
    const macro = new KeyboardEvent('keydown', {
      key: 'c',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    document.dispatchEvent(macro)
    await sleep(0)

    expect(esc.defaultPrevented).toBe(false)
    expect(macro.defaultPrevented).toBe(false)
    expect(onScan).not.toHaveBeenCalled()
  })

  it('un Enter humano sin escaneo conserva su comportamiento normal', () => {
    const enter = press('Enter')
    expect(enter.defaultPrevented).toBe(false)
  })

  it('consume el Enter duplicado inmediato del scanner', async () => {
    await scanBurst([...BARCODE])
    const enter1 = press('Enter')
    await sleep(0)

    const enter2 = press('Enter')
    await sleep(0)

    expect(enter1.defaultPrevented).toBe(true)
    expect(enter2.defaultPrevented).toBe(true)
    expect(onScan).toHaveBeenCalledTimes(1)
  })

  it('una ráfaga corta (minLength) no confirma y deja fluir el Enter', async () => {
    barcodeScannerService.configure({ minLength: 13 })
    await scanBurst('123'.split(''))
    const enter = press('Enter')
    await sleep(0)

    expect(enter.defaultPrevented).toBe(false)
    expect(onScan).not.toHaveBeenCalled()
  })

  it('un Enter que llega fuera de timeBeforeScanTest no confirma', async () => {
    await scanBurst([...BARCODE])
    await sleep(200) // supera timeBeforeScanTest (120ms)
    const enter = press('Enter')
    await sleep(0)

    expect(enter.defaultPrevented).toBe(false)
    expect(onScan).not.toHaveBeenCalled()
  })
})