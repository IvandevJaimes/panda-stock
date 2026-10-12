import { useState } from 'react'
import { toast } from 'sonner'
import type { Cliente } from '../../../electron/db/types'
import { Switch } from '../../components/ui/Switch'
import { Tooltip } from '../../components/ui/Tooltip'
import { cuentasCorrientesService } from '../../services/cuentas-corrientes.service'

interface ToggleActivoClienteProps {
  cliente: Pick<Cliente, 'id' | 'nombre' | 'activo'>
  onChanged?: () => void
  onDesactivado?: () => void
}

export function ToggleActivoCliente({
  cliente,
  onChanged,
  onDesactivado,
}: ToggleActivoClienteProps) {
  const [activo, setActivo] = useState(cliente.activo)
  const [guardando, setGuardando] = useState(false)

  const handleToggle = (nuevo: boolean) => {
    if (guardando) return
    setGuardando(true)
    setActivo(nuevo)
    cuentasCorrientesService
      .toggleCliente(cliente.id, nuevo)
      .then(() => {
        toast.success(nuevo ? `Cliente "${cliente.nombre}" activado` : `Cliente "${cliente.nombre}" desactivado`)
        onChanged?.()
        if (!nuevo) onDesactivado?.()
      })
      .catch((error: unknown) => {
        setActivo(!nuevo)
        toast.error(error instanceof Error ? error.message : 'No se pudo cambiar el estado del cliente')
      })
      .finally(() => setGuardando(false))
  }

  return (
    <div className="flex items-center gap-2">
      <span className={activo
        ? 'text-xs font-semibold text-emerald-600 dark:text-emerald-400'
        : 'text-xs font-semibold text-slate-400 dark:text-slate-500'}>
        {activo ? 'Activo' : 'Inactivo'}
      </span>
      <Tooltip
        content={activo
          ? 'Desactivar: el cliente deja de aparecer entre los clientes activos'
          : 'Activar: el cliente vuelve a aparecer entre los clientes activos'}
        placement="bottom"
      >
        <span>
          <Switch
            checked={activo}
            onCheckedChange={handleToggle}
            disabled={guardando}
            id={`toggle-activo-cliente-${cliente.id}`}
            ariaLabel={`${activo ? 'Desactivar' : 'Activar'} cliente ${cliente.nombre}`}
          />
        </span>
      </Tooltip>
    </div>
  )
}
