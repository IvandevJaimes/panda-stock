import { lazy, Suspense } from 'react'
import { LoadingState } from '../../components/ui/LoadingState'

/**
 * Reportes entra por `lazy` porque arrastra Recharts, que son ~424 kB minificados.
 * Como la app arranca en `/pos`, cargarlo en el bundle inicial obligaría a
 * parsear la librería de gráficos en cada arranque aunque nunca se abra un
 * reporte.
 *
 * Va en su propio archivo a propósito: la regla de fast-refresh no permite
 * mixing de exports de componentes y no-componentes en el mismo módulo.
 */
const ReportesPage = lazy(() =>
  import('./Page').then((mod) => ({ default: mod.ReportesPage })),
)

export function ReportesRoute() {
  return (
    <Suspense fallback={<LoadingState title="Cargando reportes..." />}>
      <ReportesPage />
    </Suspense>
  )
}