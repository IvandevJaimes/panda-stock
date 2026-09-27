import { useRef, useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAtajosPOS } from './useAtajosPOS'
import { SIN_LINEA } from './posAtajos'
import type { LineaTicket } from './posQuery'

function linea(id: number, cantidad = 1): LineaTicket {
  return {
    productoId: id,
    cantidad,
    nombre: `Producto ${id}`,
    precioUnitario: 100,
    tipoTarifa: 'minorista',
    importeMinorista: 100 * cantidad,
    ahorro: 0,
    importe: 100 * cantidad,
  } as unknown as LineaTicket
}

const LINEAS = [linea(1), linea(2, 3), linea(3)]

const spies = {
  aumentarUno: vi.fn(),
  restarUno: vi.fn(),
  quitarLinea: vi.fn(),
  vaciar: vi.fn(),
  cobrar: vi.fn(),
  nuevoTicket: vi.fn(),
  cambiarTicket: vi.fn(),
  irAlTicket: vi.fn(),
  abrirMarcas: vi.fn(),
  cambiarMetodoPago: vi.fn(),
  salirDeBusqueda: vi.fn(),
  sinEfecto: vi.fn(),
}

function Banco() {
  const [lineas] = useState(LINEAS)
  const busquedaRef = useRef<HTMLInputElement>(null)

  const { refLista, lineaSeleccionada, ayudaAbierta, alternarAyuda } = useAtajosPOS({
    lineas,
    busquedaRef,
    onAumentarUno: spies.aumentarUno,
    onRestarUno: spies.restarUno,
    onQuitarLinea: spies.quitarLinea,
    onSolicitarVaciar: spies.vaciar,
    onCobrar: spies.cobrar,
    onNuevoTicket: spies.nuevoTicket,
    onCambiarTicket: spies.cambiarTicket,
    onIrAlTicket: spies.irAlTicket,
    onAbrirMarcas: spies.abrirMarcas,
    onCambiarMetodoPago: spies.cambiarMetodoPago,
    onSalirDeBusqueda: spies.salirDeBusqueda,
    onSinEfecto: spies.sinEfecto,
  })

  return (
    <div>
      <input aria-label="Buscar producto" ref={busquedaRef} />
      <div ref={refLista}>
        {lineas.map((item, indice) => (
          <div
            key={item.productoId}
            data-linea-ticket=""
            aria-current={indice === lineaSeleccionada ? 'true' : undefined}
          >
            {item.nombre}
          </div>
        ))}
      </div>
      <span data-testid="cursor">{lineaSeleccionada}</span>
      {ayudaAbierta && (
        <div role="dialog" aria-label="Ayuda">
          ayuda
        </div>
      )}
      <button type="button" onClick={alternarAyuda}>
        abrir ayuda
      </button>
    </div>
  )
}

function cursorActual() {
  return screen.getByTestId('cursor').textContent
}

describe('useAtajosPOS', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    for (const spy of Object.values(spies)) spy.mockClear()
    render(<Banco />)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('cobra con doble Enter', () => {
    it('el primer Enter arma y el segundo cobra', () => {
      fireEvent.keyDown(document.body, { key: 'Enter' })

      expect(spies.cobrar).not.toHaveBeenCalled()

      fireEvent.keyDown(document.body, { key: 'Enter' })

      expect(spies.cobrar).toHaveBeenCalledTimes(1)
    })

    it('fuera de la ventana el segundo Enter vuelve a armar', () => {
      fireEvent.keyDown(document.body, { key: 'Enter' })
      vi.advanceTimersByTime(600)
      fireEvent.keyDown(document.body, { key: 'Enter' })

      expect(spies.cobrar).not.toHaveBeenCalled()
    })

    it('con tres Enters seguidos cobra una vez sola', () => {
      fireEvent.keyDown(document.body, { key: 'Enter' })
      fireEvent.keyDown(document.body, { key: 'Enter' })
      fireEvent.keyDown(document.body, { key: 'Enter' })

      expect(spies.cobrar).toHaveBeenCalledTimes(1)
    })
  })

  describe('navegación entre las líneas del ticket', () => {
    it('arranca sin selección y la primera flecha toma la primera línea', () => {
      expect(cursorActual()).toBe(String(SIN_LINEA))

      fireEvent.keyDown(document.body, { key: 'ArrowDown' })
      expect(cursorActual()).toBe('0')
    })

    it('arriba y abajo recorren las líneas de a una', () => {
      fireEvent.keyDown(document.body, { key: 'ArrowDown' })
      fireEvent.keyDown(document.body, { key: 'ArrowDown' })

      expect(cursorActual()).toBe('1')

      fireEvent.keyDown(document.body, { key: 'ArrowUp' })
      expect(cursorActual()).toBe('0')
    })

    it('izquierda y derecha no tocan la línea, cambian de ticket', () => {
      fireEvent.keyDown(document.body, { key: 'ArrowDown' })

      fireEvent.keyDown(document.body, { key: 'ArrowLeft' })
      fireEvent.keyDown(document.body, { key: 'ArrowRight' })

      expect(spies.cambiarTicket).toHaveBeenNthCalledWith(1, -1)
      expect(spies.cambiarTicket).toHaveBeenNthCalledWith(2, 1)
      expect(cursorActual()).toBe('0')
    })

    it('End y Home van a los extremos', () => {
      fireEvent.keyDown(document.body, { key: 'End' })
      expect(cursorActual()).toBe('2')

      fireEvent.keyDown(document.body, { key: 'Home' })
      expect(cursorActual()).toBe('0')
    })

    it('marca la línea activa con aria-current', () => {
      fireEvent.keyDown(document.body, { key: 'ArrowDown' })

      expect(screen.getByText('Producto 1').getAttribute('aria-current')).toBe('true')
      expect(screen.getByText('Producto 2').getAttribute('aria-current')).toBeNull()
    })
  })

  describe('cantidades y cobro de línea', () => {

    beforeEach(() => {
      fireEvent.keyDown(document.body, { key: 'ArrowDown' })
    })

    it('+ suma una unidad a la línea', () => {
      fireEvent.keyDown(document.body, { key: '+' })

      expect(spies.aumentarUno).toHaveBeenCalledTimes(1)
      expect(spies.aumentarUno.mock.calls[0][0].productoId).toBe(1)
    })

    it('+ del numpad también', () => {
      fireEvent.keyDown(document.body, { key: '+', code: 'NumpadAdd' })
      expect(spies.aumentarUno).toHaveBeenCalledTimes(1)
    })

    it('- resta una unidad y Delete quita la línea', () => {
      fireEvent.keyDown(document.body, { key: '-' })
      fireEvent.keyDown(document.body, { key: 'Delete' })

      expect(spies.restarUno).toHaveBeenCalledTimes(1)
      expect(spies.quitarLinea).toHaveBeenCalledTimes(1)
      expect(spies.quitarLinea.mock.calls[0][0].productoId).toBe(1)
    })

    it('sin navegar antes opera sobre la primera línea', () => {
      spies.aumentarUno.mockClear()

      fireEvent.keyDown(document.body, { key: '+' })

      expect(spies.aumentarUno).toHaveBeenCalledTimes(1)
      expect(spies.aumentarUno.mock.calls[0][0].productoId).toBe(1)
    })
  })

  describe('atasjos globales', () => {
    it('F4 rota el método de pago', () => {
      fireEvent.keyDown(document.body, { key: 'F4' })
      expect(spies.cambiarMetodoPago).toHaveBeenCalledTimes(1)
    })

    it('F4 también rota con el foco en el buscador', () => {
      const input = screen.getByLabelText('Buscar producto')
      input.focus()

      fireEvent.keyDown(input, { key: 'F4' })
      expect(spies.cambiarMetodoPago).toHaveBeenCalledTimes(1)
    })

    it('Ctrl+D pide vaciar, Ctrl+N abre ticket y Ctrl+M abre marcas', () => {
      fireEvent.keyDown(document.body, { key: 'd', ctrlKey: true })
      fireEvent.keyDown(document.body, { key: 'n', ctrlKey: true })
      fireEvent.keyDown(document.body, { key: 'm', ctrlKey: true })

      expect(spies.vaciar).toHaveBeenCalledTimes(1)
      expect(spies.nuevoTicket).toHaveBeenCalledTimes(1)
      expect(spies.abrirMarcas).toHaveBeenCalledTimes(1)
    })

    it('funcionan con el foco en un botón', () => {
      const boton = screen.getByText('abrir ayuda')
      boton.focus()

      fireEvent.keyDown(boton, { key: 'd', ctrlKey: true })
      expect(spies.vaciar).toHaveBeenCalledTimes(1)
    })

    it('Alt+digit salta al ticket número', () => {
      fireEvent.keyDown(document.body, { key: '3', code: 'Digit3', altKey: true })
      expect(spies.irAlTicket).toHaveBeenCalledWith(3)
    })
  })

  describe('el buscador se queda con sus teclas', () => {
    it('F2 lo enfoca', () => {
      const input = screen.getByLabelText('Buscar producto')

      fireEvent.keyDown(document.body, { key: 'F2' })
      expect(document.activeElement).toBe(input)
    })

    it('con foco en el input, las flechas no mueven la selección', () => {
      const input = screen.getByLabelText('Buscar producto')
      input.focus()

      fireEvent.keyDown(input, { key: 'ArrowDown' })

      expect(cursorActual()).toBe(String(SIN_LINEA))
    })

    it('con foco en el input, + se teclea y no suma', () => {
      const input = screen.getByLabelText('Buscar producto')
      input.focus()

      fireEvent.keyDown(input, { key: '+' })

      expect(spies.aumentarUno).not.toHaveBeenCalled()
    })

    it('Escape sale del buscador y lo limpia', () => {
      const input = screen.getByLabelText('Buscar producto')
      input.focus()

      fireEvent.keyDown(input, { key: 'Escape' })
      expect(spies.salirDeBusqueda).toHaveBeenCalledTimes(1)
      expect(document.activeElement).not.toBe(input)
    })
  })

  describe('el foco no bloquea los atajos del ticket', () => {
    it('las flechas mueven la línea aunque haya un botón enfocado', () => {
      const boton = screen.getByText('abrir ayuda')
      boton.focus()

      fireEvent.keyDown(boton, { key: 'ArrowDown' })

      expect(cursorActual()).toBe('0')
    })

    it('+ y Delete también funcionan con un botón enfocado', () => {
      const boton = screen.getByText('abrir ayuda')
      boton.focus()

      fireEvent.keyDown(boton, { key: '+' })
      fireEvent.keyDown(boton, { key: 'Delete' })

      expect(spies.aumentarUno).toHaveBeenCalledTimes(1)
      expect(spies.quitarLinea).toHaveBeenCalledTimes(1)
    })

    it('Enter sí lo deja al botón enfocado, que es su activación nativa', () => {
      const boton = screen.getByText('abrir ayuda')
      boton.focus()

      fireEvent.keyDown(boton, { key: 'Enter' })

      expect(spies.cobrar).not.toHaveBeenCalled()
    })

    it('un modal abierto se queda con todo, modificadores incluidos', () => {
      fireEvent.click(screen.getByText('abrir ayuda'))
      const dialogo = screen.getByRole('dialog')

      fireEvent.keyDown(dialogo, { key: 'd', ctrlKey: true })
      fireEvent.keyDown(dialogo, { key: 'Enter' })
      fireEvent.keyDown(dialogo, { key: 'ArrowDown' })

      expect(spies.vaciar).not.toHaveBeenCalled()
      expect(spies.cobrar).not.toHaveBeenCalled()
      expect(spies.aumentarUno).not.toHaveBeenCalled()
    })
  })
})
