import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { getRecoveryId, resetearConClave } = vi.hoisted(() => ({
  getRecoveryId: vi.fn(),
  resetearConClave: vi.fn(),
}))

vi.mock('../../services/seguridad.service', () => ({
  seguridadService: { getRecoveryId, resetearConClave },
}))

import { ModalRecuperarContrasena } from './ModalRecuperarContrasena'

describe('ModalRecuperarContrasena', () => {
  it('solicita una clave asociada a la instalación y permite cambiar la contraseña', async () => {
    getRecoveryId.mockResolvedValue('id-de-instalacion')
    resetearConClave.mockResolvedValue(true)
    const onSuccess = vi.fn()

    render(<ModalRecuperarContrasena onCancel={vi.fn()} onSuccess={onSuccess} />)

    expect(await screen.findByText('id-de-instalacion')).toBeTruthy()
    await userEvent.type(screen.getByLabelText('Clave de recuperación de soporte'), 'firma-de-soporte')
    await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'nueva123')
    await userEvent.type(screen.getByLabelText('Repetir nueva contraseña'), 'nueva123')
    await userEvent.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))

    await waitFor(() => expect(resetearConClave).toHaveBeenCalledWith('firma-de-soporte', 'nueva123'))
    expect(onSuccess).toHaveBeenCalledWith('nueva123')
  })
})
