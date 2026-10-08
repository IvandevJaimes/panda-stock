import { Navigate, useNavigate } from 'react-router-dom'
import { useSettingsStore } from '../../stores/settings.store'
import { seguridadService } from '../../services/seguridad.service'
import { ModalContrasena } from '../seguridad/ModalContrasena'
import { useGateContrasena } from '../seguridad/useGateContrasena'
import { CuentasCorrientesPage } from './Page'

/**
 * Gate de la pestaña: con la cuenta corriente desactivada en ajustes, la
 * pantalla no existe — entrar por URL (o por un link viejo) manda al POS.
 * Con la cuenta corriente activa, exige la contraseña (un desbloqueo por
 * visita: al salir de la ruta se vuelve a pedir).
 */
export function CuentasCorrientesRoute() {
  const habilitada = useSettingsStore((estado) => estado.cuentaCorrienteHabilitada)
  const { estado, unlock } = useGateContrasena()
  const navigate = useNavigate()

  if (!habilitada) return <Navigate to="/pos" replace />

  if (estado === 'chequeando') return null

  if (estado === 'bloqueado') {
    return (
      <ModalContrasena
        titulo="Cuentas corrientes bloqueadas"
        subtitulo="Ingresá tu contraseña para verlas."
        onSubmit={(contrasena) => seguridadService.verifyPin(contrasena)}
        onSuccess={unlock}
        onCancelar={() => navigate('/pos', { replace: true })}
      />
    )
  }

  return <CuentasCorrientesPage />
}