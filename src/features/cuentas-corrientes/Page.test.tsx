import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClienteConSaldo, MovimientoCuentaCorriente } from '../../../electron/db/types'
import { CuentasCorrientesPage } from './Page'
import { useCajaStore } from '../../stores/caja.store'
import { useSettingsStore } from '../../stores/settings.store'

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

function movimientoDeuda(): MovimientoCuentaCorriente {
  return {
    id: 44,
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
    items: [{
      id: 10,
      ventaId: 77,
      productoId: 9,
      loteId: null,
      tipoTarifa: 'minorista',
      descripcionItem: 'Base de maquillaje',
      cantidad: 2,
      precioUnitario: 150,
      costoUnitario: 80,
      subtotal: 300,
      imgPath: null,
    }],
  }
}

const getClientes = vi.fn()
const getResumen = vi.fn()
const getMovimientos = vi.fn()
const eliminarCliente = vi.fn()
const toggleCliente = vi.fn()
const registrarAbono = vi.fn()
const resultado = <T,>(value: T) => ({ ok: true as const, value })

beforeEach(() => {
  useSettingsStore.setState({ ventasPorCajas: false })
  useCajaStore.setState({ caja: null, cargado: true })
  getClientes.mockResolvedValue(resultado([cliente()]))
  getResumen.mockResolvedValue(resultado({
    totalPorCobrar: 600,
    clientesConDeuda: 1,
    clientesActivos: 1,
    totalCargos: 1000,
    totalAbonos: 400,
  }))
  eliminarCliente.mockResolvedValue(resultado(undefined))
  toggleCliente.mockResolvedValue(resultado({ ...cliente(), activo: false }))
  registrarAbono.mockResolvedValue(resultado(undefined))
  getMovimientos.mockResolvedValue(resultado([]))
  window.electronAPI = {
    cuentasCorrientes: {
      getClientes,
      getResumen,
      getMovimientos,
      eliminarCliente,
      toggleCliente,
      registrarAbono,
    },
    cajas: {
      getUltimosResponsables: vi.fn().mockResolvedValue([]),
      getUltima: vi.fn().mockResolvedValue(null),
    },
  } as unknown as Window['electronAPI']
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function cardCliente(nombre = 'Ana Gómez') {
  return within(screen.getByRole('article', { name: `Cliente ${nombre}` }))
}

async function renderPagina() {
  render(<CuentasCorrientesPage />)
  await screen.findAllByText('Ana Gómez')
}

describe('CuentasCorrientesPage', () => {
  it('muestra el total por cobrar y los clientes', async () => {
    await renderPagina()

    expect(cardCliente().getByText('Ana Gómez')).toBeTruthy()
    expect(cardCliente().getByText('$600.00')).toBeTruthy()
  })

  it('abre el detalle con movimientos y acciones en el footer', async () => {
    await renderPagina()

    await userEvent.click(cardCliente().getByText('Ana Gómez'))

    expect(await screen.findByText('Detalle del cliente')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Info general' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Deudas' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Movimientos' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Editar' })).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Eliminar' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeTruthy()
    expect(getMovimientos).toHaveBeenCalledWith({ clienteId: 1 })

    await userEvent.click(screen.getByRole('button', { name: 'Deudas' }))
    expect(screen.getByText('Sin deudas registradas')).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Movimientos' }))
    expect(screen.getByText('Sin movimientos registrados')).toBeTruthy()
  })

  it('permite cobrar la deuda más reciente desde info general', async () => {
    getMovimientos.mockResolvedValue(resultado([movimientoDeuda()]))
    await renderPagina()

    await userEvent.click(cardCliente().getByText('Ana Gómez'))

    const botonCobrar = await screen.findByRole('button', { name: 'Cobrar deuda' })
    expect(screen.getByText('Deuda más reciente')).toBeTruthy()
    expect(screen.getByText('Venta #77')).toBeTruthy()
    await userEvent.click(botonCobrar)

    expect(await screen.findByRole('heading', { name: 'Cobrar deuda' })).toBeTruthy()
    expect((screen.getByLabelText('Monto') as HTMLInputElement).value).toBe('300')
  })

  it('abre el menú contextual al hacer click derecho en la card', async () => {
    await renderPagina()

    fireEvent.contextMenu(screen.getByRole('article', { name: 'Cliente Ana Gómez' }), {
      clientX: 120,
      clientY: 140,
    })

    expect(await screen.findByRole('menu')).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Desactivar cliente' })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Editar cliente' })).toBeTruthy()
  })

  it('muestra el switch de estado en el detalle y en el modal de edición', async () => {
    await renderPagina()
    await userEvent.click(cardCliente().getByText('Ana Gómez'))

    expect(await screen.findByRole('switch', { name: 'Desactivar cliente Ana Gómez' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }))

    expect(await screen.findByRole('heading', { name: 'Editar cliente' })).toBeTruthy()
    expect(screen.getByRole('switch', { name: 'Desactivar cliente Ana Gómez' })).toBeTruthy()
  })

  it('muestra productos, importe y fecha con hora de una deuda de venta', async () => {
    getMovimientos.mockResolvedValue(resultado([movimientoDeuda()]))
    await renderPagina()

    await userEvent.click(cardCliente().getByText('Ana Gómez'))
    await userEvent.click(screen.getByRole('button', { name: 'Deudas' }))

    expect(screen.getByText('Base de maquillaje')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Base de maquillaje' })).toBeTruthy()
    expect(screen.getByText('2 × $150.00')).toBeTruthy()
    const fila = screen.getByText('Venta #77').closest('li')
    expect(fila?.textContent).toContain('Deuda original$300.00')
    expect(fila?.textContent).toContain('Restante a abonar$300.00')
    expect(fila?.textContent).toMatch(/\d{1,2}\/\d{1,2}\/\d{2},?\s+\d{1,2}:\d{2}/)

    await userEvent.click(screen.getByRole('button', { name: 'Movimientos' }))
    expect(screen.getByText('Venta #77')).toBeTruthy()
    expect(screen.queryByText('Base de maquillaje')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Deudas' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cobrar deuda' }))
    expect(await screen.findByRole('heading', { name: 'Cobrar deuda' })).toBeTruthy()
    expect((screen.getByLabelText('Monto') as HTMLInputElement).value).toBe('300')
    expect(screen.getAllByText('Deuda original').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Restante a abonar').length).toBeGreaterThan(0)
    expect(screen.queryByText('Última deuda')).toBeNull()
    expect(screen.getByText('Base de maquillaje')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Ver otras deudas' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(await screen.findByText('Detalle del cliente')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Deudas' })).toBeTruthy()
    expect(screen.getByText('Venta #77')).toBeTruthy()
  })

  it('oculta deudas de ventas anuladas y conserva su auditoría en movimientos', async () => {
    getMovimientos.mockResolvedValue(resultado([{
      ...movimientoDeuda(),
      ventaAnulada: true,
    }]))
    await renderPagina()

    await userEvent.click(cardCliente().getByText('Ana Gómez'))
    await userEvent.click(screen.getByRole('button', { name: 'Deudas' }))

    expect(screen.getByText('Sin deudas registradas')).toBeTruthy()
    expect(screen.queryByText('Venta #77')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Movimientos' }))
    expect(screen.getByText('Venta #77')).toBeTruthy()
  })

  it('muestra un reintegro como dinero devuelto y no como deuda', async () => {
    getMovimientos.mockResolvedValue(resultado([{
      ...movimientoDeuda(),
      id: 45,
      tipo: 'reintegro',
      monto: 40,
      metodo: 'transferencia',
      ventaAnulada: true,
    }]))
    await renderPagina()

    await userEvent.click(cardCliente().getByText('Ana Gómez'))
    await userEvent.click(screen.getByRole('button', { name: 'Movimientos' }))

    expect(screen.getByText('Reintegro de devolución')).toBeTruthy()
    expect(screen.getByText('Devuelto $40.00')).toBeTruthy()
    expect(screen.queryByText('Debe $40.00')).toBeNull()
  })

  it('filtra por nombre sin volver a pegarle a la base', async () => {
    await renderPagina()
    getClientes.mockClear()

    await userEvent.type(screen.getByRole('textbox', { name: 'Buscar cliente' }), 'bruno')

    expect(screen.getByText('No encontramos clientes')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /cobrar/i })).toBeNull()
    expect(getClientes).not.toHaveBeenCalled()
  })

  it('busca también por teléfono', async () => {
    await renderPagina()

    await userEvent.type(screen.getByRole('textbox', { name: 'Buscar cliente' }), '5555')

    expect(cardCliente().getByText('Ana Gómez')).toBeTruthy()
  })

  it('no solicita ni muestra el historial en esta página', async () => {
    await renderPagina()

    expect(screen.queryByText('Historial')).toBeNull()
    expect(screen.queryByText('Venta #77')).toBeNull()
  })

  it('filtra los clientes por estado de deuda', async () => {
    getClientes.mockResolvedValue(resultado([
      cliente(),
      cliente({ id: 2, nombre: 'Bruno Pérez', saldo: 0, totalAbonos: 1000 }),
    ]))
    render(<CuentasCorrientesPage />)
    await screen.findByRole('article', { name: 'Cliente Ana Gómez' })

    await userEvent.click(screen.getByRole('button', { name: /todos \(2\)/i }))
    await userEvent.click(screen.getByRole('option', { name: /al día \(1\)/i }))

    expect(screen.getByRole('article', { name: 'Cliente Bruno Pérez' })).toBeTruthy()
    expect(screen.queryByRole('article', { name: 'Cliente Ana Gómez' })).toBeNull()
  })

  it('no muestra cobrar para un cliente al día', async () => {
    getClientes.mockResolvedValue(resultado([cliente({ saldo: 0, totalAbonos: 1000 })]))
    await renderPagina()

    expect(cardCliente().getByText('Al día')).toBeTruthy()

    expect(cardCliente().queryByRole('button', { name: /cobrar/i })).toBeNull()
  })

  it('solo ofrece eliminar clientes sin deuda', async () => {
    getClientes.mockResolvedValue(resultado([cliente({ saldo: 0, totalAbonos: 1000 })]))
    await renderPagina()

    await userEvent.click(cardCliente().getByRole('button', { name: 'Eliminar cliente Ana Gómez' }))
    await userEvent.click(screen.getByRole('button', { name: /^Eliminar cliente$/ }))

    expect(eliminarCliente).toHaveBeenCalledWith(1, undefined)
  })

  it('no ofrece eliminar clientes con deuda', async () => {
    await renderPagina()

    expect(cardCliente().queryByRole('button', { name: 'Eliminar cliente Ana Gómez' })).toBeNull()
    expect(cardCliente().queryByRole('button', { name: 'Más opciones para Ana Gómez' })).toBeNull()
    expect(cardCliente().getAllByRole('button', { name: 'Editar a Ana Gómez' })).toHaveLength(2)
  })

  it('avisa cuando no hay clientes', async () => {
    getClientes.mockResolvedValue(resultado([]))
    render(<CuentasCorrientesPage />)

    expect(await screen.findByText('Todavía no hay clientes')).toBeTruthy()
  })

  it('muestra los métodos habilitados del POS y el ticket de la última deuda al cobrar desde la tarjeta', async () => {
    getMovimientos.mockResolvedValue(resultado([movimientoDeuda()]))
    await renderPagina()

    await userEvent.click(cardCliente().getByRole('button', { name: 'Cobrar a Ana Gómez' }))

    expect(await screen.findByRole('heading', { name: 'Cobrar deuda' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Efectivo' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Transferencia' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Tarjeta' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'QR' })).toBeTruthy()
    expect(screen.getByText('Última deuda')).toBeTruthy()
    expect(screen.getByText('Base de maquillaje')).toBeTruthy()
    expect(screen.queryByText('Abrí una caja para confirmar el cobro en efectivo.')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Ver otras deudas' }))
    expect(await screen.findByText('Detalle del cliente')).toBeTruthy()
    expect(screen.getAllByText('Venta #77')).toHaveLength(1)
  })

  it('exige abrir la caja dentro del modal cuando el control por turno está activo', async () => {
    useSettingsStore.setState({ ventasPorCajas: true })
    getMovimientos.mockResolvedValue(resultado([movimientoDeuda()]))
    await renderPagina()

    await userEvent.click(cardCliente().getByRole('button', { name: 'Cobrar a Ana Gómez' }))

    expect(await screen.findByRole('alertdialog', { name: 'La caja está cerrada' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Abrir caja' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Cobrar deuda' })).toBeNull()
    expect(screen.queryByLabelText('Monto')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Abrir caja' }))
    expect(await screen.findByRole('heading', { name: 'Abrir caja' })).toBeTruthy()
  })

  it('permite cobrar en efectivo sin caja cuando el control por turno está desactivado', async () => {
    getMovimientos.mockResolvedValue(resultado([movimientoDeuda()]))
    await renderPagina()

    await userEvent.click(cardCliente().getByRole('button', { name: 'Cobrar a Ana Gómez' }))

    expect(await screen.findByRole('radio', { name: 'Efectivo' })).toBeTruthy()
    expect(screen.queryByRole('alertdialog', { name: 'La caja está cerrada' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Cobrar deuda' }))

    await waitFor(() => {
      expect(registrarAbono).toHaveBeenCalledWith(expect.objectContaining({ cajaId: null }))
    })
  })

  it.each([
    ['Transferencia', 'transferencia'],
    ['Tarjeta', 'debito'],
    ['QR', 'qr'],
  ] as const)('permite cobrar sin caja con %s cuando el control por turno está desactivado', async (etiqueta, metodo) => {
    getMovimientos.mockResolvedValue(resultado([movimientoDeuda()]))
    await renderPagina()

    await userEvent.click(cardCliente().getByRole('button', { name: 'Cobrar a Ana Gómez' }))
    await userEvent.click(await screen.findByRole('radio', { name: etiqueta }))
    await userEvent.click(screen.getByRole('button', { name: 'Cobrar deuda' }))

    await waitFor(() => {
      expect(registrarAbono).toHaveBeenCalledWith(expect.objectContaining({ metodo, cajaId: null }))
    })
  })

  it('descuenta pagos parciales del ticket, lo conserva hasta saldarlo y refresca el detalle', async () => {
    let pendiente = 300
    let saldo = 600
    getClientes.mockImplementation(async () => resultado([cliente({ saldo, totalAbonos: 1000 - saldo })]))
    getResumen.mockImplementation(async () => resultado({
      totalPorCobrar: saldo,
      clientesConDeuda: saldo > 0 ? 1 : 0,
      clientesActivos: 1,
      totalCargos: 1000,
      totalAbonos: 1000 - saldo,
    }))
    getMovimientos.mockImplementation(async () => resultado([{
      ...movimientoDeuda(),
      saldoPendiente: pendiente,
    }]))
    registrarAbono.mockImplementation(async ({ monto }: { monto: number }) => {
      pendiente -= monto
      saldo -= monto
      return resultado(undefined)
    })
    await renderPagina()

    await userEvent.click(cardCliente().getByText('Ana Gómez'))
    await userEvent.click(screen.getByRole('button', { name: 'Deudas' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cobrar deuda' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Transferencia' }))
    await userEvent.clear(screen.getByLabelText('Monto'))
    await userEvent.type(screen.getByLabelText('Monto'), '100')
    await userEvent.click(screen.getByRole('button', { name: 'Cobrar deuda' }))

    const resumenDeuda = await screen.findAllByText('Deuda original').then((elementos) => elementos[0])
    const filaActualizada = resumenDeuda.closest('li')
    expect(filaActualizada?.textContent).toContain('Restante a abonar$200.00')
    expect(cardCliente().getByText('$500.00')).toBeTruthy()
    expect(registrarAbono).toHaveBeenLastCalledWith(expect.objectContaining({ ventaId: 77, monto: 100 }))
    expect(getResumen).toHaveBeenCalledTimes(2)

    await userEvent.click(screen.getByRole('button', { name: 'Cobrar deuda' }))
    expect((screen.getByLabelText('Monto') as HTMLInputElement).value).toBe('200')
    await userEvent.click(screen.getByRole('radio', { name: 'Transferencia' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cobrar deuda' }))

    expect(await screen.findByText('Sin deudas registradas')).toBeTruthy()
    expect(registrarAbono).toHaveBeenLastCalledWith(expect.objectContaining({ ventaId: 77, monto: 200 }))
    expect(getResumen).toHaveBeenCalledTimes(3)
  })

  it('valida el monto en tiempo real con RHF y no activa la validación nativa', async () => {
    getMovimientos.mockResolvedValue(resultado([movimientoDeuda()]))
    await renderPagina()

    await userEvent.click(cardCliente().getByText('Ana Gómez'))
    await userEvent.click(screen.getByRole('button', { name: 'Deudas' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cobrar deuda' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Transferencia' }))
    const input = screen.getByLabelText('Monto')
    await userEvent.clear(input)
    await userEvent.type(input, '301')

    expect(await screen.findByText('El monto no puede superar $300.00.')).toBeTruthy()
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(registrarAbono).not.toHaveBeenCalled()
    expect(input.closest('form')?.hasAttribute('novalidate')).toBe(true)
  })
})
