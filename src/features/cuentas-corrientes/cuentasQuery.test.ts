import { describe, expect, it } from 'vitest'
import type {
  ClienteConSaldo,
  MovimientoCuentaCorriente,
} from '../../../electron/db/types'
import {
  METODOS_ABONO,
  buscarClientes,
  formatearFecha,
  formatearMoneda,
  metodoDeAbonoEtiqueta,
  ordenarPorDeuda,
  origenMovimiento,
  tieneDeuda,
} from './cuentasQuery'

function cliente(over: Partial<ClienteConSaldo> = {}): ClienteConSaldo {
  return {
    id: 1,
    nombre: 'Ana Gómez',
    telefono: null,
    notas: null,
    activo: true,
    creadoEn: '2026-01-01T00:00:00.000Z',
    totalCargos: 0,
    totalAbonos: 0,
    saldo: 0,
    cantidadMovimientos: 0,
    ultimoMovimiento: null,
    ...over,
  }
}

function movimiento(
  over: Partial<MovimientoCuentaCorriente> = {},
): MovimientoCuentaCorriente {
  return {
    id: 1,
    clienteId: 1,
    tipo: 'cargo',
    monto: 100,
    ventaId: null,
    metodo: null,
    cajaId: null,
    nota: null,
    fechaHora: '2026-03-01T12:00:00.000Z',
    clienteNombre: 'Ana Gómez',
    ventaTotal: null,
    ...over,
  }
}

describe('formateo', () => {
  it('formatea la moneda con dos decimales', () => {
    expect(formatearMoneda(0)).toBe('$0.00')
    expect(formatearMoneda(1234.5)).toBe('$1234.50')
  })

  it('no rompe con una fecha inválida', () => {
    expect(typeof formatearFecha('no-es-fecha')).toBe('string')
  })
})

describe('métodos de abono', () => {
  it('no ofrece cuenta corriente como forma de pagar un abono', () => {
    expect(METODOS_ABONO.map((m) => m.metodo)).not.toContain('cuenta_corriente')
  })

  it('traduce el método y tolera el null', () => {
    expect(metodoDeAbonoEtiqueta('efectivo')).toBe('Efectivo')
    expect(metodoDeAbonoEtiqueta('debito')).toBe('Débito')
    expect(metodoDeAbonoEtiqueta(null)).toBe('—')
  })
})

describe('origen del movimiento', () => {
  it('un cargo con venta se muestra como venta', () => {
    expect(origenMovimiento(movimiento({ tipo: 'cargo', ventaId: 42 }))).toBe('Venta #42')
  })

  it('un cargo sin venta fue escrito a mano', () => {
    expect(origenMovimiento(movimiento({ tipo: 'cargo', ventaId: null }))).toBe('Carga manual')
  })

  it('un abono muestra con qué se pagó', () => {
    expect(origenMovimiento(movimiento({ tipo: 'abono', metodo: 'transferencia' }))).toBe(
      'Transferencia',
    )
  })


})

describe('búsqueda de clientes', () => {
  const lista = [
    cliente({ id: 1, nombre: 'Ana Gómez', telefono: '11 5555' }),
    cliente({ id: 2, nombre: 'Bruno Paz', telefono: null }),
    cliente({ id: 3, nombre: 'Ciro Ruiz' }),
  ]

  it('sin texto devuelve la lista entera', () => {
    expect(buscarClientes(lista, '   ')).toHaveLength(3)
  })

  it('ignora mayúsculas y acentos no importan porque busca el texto plano', () => {
    expect(buscarClientes(lista, 'bruno').map((c) => c.id)).toEqual([2])
  })

  it('busca también por teléfono', () => {
    expect(buscarClientes(lista, '5555').map((c) => c.id)).toEqual([1])
  })

  it('devuelve vacío si nada coincide', () => {
    expect(buscarClientes(lista, 'zzz')).toEqual([])
  })
})

describe('orden por deuda', () => {
  it('deja al que más debe primero', () => {
    const lista = [
      cliente({ id: 1, nombre: 'Ana', saldo: 100 }),
      cliente({ id: 2, nombre: 'Bruno', saldo: 900 }),
      cliente({ id: 3, nombre: 'Ciro', saldo: 0 }),
    ]

    expect(ordenarPorDeuda(lista).map((c) => c.id)).toEqual([2, 1, 3])
  })

  it('a igual saldo ordena por nombre', () => {
    const lista = [
      cliente({ id: 1, nombre: 'Zeta', saldo: 100 }),
      cliente({ id: 2, nombre: 'Alfa', saldo: 100 }),
    ]

    expect(ordenarPorDeuda(lista).map((c) => c.nombre)).toEqual(['Alfa', 'Zeta'])
  })

  it('no muta la lista original', () => {
    const lista = [cliente({ id: 1, saldo: 10 }), cliente({ id: 2, saldo: 99 })]
    ordenarPorDeuda(lista)

    expect(lista.map((c) => c.id)).toEqual([1, 2])
  })

  it('detecta quién tiene deuda', () => {
    expect(tieneDeuda(cliente({ saldo: 0.01 }))).toBe(true)
    expect(tieneDeuda(cliente({ saldo: 0 }))).toBe(false)
  })
})
