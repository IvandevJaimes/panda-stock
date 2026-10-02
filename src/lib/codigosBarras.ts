import type { ConflictoCodigo } from '../../electron/db/types'
import { toast } from 'sonner'

/**
 * Longitud mínima que obliga a considerar "terminado" el último token de la
 * lista cuando todavía no se escribió la coma separadora. Coincide con la
 * longitud mínima que exige el lector de código de barras para validar un scan.
 */
const MIN_LONGITUD_VERIFICACION = 4

/** Separa una lista CSV de códigos en tokens únicos, recortados y sin vacíos. */
export function separarCodigos(csv: string): string[] {
  return Array.from(
    new Set(
      csv
        .split(',')
        .map((codigo) => codigo.trim())
        .filter(Boolean),
    ),
  )
}

/**
 * Códigos candidatos a verificar en vivo mientras se escribe:
 * los tokens ya cerrados con coma más el último si parece un código completo.
 * Esto evita marcar error en un prefijo a medio teclear (ej. "77912" de 13 dígitos).
 */
export function obtenerCodigosParaVerificacion(csv: string): string[] {
  const tokens = separarCodigos(csv)
  if (tokens.length === 0) return []
  const terminaEnComa = /,\s*$/.test(csv)
  if (terminaEnComa) return tokens
  const ultimo = tokens[tokens.length - 1]
  const completos = tokens.slice(0, -1)
  if (ultimo.length >= MIN_LONGITUD_VERIFICACION) completos.push(ultimo)
  return completos
}

/** Mensaje legible ante conflictos de códigos de barra, o null si no hay. */
export function formatearConflictos(conflictos: ConflictoCodigo[]): string | null {
  if (conflictos.length === 0) return null
  if (conflictos.length === 1) {
    const conflicto = conflictos[0]
    return `El código "${conflicto.codigo}" ya está asociado a "${conflicto.producto}"`
  }
  return `Códigos ya en uso en otros productos: ${conflictos
    .map((conflicto) => `"${conflicto.codigo}" → "${conflicto.producto}"`)
    .join(' | ')}`
}

/**
 * Id estable del toast de "código ya en uso": con él el toast se reemplaza en
 * vez de apilarse mientras el usuario corrige el campo.
 */
const TOAST_CODIGO_EN_USO = 'codigo-en-uso'

/** Muestra (o actualiza) el toast de código de barra ya en uso por otro producto. */
export function toastCodigoEnUso(mensaje: string): void {
  toast.error(mensaje, { id: TOAST_CODIGO_EN_USO })
}

/** Oculta el toast de código en uso (por ejemplo, al corregir el campo). */
export function dismissCodigoEnUso(): void {
  toast.dismiss(TOAST_CODIGO_EN_USO)
}