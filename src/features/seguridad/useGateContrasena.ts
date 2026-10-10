import { useState } from 'react'
import { useSettingsStore } from '../../stores/settings.store'
import type { ClaveProteccion } from '../../types/security'

export type EstadoGate = 'chequeando' | 'acceso' | 'bloqueado'

export interface UseGateContrasena {
  estado: EstadoGate
  unlock: () => void
}

export function useGateContrasena(proteccion: ClaveProteccion): UseGateContrasena {
  const protegido = useSettingsStore((state) => state.proteccionesSeguridad[proteccion])
  const cargadas = useSettingsStore((state) => state.proteccionesCargadas)
  const contrasenaConfigurada = useSettingsStore((state) => state.contrasenaConfigurada)
  const [unlocked, setUnlocked] = useState(false)
  const estado: EstadoGate = !cargadas
    ? 'chequeando'
    : !protegido || !contrasenaConfigurada || unlocked
      ? 'acceso'
      : 'bloqueado'

  return {
    estado,
    unlock: () => setUnlocked(true),
  }
}
