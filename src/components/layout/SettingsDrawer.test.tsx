import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SettingsDrawer } from './SettingsDrawer'
import { useSettingsStore } from '../../stores/settings.store'
import { useUIStore } from '../../stores/ui.store'
import packageInfo from '../../../package.json'

describe('panel lateral de configuración', () => {
  it('ofrece el acceso a configuración, soporte, versión y salida', () => {
    useSettingsStore.setState({ sonidoAlertas: true, calculadoraVueltoHabilitada: true })
    useUIStore.setState({ isRightSidebarOpen: true })

    render(<MemoryRouter><SettingsDrawer /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: 'Configuración' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Configuración avanzada' })).toBeTruthy()
    expect(screen.getByText(`Versión ${packageInfo.version}`)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Salir de la aplicación' })).toBeTruthy()
    expect(screen.getByText('Sonido de alertas')).toBeTruthy()
    expect(screen.queryByText('Descuento mayorista')).toBeNull()
  })
})
