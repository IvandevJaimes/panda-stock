import type { MermaReporte, ProductoPerdida, ResumenPerdidas } from './types.ts'

export type FilaMermaConCosto = Omit<
  MermaReporte,
  'costoUnitario' | 'fuenteCosto' | 'perdidaEstimada'
>

export function diferenciaArqueo(esperado: number | null, real: number | null): number | null {
  if (esperado === null || real === null) return null
  return redondearMoneda(real - esperado)
}

export function construirResumenPerdidas(filas: FilaMermaConCosto[]): ResumenPerdidas {
  const mermas: MermaReporte[] = filas.map((fila) => {
    const fuenteCostoValida = fila.fuenteCostoMerma === 'lote'
      || fila.fuenteCostoMerma === 'referencia'
    const costoSnapshotValido = fuenteCostoValida
      && fila.costoUnitarioReferencia !== null
      && Number.isFinite(fila.costoUnitarioReferencia)
      && fila.costoUnitarioReferencia >= 0
    // El costo actual del producto o del lote no permite reconstruir mermas históricas.
    const costoUnitario = costoSnapshotValido ? fila.costoUnitarioReferencia : null
    const fuenteCosto: MermaReporte['fuenteCosto'] = costoSnapshotValido
      ? fila.fuenteCostoMerma === 'lote' ? 'lote' : 'referencia'
      : 'sin_dato'
    const perdidaEstimada = costoUnitario === null
      ? null
      : redondearMoneda(Math.abs(fila.cantidad) * costoUnitario)

    const movimiento = {
      id: fila.id,
      productoId: fila.productoId,
      loteId: fila.loteId,
      ventaId: fila.ventaId,
      tipo: fila.tipo,
      cantidad: fila.cantidad,
      costoUnitarioReferencia: fila.costoUnitarioReferencia,
      fuenteCostoMerma: fila.fuenteCostoMerma,
      stockAnterior: fila.stockAnterior,
      stockPosterior: fila.stockPosterior,
      motivo: fila.motivo,
      fechaHora: fila.fechaHora,
      nombreProducto: fila.nombreProducto,
    }
    return { ...movimiento, costoUnitario, fuenteCosto, perdidaEstimada }
  })

  const grupos = new Map<number, ProductoPerdida>()
  for (const merma of mermas) {
    if (merma.productoId === null) continue
    const grupo = grupos.get(merma.productoId) ?? {
      productoId: merma.productoId,
      nombre: merma.nombreProducto,
      unidades: 0,
      unidadesSinValuar: 0,
      mermasSinValuar: 0,
      perdido: 0,
    }
    const unidades = Math.abs(merma.cantidad)
    grupo.unidades += unidades
    if (merma.perdidaEstimada === null) {
      grupo.unidadesSinValuar += unidades
      grupo.mermasSinValuar += 1
    } else {
      grupo.perdido += merma.perdidaEstimada
    }
    grupos.set(merma.productoId, grupo)
  }

  const porProducto = [...grupos.values()]
    .map((fila) => ({ ...fila, perdido: redondearMoneda(fila.perdido) }))
    .sort((a, b) => b.perdido - a.perdido)
  const sinValuar = mermas.filter((merma) => merma.perdidaEstimada === null)
  const plataPorCostoLote = sumarImportes(mermas, 'lote')
  const plataPorReferencia = sumarImportes(mermas, 'referencia')

  return {
    cantidadMermas: mermas.length,
    unidadesPerdidas: mermas.reduce((total, merma) => total + Math.abs(merma.cantidad), 0),
    cantidadSinValuar: sinValuar.length,
    unidadesSinValuar: sinValuar.reduce((total, merma) => total + Math.abs(merma.cantidad), 0),
    mermasSinProducto: mermas.filter((merma) => merma.productoId === null).length,
    plataPorCostoLote,
    plataPorReferencia,
    plataPerdida: redondearMoneda(plataPorCostoLote + plataPorReferencia),
    mermas,
    porProducto,
  }
}

function sumarImportes(mermas: MermaReporte[], fuente: 'lote' | 'referencia'): number {
  return redondearMoneda(mermas.reduce(
    (total, merma) => total + (merma.fuenteCosto === fuente ? merma.perdidaEstimada ?? 0 : 0),
    0,
  ))
}

function redondearMoneda(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}
