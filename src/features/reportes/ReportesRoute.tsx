import { lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoadingState } from '../../components/ui/LoadingState'
import { seguridadService } from '../../services/seguridad.service'
import { ModalContrasena } from '../seguridad/ModalContrasena'
import { useGateContrasena } from '../seguridad/useGateContrasena'

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
  const { estado, unlock } = useGateContrasena()
  const navigate = useNavigate()

  if (estado === 'chequeando') {
    return <LoadingState title="Verificando..." />
  }

  if (estado === 'bloqueado') {
    return (
      <ModalContrasena
        titulo="Reportes bloqueados"
        subtitulo="Ingresá tu contraseña para verlos."
        onSubmit={(contrasena) => seguridadService.verifyPin(contrasena)}
        onSuccess={unlock}
        onCancelar={() => navigate('/pos', { replace: true })}
      />
    )
  }

  return (
    <Suspense fallback={<LoadingState title="Cargando reportes..." />}>
      <ReportesPage />
    </Suspense>
  )
}