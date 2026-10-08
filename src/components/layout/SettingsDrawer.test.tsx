import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsDrawer } from './SettingsDrawer'
import { useSettingsStore } from '../../stores/settings.store'
import { useUIStore } from '../../stores/ui.store'

const { tieneContrasena } = vi.hoisted(() => ({
  tieneContrasena: vi.fn(),
}))

vi.mock('../../services/seguridad.service', () => ({
  seguridadService: {
    tieneContrasena,
    changePin: vi.fn(),
    crearContrasena: vi.fn(),
    verifyPin: vi.fn(),
  },
}))

beforeEach(() => {
  tieneContrasena.mockReset().mockResolvedValue(false)
  useSettingsStore.setState({ pedidoContrasenaHabilitado: false })
  useUIStore.setState({ isRightSidebarOpen: true })
})

describe('seguridad en Configuración', () => {
  it('oculta crear contraseña hasta activar el switch', async () => {
    const user = userEvent.setup()
    render(<SettingsDrawer />)
    const seguridad = screen.getByText('Pedir contraseña').closest('section')!

    expect(within(seguridad).queryByRole('button', { name: 'Crear contraseña' })).toBeNull()

    await user.click(within(seguridad).getByRole('switch'))

    expect(await within(seguridad).findByRole('button', { name: 'Crear contraseña' })).toBeTruthy()
  })

  it('oculta cambiar contraseña cuando el pedido está desactivado', async () => {
    tieneContrasena.mockResolvedValue(true)
    render(<SettingsDrawer />)

    const seguridad = screen.getByText('Pedir contraseña').closest('section')!
    await vi.waitFor(() => expect(tieneContrasena).toHaveBeenCalled())

    expect(within(seguridad).queryByRole('button', { name: 'Cambiar contraseña' })).toBeNull()
    expect(within(seguridad).queryByRole('button', { name: 'Crear contraseña' })).toBeNull()
  })
})
