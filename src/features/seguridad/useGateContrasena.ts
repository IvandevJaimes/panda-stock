import { useEffect, useState } from 'react'
import { useSettingsStore } from '../../stores/settings.store'
import { seguridadService } from '../../services/seguridad.service'

export type EstadoGate = 'chequeando' | 'acceso' | 'bloqueado'

export interface UseGateContrasena {
  estado: EstadoGate
  unlock: () => void
}

export function useGateContrasena(): UseGateContrasena {
  const [estado, setEstado] = useState<EstadoGate>('chequeando')
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    const habilitado = useSettingsStore.getState().pedidoContrasenaHabilitado
    if (!habilitado) {
      const timer = window.setTimeout(() => setEstado('acceso'))
      return () => window.clearTimeout(timer)
    }

    let cancelado = false
    seguridadService
      .tieneContrasena()
      .then((existe) => {
        if (cancelado) return
        setEstado(existe ? 'bloqueado' : 'acceso')
      })
      .catch(() => {
        if (cancelado) return
        setEstado('bloqueado')
      })

    return () => {
      cancelado = true
    }
  }, [])

  return {
    estado: unlocked ? 'acceso' : estado,
    unlock: () => setUnlocked(true),
  }
}
