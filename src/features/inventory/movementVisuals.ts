import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  PackageX,
  RotateCcw,
  ShoppingCart,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TipoMovimientoStock } from '../../../electron/db/types'

export type MovimientoVisual = {
  label: string
  signo: 1 | -1
  icon: LucideIcon
  iconClases: string
  badgeClases: string
  cantidadClases: string
}

export const MOVIMIENTO_CONFIG: Record<TipoMovimientoStock, MovimientoVisual> = {
  entrada: {
    label: 'Entrada',
    signo: 1,
    icon: ArrowDownLeft,
    iconClases: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    badgeClases:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300',
    cantidadClases: 'text-emerald-600 dark:text-emerald-400',
  },
  venta: {
    label: 'Venta',
    signo: -1,
    icon: ShoppingCart,
    iconClases: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    badgeClases:
      'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300',
    cantidadClases: 'text-sky-600 dark:text-sky-400',
  },
  ajuste_positivo: {
    label: 'Ajuste positivo',
    signo: 1,
    icon: ArrowUpRight,
    iconClases: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    badgeClases:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300',
    cantidadClases: 'text-amber-600 dark:text-amber-400',
  },
  ajuste_negativo: {
    label: 'Ajuste negativo',
    signo: -1,
    icon: ArrowDownRight,
    iconClases: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    badgeClases:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300',
    cantidadClases: 'text-amber-600 dark:text-amber-400',
  },
  merma: {
    label: 'Merma',
    signo: -1,
    icon: PackageX,
    iconClases: 'bg-red-500/10 text-red-600 dark:text-red-400',
    badgeClases:
      'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300',
    cantidadClases: 'text-red-600 dark:text-red-400',
  },
  devolucion: {
    label: 'Devolución',
    signo: 1,
    icon: RotateCcw,
    iconClases: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    badgeClases:
      'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-300',
    cantidadClases: 'text-violet-600 dark:text-violet-400',
  },
}
