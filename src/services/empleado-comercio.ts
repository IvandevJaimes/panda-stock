import { useSettingsStore } from '../stores/settings.store'
import { empleadosService } from './empleados.service'

/** Misma regla que `normalizarNombre` en el backend, para que la comparación
 * de "PANDA STOCK" vs "Panda Stock" no cree un empleado duplicado. */
function normalizarNombre(nombre: string): string {
  return nombre
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/**
 * Ventas sin caja: `ventas.empleado_id` es NOT NULL en la base, así que la
 * venta se imputa a un empleado con el nombre del comercio. Si no existe,
 * se crea una vez; si está desactivado, se reactiva (igual que `openCaja`).
 */
export async function resolverEmpleadoDelComercio(): Promise<number> {
  const nombre = useSettingsStore
    .getState()
    .storeName.trim()
    .replace(/\s+/g, ' ')
  if (!nombre) {
    throw new Error(
      'Cargá el nombre del comercio en Configuración para registrar la venta',
    )
  }

  const clave = normalizarNombre(nombre)
  const existente = (await empleadosService.getAll()).find(
    (empleado) => normalizarNombre(empleado.nombre) === clave,
  )

  if (existente) {
    if (!existente.activo) await empleadosService.toggle(existente.id, true)
    return existente.id
  }

  const creado = await empleadosService.create(nombre)
  return creado.id
}
