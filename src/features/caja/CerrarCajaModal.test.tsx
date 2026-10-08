import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CerrarCajaModal } from './CerrarCajaModal'
import { usePosTicketsStore } from '../../stores/pos-tickets.store'
import { useCajaStore } from '../../stores/caja.store'
import type { CajaConResponsable } from '../../../electron/db/types'

function caja(partial: Partial<CajaConResponsable> = {}): CajaConResponsable {
  return {
    id: 7,
    empleadoId: 3,
    empleadoNombre: 'Juan',
    montoInicial: 5000,
    montoEsperado: null,
    montoReal: null,
    diferencia: null,
    estado: 'abierta',
    fechaApertura: '2026-09-27T08:00:00.000Z',
    fechaCierre: null,
    observaciones: null,
    ...partial,
  }
}

const close = vi.fn()
const getSummary = vi.fn()

beforeEach(() => {
  close.mockReset()
  close.mockResolvedValue({ ...caja({ estado: 'cerrada', montoReal: 5400, diferencia: 400 }) })
  getSummary.mockReset()
  getSummary.mockResolvedValue({
    totalVentas: 540,
    cantidadVentas: 2,
    totalEfectivo: 400,
    totalEgresosEfectivo: 0,
    totalTransferencia: 0,
    totalTarjeta: 140,
    montoEsperado: 5400,
  })
  window.electronAPI = { cajas: { close, getSummary } } as unknown as Window['electronAPI']
})

/** Deja un ticket con productos y otro vacío, como después de armar dos ventas. */
function cargarTickets(conItems: boolean) {
  usePosTicketsStore.setState({
    tickets: [
      {
        id: 't1',
        numero: 1,
        metodoPago: 'efectivo',
        clienteId: null,
        clienteNombre: null,
        items: conItems
          ? [
              {
                productoId: 1,
                nombre: 'Gaseosa Cola',
                precioVenta: 200,
                costo: 100,
                cantidad: 2,
                imgPath: null,
              },
            ]
          : [],
      },
      {
        id: 't2',
        numero: 2,
        metodoPago: 'efectivo',
        clienteId: null,
        clienteNombre: null,
        items: [],
      },
    ],
    activeTicketId: 't1',
  })
}

async function renderModal(cajaActiva = caja()) {
  render(<CerrarCajaModal isOpen caja={cajaActiva} onClose={vi.fn()} />)
  return screen.findByLabelText(/efectivo contado/i)
}

describe('CerrarCajaModal', () => {
  it('deja cerrar y muestra la diferencia cuando no hay tickets cargados', async () => {
    const user = userEvent.setup()
    cargarTickets(false)
    const monto = await renderModal()

    await user.type(monto, '5400')

    // El esperado lo calcula el repositorio, no el modal: 5000 de fondo + 400
    // cobrados en efectivo.
    await waitFor(() => expect(screen.getByText('La caja cuadra exactamente')).toBeTruthy())

    await user.click(screen.getByRole('button', { name: /cerrar caja/i }))

    await waitFor(() => expect(close).toHaveBeenCalledTimes(1))
    expect(close).toHaveBeenCalledWith(expect.objectContaining({ cajaId: 7, montoReal: 5400 }))
  })

  it('explica cuánto falta cuando el efectivo no cuadra', async () => {
    const user = userEvent.setup()
    cargarTickets(false)
    const monto = await renderModal()

    await user.type(monto, '5350')

    await waitFor(() => expect(screen.getByText(/Diferencia: -\$50.00/)).toBeTruthy())
  })

  it('bloquea el cierre si hay tickets con productos cargados', async () => {
    cargarTickets(true)
    await renderModal()

    await waitFor(() => expect(screen.getByText(/1 ticket tiene productos cargados/)).toBeTruthy())

    const boton = screen.getByRole('button', { name: /cerrar caja/i })
    expect(boton.getAttribute('disabled')).not.toBeNull()
    expect(close).not.toHaveBeenCalled()
  })

  it('no se cuela por el Enter del formulario con tickets cargados', async () => {
    cargarTickets(true)
    const monto = await renderModal()

    expect(monto.hasAttribute('disabled')).toBe(true)

    // Aunque el input esté deshabilitado y no reciba foco, el guard del submit
    // tiene que seguir existiendo: es la única red si mañana el campo vuelve a
    // ser editable.
    const form = document.getElementById('form-cerrar-caja') as HTMLFormElement
    form.requestSubmit()

    await waitFor(() => expect(close).not.toHaveBeenCalled())
  })

  it('no bloquea por tickets vacíos', async () => {
    cargarTickets(false)
    await renderModal()

    expect(screen.queryByText(/productos cargados/)).toBeNull()
  })

  it('deja la caja sin sesión abierta al cerrar', async () => {
    const user = userEvent.setup()
    cargarTickets(false)
    useCajaStore.setState({ caja: caja(), cargado: true })
    const monto = await renderModal()

    await user.type(monto, '5400')
    await user.click(screen.getByRole('button', { name: /cerrar caja/i }))

    // Si el store quedara con la caja, el POS seguiría mostrando el botón Cobrar
    // habilitado y dejaría cobrar contra una caja que ya no existe.
    await waitFor(() => expect(useCajaStore.getState().caja).toBeNull())
  })
})
