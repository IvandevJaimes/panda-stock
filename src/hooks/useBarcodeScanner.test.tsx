import { StrictMode, useRef, useState, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { useBarcodeScanner, useScannerInit } from './useBarcodeScanner'

const BARCODE = '7791234567890'
const BARCODE_2 = '7799876543210'

type User = ReturnType<typeof userEvent.setup>

function ScannerHost({ children }: { children: ReactNode }) {
  useScannerInit()
  return <>{children}</>
}

// Contexto product-form: igual que CreateProductModal/EditarCodigoForm.
function ProductFormHost({ onScan }: { onScan?: (code: string) => void }) {
  const { register, handleSubmit, setValue } = useForm({
    defaultValues: { nombre: '', precio: '', stock: '', barcode: '' },
  })
  useBarcodeScanner('product-form', (barcode) => {
    setValue('barcode', barcode)
    onScan?.(barcode)
  })

  return (
    <form onSubmit={handleSubmit(() => undefined)}>
      <input aria-label="Nombre" {...register('nombre')} />
      <input aria-label="Precio" {...register('precio')} />
      <input aria-label="Stock" {...register('stock')} />
      <input aria-label="Código de barras" {...register('barcode')} />
      <button type="submit">Guardar</button>
    </form>
  )
}

// Contexto sales: agenda un producto a la venta (sin tocar inputs).
function SalesHost({ onScan }: { onScan: (code: string) => void }) {
  useBarcodeScanner('sales', onScan)
  return <input aria-label="buscador" data-testid="target" />
}

// Contexto inventory: replica el handler del buscador de la grilla (Page.tsx):
// cada escaneo REEMPLAZA el valor del input por completo.
function InventorySearchHost({ onScan }: { onScan?: (code: string) => void }) {
  const [busqueda, setBusqueda] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useBarcodeScanner('inventory', (barcode) => {
    setBusqueda(barcode)
    ref.current?.focus()
    onScan?.(barcode)
  })
  return (
    <>
      <input
        aria-label="Buscar producto"
        ref={ref}
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />
    </>
  )
}

/**
 * Escanea un código completo como lectora USB HID (ráfaga + Enter).
 * Los caracteres se despachan como keydown reales sobre el elemento con foco:
 * dispatch síncrono + sleep de 8ms → simulación determinista (userEvent por
 * tecla estira el gap bajo carga y rompería las ventanas de detección).
 * El Enter final se manda con userEvent para conservar la semántica de submit.
 */
async function scanCode(user: User, code = BARCODE) {
  for (const ch of code) {
    const target = (document.activeElement ?? document.body) as HTMLElement
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }),
    )
    await new Promise((resolve) => setTimeout(resolve, 8))
  }
  await user.keyboard('{Enter}')
}

/** Despacha una sola tecla imprimible como scanner (keydown real). */
async function scanKey(ch: string, thenSleepMs: number) {
  const target = (document.activeElement ?? document.body) as HTMLElement
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }),
  )
  await new Promise((resolve) => setTimeout(resolve, thenSleepMs))
}

const input = (label: string) =>
  screen.getByLabelText(label) as HTMLInputElement

describe('useBarcodeScanner — integración (bug del input con foco)', () => {
  it('Test 1: focus en Nombre → el input no recibe el código, barcode sí, sin submit', async () => {
    const user = userEvent.setup()
    const onScan = vi.fn()
    render(
      <ScannerHost>
        <ProductFormHost onScan={onScan} />
      </ScannerHost>,
    )

    await user.click(input('Nombre'))
    await scanCode(user)

    await waitFor(() =>
      expect(input('Código de barras').value).toBe(BARCODE),
    )
    expect(input('Nombre').value).toBe('')
    expect(onScan).toHaveBeenCalledTimes(1)
    expect(onScan).toHaveBeenCalledWith(BARCODE)
  })

  it('Test 2: focus en Precio → Precio no cambia y barcode recibe el código', async () => {
    const user = userEvent.setup()
    render(
      <ScannerHost>
        <ProductFormHost />
      </ScannerHost>,
    )

    await user.click(input('Precio'))
    await scanCode(user)

    await waitFor(() =>
      expect(input('Código de barras').value).toBe(BARCODE),
    )
    expect(input('Precio').value).toBe('')
  })

  it('Test 3: focus en Stock → Stock no cambia y barcode recibe el código', async () => {
    const user = userEvent.setup()
    render(
      <ScannerHost>
        <ProductFormHost />
      </ScannerHost>,
    )

    await user.click(input('Stock'))
    await scanCode(user)

    await waitFor(() =>
      expect(input('Código de barras').value).toBe(BARCODE),
    )
    expect(input('Stock').value).toBe('')
  })

  it('Caso C: focus en el propio campo de Código de barras → queda el código completo', async () => {
    const user = userEvent.setup()
    render(
      <ScannerHost>
        <ProductFormHost />
      </ScannerHost>,
    )

    await user.click(input('Código de barras'))
    await scanCode(user)

    await waitFor(() =>
      expect(input('Código de barras').value).toBe(BARCODE),
    )
  })

  it('Test 7: el Enter del scanner NO dispara submit (submitCount 0)', async () => {
    const user = userEvent.setup()
    let submitCount = 0
    render(
      <ScannerHost>
        <ProductFormHost />
      </ScannerHost>,
    )
    const form = document.querySelector('form')!
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      submitCount += 1
    })

    await user.click(input('Nombre'))
    await scanCode(user)

    await waitFor(() =>
      expect(input('Código de barras').value).toBe(BARCODE),
    )
    expect(submitCount).toBe(0)
    expect(document.querySelector('button[type="submit"]')).toBeTruthy()
  })

  it('Test 4: contexto sales → producto agregado y ningún input recibe las teclas', async () => {
    const user = userEvent.setup()
    const registrados: string[] = []
    render(
      <ScannerHost>
        <SalesHost onScan={(code) => registrados.push(code)} />
      </ScannerHost>,
    )

    await user.click(input('buscador'))
    await scanCode(user)

    await waitFor(() => expect(registrados).toEqual([BARCODE]))
    expect(input('buscador').value).toBe('')
  })

  it('Test 5: tecleo humano manual de 779123 aparece normalmente en el input', async () => {
    const user = userEvent.setup()
    const onScan = vi.fn()
    render(
      <ScannerHost>
        <ProductFormHost onScan={onScan} />
      </ScannerHost>,
    )

    await user.click(input('Nombre'))
    // userEvent.keyboard() no respeta delay por tecla: escribimos carácter a
    // carácter con una pausa humana (60ms) entre teclas.
    for (const ch of '779123') {
      await user.keyboard(ch)
      await new Promise((resolve) => setTimeout(resolve, 60))
    }

    await waitFor(() => expect(input('Nombre').value).toBe('779123'))
    expect(input('Código de barras').value).toBe('')
    expect(onScan).not.toHaveBeenCalled()
  })

  it('Caso 6: una sola tecla humana "7" se entrega al input con foco (buffer especulativo)', async () => {
    const user = userEvent.setup()
    const onScan = vi.fn()
    render(
      <ScannerHost>
        <ProductFormHost onScan={onScan} />
      </ScannerHost>,
    )

    await user.click(input('Nombre'))
    // Una tecla aislada no tiene seguimiento: tras la ventana especulativa
    // (30ms) el carácter debe liberarse como tecleo normal.
    await user.keyboard('7')

    await waitFor(() => expect(input('Nombre').value).toBe('7'))
    expect(input('Código de barras').value).toBe('')
    expect(onScan).not.toHaveBeenCalled()
  })

  it('Caso 7 (arranque lento): un gap inicial > ventana NO deja el primer dígito en el input', async () => {
    const user = userEvent.setup()
    const onScan = vi.fn()
    render(
      <ScannerHost>
        <ProductFormHost onScan={onScan} />
      </ScannerHost>,
    )

    await user.click(input('Código de barras'))
    // La lectora emite el 1er carácter y tarda más en arrancar la ráfaga.
    await scanKey(BARCODE[0], 45)
    for (const ch of BARCODE.slice(1)) {
      await scanKey(ch, 8)
    }
    await user.keyboard('{Enter}')

    await waitFor(() =>
      expect(input('Código de barras').value).toBe(BARCODE),
    )
    expect(onScan).toHaveBeenCalledTimes(1)
    expect(onScan).toHaveBeenCalledWith(BARCODE)
  })

  it('Test 8: montar/desmontar con StrictMode produce UNA emisión por escaneo', async () => {
    const user = userEvent.setup()
    const onScan = vi.fn()

    const first = render(
      <StrictMode>
        <ScannerHost>
          <SalesHost onScan={onScan} />
        </ScannerHost>
      </StrictMode>,
    )

    await user.click(input('buscador'))
    await scanCode(user)
    await waitFor(() => expect(onScan).toHaveBeenCalledTimes(1))

    first.unmount()

    render(
      <StrictMode>
        <ScannerHost>
          <SalesHost onScan={onScan} />
        </ScannerHost>
      </StrictMode>,
    )

    await user.click(input('buscador'))
    await scanCode(user)
    await waitFor(() => expect(onScan).toHaveBeenCalledTimes(2))
  })

  it('navegación product-form → sales: el siguiente escaneo va al contexto nuevo', async () => {
    const user = userEvent.setup()
    const productNotFound = vi.fn()
    const salesFound = vi.fn()

    const first = render(
      <ScannerHost>
        <ProductFormHost onScan={productNotFound} />
      </ScannerHost>,
    )
    first.unmount()

    render(
      <ScannerHost>
        <SalesHost onScan={salesFound} />
      </ScannerHost>,
    )

    await user.click(input('buscador'))
    await scanCode(user)

    await waitFor(() => expect(salesFound).toHaveBeenCalledTimes(1))
    expect(salesFound).toHaveBeenCalledWith(BARCODE)
    expect(productNotFound).not.toHaveBeenCalled()
  })

  it('Test 9 (buscador): un segundo escaneo REEMPLAZA el código anterior del input', async () => {
    const user = userEvent.setup()
    const onScan = vi.fn()
    render(
      <ScannerHost>
        <InventorySearchHost onScan={onScan} />
      </ScannerHost>,
    )

    const buscador = screen.getByLabelText('Buscar producto') as HTMLInputElement

    // Primer escaneo: el código queda en el buscador.
    await user.click(buscador)
    await scanCode(user, BARCODE)
    await waitFor(() => expect(buscador.value).toBe(BARCODE))

    // Segundo escaneo: debe quedar SOLO el código nuevo (ni acumulado ni vacío).
    await scanCode(user, BARCODE_2)
    await waitFor(() => expect(buscador.value).toBe(BARCODE_2))
    expect(buscador.value).not.toContain(BARCODE)
    expect(onScan).toHaveBeenCalledTimes(2)
    expect(onScan).toHaveBeenNthCalledWith(1, BARCODE)
    expect(onScan).toHaveBeenNthCalledWith(2, BARCODE_2)
  })

  it('Test 10 (regresión arreglada): teclear una PALABRA actualiza la búsqueda EN VIVO sin esperar el silencio', async () => {
    const user = userEvent.setup()
    const onScan = vi.fn()
    render(
      <ScannerHost>
        <InventorySearchHost onScan={onScan} />
      </ScannerHost>,
    )
    const buscador = screen.getByLabelText('Buscar producto') as HTMLInputElement

    await user.click(buscador)

    // Tecleo humano rápido: cada carácter se entrega AL INSTANTE (entrega
    // especulativa), así el filtrado de la grilla ocurre en vivo.
    await user.keyboard('coca')
    await waitFor(() => expect(buscador.value).toBe('coca'))
    expect(onScan).not.toHaveBeenCalled()
  })
})