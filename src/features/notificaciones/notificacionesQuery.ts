import type { ProductoConLoteActivo } from '../../../electron/db/types'
import { evaluateExpiry } from '../../lib/dateUtils'
import { DIAS_POR_VENCER } from '../pos/posQuery'

export type TipoNotificacion =
  | 'vencido'
  | 'por_vencer'
  | 'stock_agotado'
  | 'stock_bajo'

export type SeveridadNotificacion = 'critica' | 'advertencia'

export interface Notificacion {
  /** `${tipo}:${productoId}`: un producto puede tener varias a la vez. */
  id: string
  tipo: TipoNotificacion
  severidad: SeveridadNotificacion
  productoId: number
  producto: string
  /** Foto del producto para el thumbnail del desplegable. */
  imgPath: string | null
  /** Término con el que Inventario acota la grilla a este producto (?q=). */
  termino: string
  titulo: string
  detalle: string | null
  /**
   * Stock al momento de generar la alerta. El store lo guarda cuando el usuario
   * cierra la notificación: mientras el stock no baje de ese valor, no vuelve.
   */
  stockActual: number
}

/** Críticas primero; dentro de cada severidad, vencimientos antes que stock. */
const PRIORIDAD: Record<TipoNotificacion, number> = {
  vencido: 0,
  stock_agotado: 1,
  por_vencer: 2,
  stock_bajo: 3,
}

const SEVERIDAD: Record<TipoNotificacion, SeveridadNotificacion> = {
  vencido: 'critica',
  stock_agotado: 'critica',
  por_vencer: 'advertencia',
  stock_bajo: 'advertencia',
}

/**
 * Las fechas llegan en el formato que guardó SQLite (`YYYY-MM-DD` o
 * `DD/MM/YYYY`); `evaluateExpiry` ya las normaliza a medianoche local.
 */
export function deriveNotificaciones(
  productos: ProductoConLoteActivo[],
): Notificacion[] {
  const conClave: { notificacion: Notificacion; clave: number }[] = []

  for (const producto of productos) {
    if (!producto.activo) continue

    const termino = producto.codigoInterno?.trim() || producto.nombre
    const base = {
      productoId: producto.id,
      producto: producto.nombre,
      imgPath: producto.imgPath,
      termino,
      stockActual: producto.stockActual,
    }

    const vencimiento = evaluateExpiry(
      producto.loteActivoVencimiento ?? undefined,
      DIAS_POR_VENCER,
    )

    if (vencimiento?.status === 'expired') {
      conClave.push({
        clave: vencimiento.daysDiff,
        notificacion: {
          id: `vencido:${producto.id}`,
          tipo: 'vencido',
          severidad: SEVERIDAD.vencido,
          ...base,
          titulo: vencimiento.relativeText,
          detalle: vencimiento.formattedDate,
        },
      })
    } else if (vencimiento?.status === 'expiring_soon') {
      conClave.push({
        clave: vencimiento.daysDiff,
        notificacion: {
          id: `por_vencer:${producto.id}`,
          tipo: 'por_vencer',
          severidad: SEVERIDAD.por_vencer,
          ...base,
          titulo: vencimiento.relativeText,
          detalle: vencimiento.formattedDate,
        },
      })
    }

    if (producto.stockActual <= 0) {
      conClave.push({
        clave: 0,
        notificacion: {
          id: `stock_agotado:${producto.id}`,
          tipo: 'stock_agotado',
          severidad: SEVERIDAD.stock_agotado,
          ...base,
          titulo: 'Stock agotado',
          detalle: null,
        },
      })
    } else if (producto.stockActual < producto.stockMinimo) {
      conClave.push({
        // Negativo: el mayor déficit primero.
        clave: -(producto.stockMinimo - producto.stockActual),
        notificacion: {
          id: `stock_bajo:${producto.id}`,
          tipo: 'stock_bajo',
          severidad: SEVERIDAD.stock_bajo,
          ...base,
          titulo: 'Stock bajo',
          detalle: `${producto.stockActual} de mínimo ${producto.stockMinimo}`,
        },
      })
    }
  }

  return conClave
    .sort(
      (a, b) =>
        PRIORIDAD[a.notificacion.tipo] - PRIORIDAD[b.notificacion.tipo] ||
        a.clave - b.clave ||
        a.notificacion.producto.localeCompare(b.notificacion.producto),
    )
    .map((entrada) => entrada.notificacion)
}

export function idsDe(notificaciones: Notificacion[]): string[] {
  return notificaciones.map((notificacion) => notificacion.id)
}

/** Las que no estaban en el listado previo: solo ellas deben sonar. */
export function notificacionesNuevas(
  anteriores: Notificacion[],
  actuales: Notificacion[],
): Notificacion[] {
  const previas = new Set(idsDe(anteriores))
  return actuales.filter((notificacion) => !previas.has(notificacion.id))
}
