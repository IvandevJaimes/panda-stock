import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

/*
  Va contra un SQLite real y no contra mocks: lo que importa acá es que las
  reglas se cumplan dentro de la transacción (que una venta rechazada no deje el
  cargo a medias, que el arqueo y el libro mayor no se contradigan). Un mock de
  drizzle probaría el mock.
*/
const carpeta = mkdtempSync(path.join(tmpdir(), 'panda-cc-test-'))
process.env.PANDA_STOCK_DB = path.join(carpeta, 'test.db')

const { initDatabase } = await import('./index.ts')
const repo = await import('./repository.ts')

let anaId = 0
let brunoId = 0
let ciroId = 0
let cajaId = 0
let productoId = 0

beforeAll(() => {
  initDatabase()

  anaId = repo.createCliente({ nombre: 'Ana Gómez', telefono: '111' }).id
  brunoId = repo.createCliente({ nombre: 'Bruno' }).id
  ciroId = repo.createCliente({ nombre: 'Ciro' }).id
  repo.archivarCliente(ciroId)

  const empleado = repo.createEmpleado({ nombre: 'Empleado CC' })
  cajaId = repo.openCaja({ responsable: 'Empleado CC', montoInicial: 0 }).id

  productoId = repo.createProducto({
    nombre: 'Producto CC',
    precioVenta: 100,
    costo: 60,
    stockActual: 100,
    stockMinimo: 0,
  }).id

  void empleado
})

function saldoDe(clienteId: number): number {
  return repo.getClientes({ incluirInactivos: true }).find((c) => c.id === clienteId)!.saldo
}

function venta(monto: number, metodo: 'efectivo' | 'cuenta_corriente', clienteId?: number) {
  return {
    cajaId,
    empleadoId: 1,
    subtotal: monto,
    descuento: 0,
    impuesto: 0,
    total: monto,
    items: [
      {
        productoId,
        tipoTarifa: 'minorista' as const,
        descripcionItem: 'Producto CC',
        cantidad: 1,
        precioUnitario: monto,
        costoUnitario: 60,
      },
    ],
    pagos: [{ metodo, monto }],
    clienteId,
  }
}

describe('clientes', () => {
  it('limpia el nombre y nace activo', () => {
    const cliente = repo.createCliente({ nombre: '  Daniela  Pérez  ' })
    expect(cliente.nombre).toBe('Daniela Pérez')
    expect(cliente.activo).toBe(true)
  })

  it('rechaza el nombre vacío', () => {
    expect(() => repo.createCliente({ nombre: '   ' })).toThrow()
  })

  it('no admite dos clientes con el mismo nombre, ignorando mayúsculas', () => {
    expect(() => repo.createCliente({ nombre: 'ana gómez' })).toThrow(/Ya existe/i)
  })

  it('archivar esconde el cliente de la lista pero no lo borra', () => {
    const daniela = repo.createCliente({ nombre: 'Temporal' })
    repo.archivarCliente(daniela.id)

    expect(repo.getClientes().some((c) => c.id === daniela.id)).toBe(false)
    expect(repo.getClientes({ incluirInactivos: true }).some((c) => c.id === daniela.id)).toBe(true)
  })

  it('crear de nuevo un cliente archivado lo reactiva en vez de duplicarlo', () => {
    const antes = repo.getClientes({ incluirInactivos: true }).length
    const reactivado = repo.createCliente({ nombre: 'Temporal' })

    expect(reactivado.activo).toBe(true)
    expect(repo.getClientes({ incluirInactivos: true }).length).toBe(antes)
  })
})

describe('saldo y libro mayor', () => {
  it('el saldo es la diferencia entre cargos y abonos', () => {
    repo.registrarCargoManual({ clienteId: anaId, monto: 1000 })
    repo.registrarCargoManual({ clienteId: anaId, monto: 500 })
    expect(saldoDe(anaId)).toBe(1500)

    repo.registrarAbono({ clienteId: anaId, monto: 400, metodo: 'efectivo', cajaId })
    expect(saldoDe(anaId)).toBe(1100)
  })

  it('un abono exacto deja el saldo en cero', () => {
    const id = repo.createCliente({ nombre: 'Exacto' }).id
    repo.registrarCargoManual({ clienteId: id, monto: 250 })
    repo.registrarAbono({ clienteId: id, monto: 250, metodo: 'efectivo', cajaId })

    expect(saldoDe(id)).toBe(0)
  })

  it('ordena la lista de mayor a menor deuda', () => {
    const lista = repo.getClientes()
    const saldos = lista.map((c) => c.saldo)

    expect(saldos).toEqual([...saldos].sort((a, b) => b - a))
  })

  it('el resumen cuadra con la suma de los saldos', () => {
    const resumen = repo.getResumenCuentasCorrientes()
    const suma = repo
      .getClientes({ incluirInactivos: true })
      .reduce((total, c) => total + c.saldo, 0)

    expect(resumen.totalPorCobrar).toBe(suma)
    expect(resumen.totalCargos - resumen.totalAbonos).toBe(suma)
  })

  it('archivar a un cliente no borra la deuda que tiene pendiente', () => {
    repo.registrarCargoManual({ clienteId: brunoId, monto: 500 })
    const totalAntes = repo.getResumenCuentasCorrientes().totalPorCobrar

    repo.archivarCliente(brunoId)

    expect(repo.getClientes().some((c) => c.id === brunoId)).toBe(false)
    expect(saldoDe(brunoId)).toBe(500)
    expect(repo.getResumenCuentasCorrientes().totalPorCobrar).toBe(totalAntes)
  })
})

describe('reglas del abono', () => {
  it('no permite pagar más que la deuda', () => {
    const id = repo.createCliente({ nombre: 'Sobrepago' }).id
    repo.registrarCargoManual({ clienteId: id, monto: 100 })

    expect(() => repo.registrarAbono({ clienteId: id, monto: 100.01, metodo: 'efectivo', cajaId })).toThrow(
      /supera la deuda/i,
    )
    expect(saldoDe(id)).toBe(100)
  })

  it('no admite montos cero ni negativos', () => {
    const id = repo.createCliente({ nombre: 'Monto' }).id
    repo.registrarCargoManual({ clienteId: id, monto: 100 })

    expect(() => repo.registrarAbono({ clienteId: id, monto: 0, metodo: 'efectivo', cajaId })).toThrow()
    expect(() => repo.registrarAbono({ clienteId: id, monto: -50, metodo: 'efectivo', cajaId })).toThrow()
  })

  it('no acepta abonos de clientes inexistentes ni archivados', () => {
    expect(() =>
      repo.registrarAbono({ clienteId: 999999, monto: 10, metodo: 'efectivo', cajaId }),
    ).toThrow(/no existe/i)

    expect(() => repo.registrarAbono({ clienteId: ciroId, monto: 10, metodo: 'efectivo', cajaId })).toThrow(
      /archivado/i,
    )
  })

  it('no acepta un abono "en cuenta corriente"', () => {
    const id = repo.createCliente({ nombre: 'Metodo invalido' }).id
    repo.registrarCargoManual({ clienteId: id, monto: 100 })

    expect(() =>
      repo.registrarAbono({ clienteId: id, monto: 10, metodo: 'cuenta_corriente' }),
    ).toThrow(/no se paga en cuenta corriente/i)
    expect(saldoDe(id)).toBe(100)
  })

  it('exige caja abierta para el abono en efectivo, para que el arqueo lo vea', () => {
    const id = repo.createCliente({ nombre: 'Sin caja' }).id
    repo.registrarCargoManual({ clienteId: id, monto: 100 })

    expect(() => repo.registrarAbono({ clienteId: id, monto: 100, metodo: 'efectivo' })).toThrow(
      /caja abierta/i,
    )
    expect(saldoDe(id)).toBe(100)
  })

  it('permite un abono sin caja si no es efectivo', () => {
    const id = repo.createCliente({ nombre: 'Sin caja pero transfiere' }).id
    repo.registrarCargoManual({ clienteId: id, monto: 100 })

    repo.registrarAbono({ clienteId: id, monto: 100, metodo: 'transferencia' })
    expect(saldoDe(id)).toBe(0)
  })
})

describe('historial', () => {
  it('filtra por cliente y viene de más nuevo a más viejo', () => {
    const id = repo.createCliente({ nombre: 'Historial' }).id
    repo.registrarCargoManual({ clienteId: id, monto: 100 })
    repo.registrarAbono({ clienteId: id, monto: 30, metodo: 'efectivo', cajaId })

    const movs = repo.getMovimientosCuentaCorriente({ clienteId: id })
    expect(movs).toHaveLength(2)
    expect(movs.every((m) => m.clienteId === id)).toBe(true)
    expect(movs.every((m) => m.clienteNombre === 'Historial')).toBe(true)
    expect(movs[0]!.tipo).toBe('abono')
  })

  it('respeta la ventana de fechas y el límite', () => {
    const id = repo.createCliente({ nombre: 'Ventana' }).id
    repo.registrarCargoManual({ clienteId: id, monto: 100 })
    const reciente = new Date(Date.now() - 60_000).toISOString()

    expect(repo.getMovimientosCuentaCorriente({ clienteId: id, desde: reciente })).toHaveLength(1)
    expect(repo.getMovimientosCuentaCorriente({ clienteId: id, hasta: reciente })).toHaveLength(0)
    expect(repo.getMovimientosCuentaCorriente({ clienteId: id, limit: 1 })).toHaveLength(1)
  })
})

describe('venta fiada', () => {
  it('deja cargada la deuda del cliente y la enlaza a la venta', () => {
    const id = repo.createCliente({ nombre: 'Fiado' }).id
    const antes = saldoDe(id)

    const { ventaId } = repo.processSale(venta(300, 'cuenta_corriente', id))

    expect(saldoDe(id)).toBe(antes + 300)

    const cargo = repo.getMovimientosCuentaCorriente({ clienteId: id }).find((m) => m.ventaId === ventaId)
    expect(cargo?.monto).toBe(300)
    expect(cargo?.tipo).toBe('cargo')
    expect(cargo?.ventaTotal).toBe(300)
    expect(cargo?.metodo).toBeNull()
  })

  it('rechaza la venta si no se sabe a quién se le fía, sin dejar nada a medias', () => {
    const ventasAntes = repo.getVentas().length
    const movimientosAntes = repo.getMovimientosCuentaCorriente().length

    expect(() => repo.processSale(venta(300, 'cuenta_corriente'))).toThrow(
      /no se indicó a qué cliente/i,
    )
    expect(repo.getVentas()).toHaveLength(ventasAntes)
    expect(repo.getMovimientosCuentaCorriente()).toHaveLength(movimientosAntes)
  })

  it('no le fía a un cliente archivado', () => {
    expect(() => repo.processSale(venta(300, 'cuenta_corriente', ciroId))).toThrow(/archivado/i)
  })
})

describe('efecto en la caja', () => {
  it('el abono en efectivo suma al arqueo', () => {
    const id = repo.createCliente({ nombre: 'Cobrador' }).id
    repo.registrarCargoManual({ clienteId: id, monto: 100 })

    const antes = repo.getCajaSummary(cajaId)
    repo.registrarAbono({ clienteId: id, monto: 100, metodo: 'efectivo', cajaId })

    const despues = repo.getCajaSummary(cajaId)
    expect(despues.totalEfectivo).toBe(antes.totalEfectivo + 100)
    expect(despues.montoEsperado).toBe(antes.montoEsperado + 100)
  })

  it('un abono por transferencia no entra al arqueo de la gaveta', () => {
    const id = repo.createCliente({ nombre: 'Transferencia' }).id
    repo.registrarCargoManual({ clienteId: id, monto: 100 })

    const antes = repo.getCajaSummary(cajaId)
    repo.registrarAbono({ clienteId: id, monto: 50, metodo: 'transferencia', cajaId })

    const despues = repo.getCajaSummary(cajaId)
    expect(despues.totalTransferencia).toBe(antes.totalTransferencia + 50)
    expect(despues.montoEsperado).toBe(antes.montoEsperado)
  })

  it('un abono con tarjeta suma a tarjeta y tampoco al arqueo', () => {
    const id = repo.createCliente({ nombre: 'Tarjeta' }).id
    repo.registrarCargoManual({ clienteId: id, monto: 100 })

    const antes = repo.getCajaSummary(cajaId)
    repo.registrarAbono({ clienteId: id, monto: 70, metodo: 'debito', cajaId })

    const despues = repo.getCajaSummary(cajaId)
    expect(despues.totalTarjeta).toBe(antes.totalTarjeta + 70)
    expect(despues.montoEsperado).toBe(antes.montoEsperado)
  })

  it('la venta fiada aparece separada del efectivo', () => {
    const id = repo.createCliente({ nombre: 'Sin plata' }).id
    const antes = repo.getCajaSummary(cajaId)

    repo.processSale(venta(500, 'cuenta_corriente', id))

    const despues = repo.getCajaSummary(cajaId)
    expect(despues.totalCuentaCorriente).toBe(antes.totalCuentaCorriente + 500)
    expect(despues.totalEfectivo).toBe(antes.totalEfectivo)
    expect(despues.montoEsperado).toBe(antes.montoEsperado)
  })
})
