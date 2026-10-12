import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ClienteModal } from './ClienteModal'

const { crearCliente } = vi.hoisted(() => ({ crearCliente: vi.fn() }))

vi.mock('../../services/cuentas-corrientes.service', () => ({
  cuentasCorrientesService: {
    crearCliente,
    actualizarCliente: vi.fn(),
  },
}))

beforeEach(() => {
  crearCliente.mockResolvedValue({ id: 1 })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ClienteModal', () => {
  it('capitaliza nombre y apellido y permite dejar el teléfono vacío', async () => {
    const user = userEvent.setup()
    render(<ClienteModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />)

    const nombre = screen.getByLabelText('Nombre y apellido') as HTMLInputElement
    await user.type(nombre, 'ana gómez')
    expect(nombre.value).toBe('Ana Gómez')

    await user.click(screen.getByRole('button', { name: 'Crear cliente' }))

    expect(crearCliente).toHaveBeenCalledWith({
      nombre: 'Ana Gómez',
      telefono: null,
      notas: null,
    })
  })

  it('acepta formatos nacionales e internacionales argentinos', async () => {
    const user = userEvent.setup()
    render(<ClienteModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />)

    await user.type(screen.getByLabelText('Nombre y apellido'), 'ana gómez')
    const telefono = screen.getByLabelText('Teléfono (opcional)') as HTMLInputElement
    await user.type(telefono, '+54 9 11 2345-6789')
    expect(telefono.value).toBe('5491123456789')
    await user.click(screen.getByRole('button', { name: 'Crear cliente' }))

    expect(crearCliente).toHaveBeenCalledWith({
      nombre: 'Ana Gómez',
      telefono: '5491123456789',
      notas: null,
    })
  })

  it('rechaza teléfonos que no cumplen la numeración argentina', async () => {
    const user = userEvent.setup()
    render(<ClienteModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />)

    await user.type(screen.getByLabelText('Nombre y apellido'), 'ana gómez')
    await user.type(screen.getByLabelText('Teléfono (opcional)'), '12345')
    await user.click(screen.getByRole('button', { name: 'Crear cliente' }))

    expect(await screen.findByText('Ingresá un número de teléfono válido')).toBeTruthy()
    expect(crearCliente).not.toHaveBeenCalled()
  })
})
