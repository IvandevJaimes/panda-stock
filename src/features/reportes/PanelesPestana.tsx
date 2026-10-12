import type { ReportesSummary } from '../../../electron/db/types'
import { filasMovimientos } from './metricasPestana'
import { MovimientosRecientes } from './MovimientosRecientes'

export function MovimientosPanel({
  resumen,
  desde,
  hasta,
  buscarInicial,
}: {
  resumen: ReportesSummary | null
  desde: string | null
  hasta: string | null
  buscarInicial?: string
}) {
  const filas = filasMovimientos(resumen)

  return (
    <MovimientosRecientes
      desde={desde}
      hasta={hasta}
      filasPorTipo={filas}
      buscarInicial={buscarInicial}
    />
  )
}
