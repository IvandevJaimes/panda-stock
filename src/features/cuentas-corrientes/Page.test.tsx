import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ClienteConSaldo,
  MovimientoCuentaCorriente,
} from '../../../electron/db/types'
import { CuentasCorrientesPage } from './Page'

function cliente(partial: Partial<ClienteConSaldo> = {}): ClienteConSaldo {
  return {
    id: 1,
    nombre: 'Ana Gómez',
    telefono: '11 5555',
    notas: null,
    activo: true,
    creadoEn: '2026-01-01T00:00:00.000Z',
    totalCargos: 1000,
    totalAbonos: 400,
    saldo: 600,
    cantidadMovimientos: 2,
    ultimoMovimiento: '2026-03-01T12:00:00.000Z',
    ...partial,
  }
}

function movimiento(
  partial: Partial<MovimientoCuentaCorriente> = {},
): MovimientoCuentaCorriente {
  return {
    id: 1,
    clienteId: 1,
    tipo: 'cargo',
    monto: 300,
    ventaId: 77,
    metodo: null,
    cajaId: null,
    nota: null,
    fechaHora: '2026-03-01T12:00:00.000Z',
    clienteNombre: 'Ana Gómez',
    ventaTotal: 300,
    ...partial,
  }
}

const getClientes = vi.fn()
const getResumen = vi.fn()
const getMovimientos = vi.fn()

beforeEach(() => {
  getClientes.mockResolvedValue([cliente()])
  getResumen.mockResolvedValue({
    totalPorCobrar: 600,
    clientesConDeuda: 1,
    clientesActivos: 1,
    totalCargos: 1000,
    totalAbonos: 400,
  })
  getMovimientos.mockResolvedValue([movimiento()])

  window.electronAPI = {
    cuentasCorrientes: {
      getClientes,
      getResumen,
      getMovimientos,
    },
  } as unknown as Window['electronAPI']
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

/*
  El nombre del cliente aparece en la tabla de clientes y también en la de
  movimientos mientras no haya ninguno seleccionado, así que `getByText` es
  ambiguo: las consultas van contra la tabla que corresponde.
*/
function tablaClientes() {
  return within(screen.getAllByRole('table')[0]!)
}

async function renderPagina() {
  render(<CuentasCorrientesPage />)
  await screen.findAllByText('Ana Gómez')
}

describe('CuentasCorrientesPage', () => {
  it('muestra el total por cobrar y los clientes', async () => {
    await renderPagina()

    expect(tablaClientes().getByText('Ana Gómez')).toBeTruthy()
    expect(tablaClientes().getByText('$600.00')).toBeTruthy()
  })

  it('filtra por nombre sin volver a pegarle a la base', async () => {
    await renderPagina()
    getClientes.mockClear()

    await userEvent.type(screen.getByPlaceholderText('Buscar por nombre o teléfono'), 'bruno')

    expect(screen.getByText('Ningún cliente coincide')).toBeTruthy()
    // El botón Cobrar solo vive en la tabla de clientes: si la fila se fue, se fue.
    expect(screen.queryByRole('button', { name: /cobrar/i })).toBeNull()
    expect(getClientes).not.toHaveBeenCalled()
  })

  it('busca también por teléfono', async () => {
    await renderPagina()

    await userEvent.type(screen.getByPlaceholderText('Buscar por nombre o teléfono'), '5555')

    expect(tablaClientes().getByText('Ana Gómez')).toBeTruthy()
  })

  it('el historial arranca mostrando todos los movimientos', async () => {
    await renderPagina()

    expect(getMovimientos).toHaveBeenCalledWith({ limit: 200 })
    expect(screen.getByText('Venta #77')).toBeTruthy()
  })

  it('al elegir un cliente pide solo su historial', async () => {
    await renderPagina()
    getMovimientos.mockClear()

    await userEvent.click(tablaClientes().getByText('Ana Gómez'))

    await waitFor(() => expect(getMovimientos).toHaveBeenCalledWith({ clienteId: 1, limit: 200 }))
  })

  it('un cliente al día no se puede cobrar y se marca como tal', async () => {
    getClientes.mockResolvedValue([cliente({ saldo: 0, totalAbonos: 1000 })])
    await renderPagina()

    expect(tablaClientes().getByText('Al día')).toBeTruthy()

    const cobrar = tablaClientes().getByRole('button', { name: /cobrar/i })
    expect((cobrar as HTMLButtonElement).disabled).toBe(true)
  })

  it('avisa cuando no hay clientes', async () => {
    getClientes.mockResolvedValue([])
    render(<CuentasCorrientesPage />)

    expect(await screen.findByText('Todavía no hay clientes')).toBeTruthy()
  })

  it('sin caja abierta el efectivo no se ofrece como método de abono', async () => {
    await renderPagina()

    await userEvent.click(tablaClientes().getByRole('button', { name: /cobrar/i }))

    expect((await screen.findAllByText('Registrar abono')).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /^Efectivo$/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Transferencia' })).toBeTruthy()
  })
})
