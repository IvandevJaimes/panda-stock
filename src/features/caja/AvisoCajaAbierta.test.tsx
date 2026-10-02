import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AvisoCajaAbierta } from './AvisoCajaAbierta'
import { useCajaStore } from '../../stores/caja.store'

let pedirCierre: (() => void) | undefined

const salir = vi.fn()

/** El aviso se abre desde un evento del main, no desde un click de React. */
function pedirCierreDeLaApp() {
  act(() => pedirCierre?.())
}

beforeEach(() => {
  salir.mockReset()
  pedirCierre = undefined
  useCajaStore.setState({ caja: null, cargado: true, salidaPendiente: false })
  window.electronAPI = {
    app: {
      onPedirCierre: (cb: () => void) => {
        pedirCierre = cb
      },
      salir,
    },
  } as unknown as Window['electronAPI']
})

describe('AvisoCajaAbierta', () => {
  it('aparece solo cuando el main intercepta el cierre', () => {
    render(<AvisoCajaAbierta />)

    expect(screen.queryByText('La caja está abierta')).toBeNull()

    pedirCierreDeLaApp()

    expect(screen.getByText('La caja está abierta')).toBeTruthy()
  })

  it('confirma la salida y pide el cierre de caja', async () => {
    const user = userEvent.setup()
    render(<AvisoCajaAbierta />)

    pedirCierreDeLaApp()
    await user.click(screen.getByRole('button', { name: /cerrar caja y salir/i }))

    // El estado lo lee el `CerrarCajaModal` del header, que es quien hace el
    // arqueo. El aviso no cierra nada por su cuenta.
    expect(useCajaStore.getState().salidaPendiente).toBe(true)
    expect(salir).not.toHaveBeenCalled()
  })

  it('cancelar deja el programa como estaba', async () => {
    const user = userEvent.setup()
    render(<AvisoCajaAbierta />)

    pedirCierreDeLaApp()
    await user.click(screen.getByRole('button', { name: /seguir en el programa/i }))

    expect(screen.queryByText('La caja está abierta')).toBeNull()
    expect(useCajaStore.getState().salidaPendiente).toBe(false)
    expect(salir).not.toHaveBeenCalled()
  })
})
