import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CajaConResponsable, ProductoConLoteActivo } from '../../../electron/db/types'
import { PosPage } from './PosPage'
import { useCajaStore } from '../../stores/caja.store'

function producto(partial: Partial<ProductoConLoteActivo> = {}): ProductoConLoteActivo {
  return {
    id: 1,
    categoriaId: null,
    marcaId: null,
    nombre: 'Gaseosa Cola',
    codigoInterno: '111',
    codigosBarras: '779001',
    variante: null,
    tipoVenta: 'unidad',
    unidadMedida: 'unidad',
    costo: 100,
    porcentajeGanancia: 100,
    precioVenta: 200,
    stockActual: 10,
    stockMinimo: 5,
    vencimiento: null,
    imgPath: null,
    activo: true,
    creadoEn: '2026-01-10',
    actualizadoEn: null,
    loteActivoVencimiento: null,
    ...partial,
  }
}

function caja(partial: Partial<CajaConResponsable> = {}): CajaConResponsable {
  return {
    id: 7,
    empleadoId: 3,
    empleadoNombre: 'Juan',
    montoInicial: 5000,
    montoEsperado: null,
    montoReal: null,
    diferencia: null,
    estado: 'abierta',
    fechaApertura: '2026-09-27T08:00:00.000Z',
    fechaCierre: null,
    observaciones: null,
    ...partial,
  }
}

const process = vi.fn()

beforeEach(() => {
  process.mockReset()
  process.mockResolvedValue({ success: true, ventaId: 42 })
  window.electronAPI = {
    productos: { getAll: vi.fn().mockResolvedValue([producto()]) },
    categorias: { getAll: vi.fn().mockResolvedValue([]) },
    marcas: { getAll: vi.fn().mockResolvedValue([]) },
    ventas: { process },
  } as unknown as Window['electronAPI']
})

async function agregarUnProducto() {
  const user = userEvent.setup()
  render(<PosPage />)
  await user.click(await screen.findByRole('button', { name: /agregar gaseosa cola/i }))
  return user
}

describe('cobro de la venta real', () => {
  it('bloquea el cobro mientras no hay caja abierta', async () => {
    const user = await agregarUnProducto()

    const boton = screen.getByRole('button', { name: /cobrar/i })
    expect(boton.getAttribute('aria-disabled')).toBe('true')

    await user.click(boton)
    expect(process).not.toHaveBeenCalled()
  })

  it('envía la venta con la caja y el empleado de la caja abierta', async () => {
    useCajaStore.setState({ caja: caja(), cargado: true })
    const user = await agregarUnProducto()

    await user.click(screen.getByRole('button', { name: /cobrar/i }))

    await waitFor(() => expect(process).toHaveBeenCalledTimes(1))
    expect(process).toHaveBeenCalledWith({
      cajaId: 7,
      empleadoId: 3,
      subtotal: 200,
      descuento: 0,
      impuesto: 0,
      total: 200,
      items: [
        {
          productoId: 1,
          tipoTarifa: 'minorista',
          descripcionItem: 'Gaseosa Cola',
          cantidad: 1,
          precioUnitario: 200,
          costoUnitario: 100,
        },
      ],
      pagos: [{ metodo: 'efectivo', monto: 200 }],
    })
  })

  it('manda el precio mayorista ya aplicado, no el de lista', async () => {
    useCajaStore.setState({ caja: caja(), cargado: true })
    const user = await agregarUnProducto()

    const mas = screen.getByRole('button', { name: /agregar una unidad/i })
    await user.click(mas)
    await user.click(mas)
    await waitFor(() => expect(screen.getByText('3 ítems')).toBeTruthy())

    await user.click(screen.getByRole('button', { name: /cobrar/i }))

    await waitFor(() => expect(process).toHaveBeenCalledTimes(1))
    // 3 unidades de 200 con 10% de descuento: 180 la unidad, no 200. Si acá
    // llegara el precio de lista, el descuento viviría solo en la pantalla y la
    // base guardaría un importe que nunca coincide con lo que se cobró.
    expect(process.mock.calls[0][0].items[0].precioUnitario).toBe(180)
    expect(process.mock.calls[0][0].items[0].tipoTarifa).toBe('mayoreo')
    expect(process.mock.calls[0][0].total).toBe(540)
  })

  it('mapea el método "tarjeta" del POS al débito de la base', async () => {
    useCajaStore.setState({ caja: caja(), cargado: true })
    const user = await agregarUnProducto()

    // F4 rota el método de pago: efectivo → transferencia → tarjeta.
    const buscador = screen.getByLabelText('Buscar producto')
    await user.click(buscador)
    await user.keyboard('{F4}{F4}')
    await waitFor(() => expect(screen.getByText('Tarjeta')).toBeTruthy())

    await user.click(screen.getByRole('button', { name: /cobrar/i }))

    await waitFor(() => expect(process).toHaveBeenCalledTimes(1))
    expect(process.mock.calls[0][0].pagos[0].metodo).toBe('debito')
  })

  it('cierra el ticket y avisa el número de venta cuando la base acepta', async () => {
    useCajaStore.setState({ caja: caja(), cargado: true })
    const user = await agregarUnProducto()

    await user.click(screen.getByRole('button', { name: /cobrar/i }))

    // La venta se guarda y el ticket queda vacío para el siguiente cobro. Como
    // era el único, `cerrarTicket` renumera a 1 en vez de dejar un "Ticket 2"
    // huérfano.
    await waitFor(() => expect(screen.getByText('El ticket 1 está vacío')).toBeTruthy())
  })

  it('conserva el ticket si la base rechaza la venta', async () => {
    useCajaStore.setState({ caja: caja(), cargado: true })
    process.mockRejectedValue(new Error('Stock insuficiente de "Gaseosa Cola"'))

    const user = await agregarUnProducto()
    await user.click(screen.getByRole('button', { name: /cobrar/i }))

    // El ticket NO se pierde: si la base no guardó la venta, el cajero tiene que
    // poder reintentar sin volver a armarla.
    expect(screen.getByText('1 ítem')).toBeTruthy()
  })

  it('no cobra dos veces si se aprieta Enter mientras se guarda', async () => {
    useCajaStore.setState({ caja: caja(), cargado: true })

    let resolverVenta: (() => void) | undefined
    process.mockImplementation(
      () =>
        new Promise<{ success: boolean; ventaId: number }>((resolve) => {
          resolverVenta = () => resolve({ success: true, ventaId: 42 })
        }),
    )

    const user = await agregarUnProducto()
    // El `Enter` cobra solo si NO hay un control enfocado, y hace falta un
    // segundo: el primero arma la ventana y recién el segundo cobra, para que un
    // Enter de sincronía de impresora no dispare una venta.
    await user.click(screen.getByText('Ticket de venta'))
    await user.keyboard('{Enter}{Enter}')

    await waitFor(() => expect(process).toHaveBeenCalledTimes(1))

    // Dos Enters más con la venta todavía en vuelo.
    await user.keyboard('{Enter}{Enter}')
    expect(process).toHaveBeenCalledTimes(1)

    resolverVenta?.()
    await waitFor(() => expect(screen.getByText('El ticket 1 está vacío')).toBeTruthy())
  })
})
