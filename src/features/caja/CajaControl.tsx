import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Tooltip } from '../../components/ui/Tooltip'
import { useCajaStore } from '../../stores/caja.store'
import { AbrirCajaModal } from './AbrirCajaModal'
import { CerrarCajaModal } from './CerrarCajaModal'
import { cajaAbiertaDesde, formatearFechaHoraCorta } from './fechas'

/**
 * Un solo control para los dos estados: dos botones siempre visibles harían
 * prometer una acción que en ese momento no existe.
 */
export function CajaControl() {
  const caja = useCajaStore((state) => state.caja)
  const cargado = useCajaStore((state) => state.cargado)
  const [abrirAbierto, setAbrirAbierto] = useState(false)
  const [cerrarAbierto, setCerrarAbierto] = useState(false)

  if (!caja) {
    return (
      <>
        <Tooltip
          content={cargado ? 'Abrí la caja para poder cobrar' : 'Verificando la caja'}
        >
          <button
            type="button"
            onClick={() => {
              if (cargado) setAbrirAbierto(true)
            }}
            // `aria-disabled` y no `disabled`: el tooltip necesita hover, y un
            // botón deshabilitado no dispara eventos de puntero.
            aria-disabled={!cargado}
            aria-label="Abrir caja"
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-2.5 text-slate-600',
              'transition-colors duration-150',
              cargado ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
              'hover:bg-slate-200 hover:text-slate-900',
              'dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300',
              'dark:hover:bg-slate-800/60 dark:hover:text-white',
            )}
          >
            <ShieldCheck size={18} className="shrink-0" />
            <span className="hidden font-display text-sm font-semibold lg:inline">Abrir caja</span>
          </button>
        </Tooltip>

        <AbrirCajaModal isOpen={abrirAbierto} onClose={() => setAbrirAbierto(false)} />
      </>
    )
  }

  return (
    <>
      <Tooltip content={cajaAbiertaDesde(caja)}>
        <button
          type="button"
          onClick={() => setCerrarAbierto(true)}
          aria-label={`Caja abierta por ${caja.empleadoNombre}. Ver y cerrar caja`}
          className={cn(
            'inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5',
            'font-display text-sm font-semibold text-emerald-700 transition-colors duration-150',
            'hover:bg-emerald-500/20 hover:text-emerald-800',
            'dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-400',
            'dark:hover:bg-emerald-500/25 dark:hover:text-emerald-300',
          )}
        >
          <ShieldCheck size={18} className="shrink-0" aria-hidden="true" />
          <span className="hidden max-w-[9rem] truncate lg:inline">{caja.empleadoNombre}</span>
          <span className="hidden text-[11px] tabular-nums opacity-70 xl:inline">
            {formatearFechaHoraCorta(caja.fechaApertura)}
          </span>
        </button>
      </Tooltip>

      <CerrarCajaModal
        isOpen={cerrarAbierto}
        caja={caja}
        onClose={() => setCerrarAbierto(false)}
      />
    </>
  )
}
