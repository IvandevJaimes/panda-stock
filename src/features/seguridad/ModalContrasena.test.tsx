import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ModalContrasena } from './ModalContrasena'

describe('ModalContrasena', () => {
  it('envía la contraseña al entrar', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    const onCancelar = vi.fn()
    render(
      <ModalContrasena
        titulo="Bloqueado"
        subtitulo="Ingresá"
        onSubmit={onSubmit}
        onCancelar={onCancelar}
      />,
    )

    await userEvent.type(screen.getByLabelText('Contraseña'), 'clave123')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(onSubmit).toHaveBeenCalledWith('clave123')
  })

  it('notifica el éxito cuando la contraseña es válida', async () => {
    const onSuccess = vi.fn()
    render(
      <ModalContrasena
        titulo="Bloqueado"
        subtitulo="Ingresá"
        onSubmit={vi.fn().mockResolvedValue(true)}
        onCancelar={vi.fn()}
        onSuccess={onSuccess}
      />,
    )

    await userEvent.type(screen.getByLabelText('Contraseña'), 'clave123')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('muestra error y limpia el input si la contraseña es incorrecta', async () => {
    const onSubmit = vi.fn().mockResolvedValue(false)
    render(
      <ModalContrasena
        titulo="Bloqueado"
        subtitulo="Ingresá"
        onSubmit={onSubmit}
        onCancelar={vi.fn()}
      />,
    )

    await userEvent.type(screen.getByLabelText('Contraseña'), 'mal')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Contraseña incorrecta')).toBeTruthy()
    expect((screen.getByLabelText('Contraseña') as HTMLInputElement).value).toBe('')
  })

  it('notifica al cancelar para volver al POS', async () => {
    const onCancelar = vi.fn()
    render(
      <ModalContrasena
        titulo="Bloqueado"
        subtitulo="Ingresá"
        onSubmit={vi.fn()}
        onCancelar={onCancelar}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Volver al POS' }))

    expect(onCancelar).toHaveBeenCalledTimes(1)
  })
})
