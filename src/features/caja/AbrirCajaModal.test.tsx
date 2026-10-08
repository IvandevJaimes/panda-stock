import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AbrirCajaModal } from './AbrirCajaModal'

const mocks = vi.hoisted(() => ({ open: vi.fn() }))

vi.mock('../../services/cajas.service', () => ({
  cajasService: { open: mocks.open },
}))

describe('AbrirCajaModal', () => {
  beforeEach(() => {
    mocks.open.mockReset().mockResolvedValue({
      id: 5,
      empleadoId: 2,
      empleadoNombre: 'Juan Pérez',
      montoInicial: 250,
      montoEsperado: null,
      montoReal: null,
      diferencia: null,
      estado: 'abierta',
      fechaApertura: '2026-10-07T12:00:00.000Z',
      fechaCierre: null,
      observaciones: null,
    })
  })

  it('reemplaza el cero inicial al escribir y envía el monto correcto', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<AbrirCajaModal isOpen onClose={onClose} />)

    const monto = screen.getByLabelText('Monto inicial en la gaveta') as HTMLInputElement
    expect(monto.value).toBe('0')
    await user.type(monto, '250')
    expect(monto.value).toBe('250')

    await user.type(screen.getByLabelText('Responsable'), 'juan')
    await user.click(screen.getByRole('button', { name: 'Abrir caja' }))

    expect(mocks.open).toHaveBeenCalledWith({ responsable: 'Juan', montoInicial: 250 })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
