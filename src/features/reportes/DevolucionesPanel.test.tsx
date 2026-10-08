import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DevolucionesPanel } from './DevolucionesPanel'

const mocks = vi.hoisted(() => ({
  getVentas: vi.fn(),
  getVentaDetalle: vi.fn(),
  getHistorial: vi.fn(),
  process: vi.fn(),
}))

vi.mock('../../services/devoluciones.service', () => ({
  devolucionesService: mocks,
}))

const ticket = {
  venta: {
    id: 7,
    cajaId: 3,
    empleadoId: 1,
    subtotal: 100,
    descuento: 0,
    impuesto: 0,
    total: 100,
    estado: 'completada' as const,
    fechaHora: '2026-10-01T12:00:00.000Z',
  },
  clienteNombre: 'Cliente de prueba',
  metodos: ['efectivo' as const],
  unidades: 2,
}

const detalle = {
  venta: ticket.venta,
  clienteNombre: 'Cliente de prueba',
  pagos: [{
    id: 10,
    ventaId: 7,
    metodo: 'efectivo' as const,
    monto: 100,
    referencia: null,
    fechaHora: ticket.venta.fechaHora,
  }],
  items: [{
    id: 11,
    ventaId: 7,
    productoId: 5,
    loteId: 2,
    tipoTarifa: 'minorista' as const,
    descripcionItem: 'Artículo de prueba',
    cantidad: 2,
    precioUnitario: 50,
    costoUnitario: 30,
    subtotal: 100,
  }],
}

describe('DevolucionesPanel', () => {
  beforeEach(() => {
    mocks.getVentas.mockReset().mockResolvedValue({ items: [ticket], total: 1 })
    mocks.getVentaDetalle.mockReset().mockResolvedValue(detalle)
    mocks.getHistorial.mockReset().mockResolvedValue({ items: [], total: 0 })
    mocks.process.mockReset().mockResolvedValue({
      devolucionId: 4,
      ventaId: 7,
      total: 100,
      gananciaRevertida: 40,
    })
  })

  it('exige el ticket completo y PIN antes de confirmar', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    render(<DevolucionesPanel desde={null} hasta={null} onSuccess={onSuccess} />)

    expect(await screen.findByText('Cliente de prueba')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Devolver ticket' }))
    expect(await screen.findByText('Artículo de prueba')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Devolver ticket completo · $100.00' }))
    await user.type(screen.getByLabelText('Contraseña'), '1234')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(mocks.process).toHaveBeenCalledWith({
      pin: '1234',
      ventaId: 7,
    }))
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })
})
