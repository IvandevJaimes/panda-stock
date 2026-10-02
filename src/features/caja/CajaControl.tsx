import { useCallback, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { cn } from '../../lib/cn'
import { MOD_TEXTO, modAtajo } from '../../lib/hotkeys'
import { Tooltip } from '../../components/ui/Tooltip'
import { useHotkey } from '../../hooks/useHotkey'
import { useCajaStore } from '../../stores/caja.store'
import { AbrirCajaModal } from './AbrirCajaModal'
import { CerrarCajaModal } from './CerrarCajaModal'
import { cajaAbiertaPor } from './fechas'

/**
 * Un solo control para los dos estados: dos botones siempre visibles harían
 * prometer una acción que en ese momento no existe.
 */
export function CajaControl() {
  const caja = useCajaStore((state) => state.caja)
  const cargado = useCajaStore((state) => state.cargado)
  const salidaPendiente = useCajaStore((state) => state.salidaPendiente)
  const cancelarCierre = useCajaStore((state) => state.cancelarCierre)
  const [abrirAbierto, setAbrirAbierto] = useState(false)
  const [cerrarAbierto, setCerrarAbierto] = useState(false)

  // El cierre pedido desde el aviso de salida reutiliza este mismo modal en vez
  // de montar una segunda copia: el arqueo es uno solo y tener dos montados haría
  // que el `CerrarCajaModal` del aviso leyera los tickets mientras este ya cerró.
  const cerrarVisible = cerrarAbierto || salidaPendiente

  const cerrarModal = useCallback(() => {
    setCerrarAbierto(false)
    cancelarCierre()
  }, [cancelarCierre])

  const abrirModal = useCallback(() => {
    if (caja) {
      // Si el arqueo ya está a la vista —abierto a mano o pedido por el aviso de
      // salida— el atajo no vuelve a setear el estado: no hay nada que cambiar y
      // un `setState` de más descarta los tickets leídos por el resumen.
      if (!cerrarVisible) setCerrarAbierto(true)
      return
    }
    if (cargado && !abrirAbierto) setAbrirAbierto(true)
  }, [caja, cargado, cerrarVisible, abrirAbierto])

  // Va antes de los cortes de render para que un solo hook cubra los dos estados.
  // `ignoreInputs: false` porque el atajo tiene que servir también con el cursor
  // en el buscador: si no, el cajero vuelve a tener que apuntar con el mouse.
  useHotkey('mod+c', abrirModal, { ignoreInputs: false })

  if (!caja) {
    return (
      <>
        <Tooltip
          content={
            cargado
              ? `Abrí la caja para poder cobrar · ${MOD_TEXTO}+C`
              : 'Verificando la caja'
          }
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
            aria-keyshortcuts={modAtajo('C')}
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
      <Tooltip content={`${cajaAbiertaPor(caja)} · ${MOD_TEXTO}+C`}>
        <button
          type="button"
          onClick={() => setCerrarAbierto(true)}
          aria-label={`Caja abierta por ${caja.empleadoNombre}. Ver y cerrar caja`}
          aria-keyshortcuts={modAtajo('C')}
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
          {/*
            El pulso dice "hay un turno corriendo ahora". Va al final, después del
            nombre, para que se lea como el estado del cajero y no como otro
            elemento de identidad. `motion-reduce` lo apaga porque un parpadeo
            infinito es un problema real para quien tiene Disorder de Procesamiento
            Visual.
          */}
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none dark:bg-emerald-400"
          />
        </button>
      </Tooltip>

      <CerrarCajaModal
        isOpen={cerrarVisible}
        caja={caja}
        onClose={cerrarModal}
        alCerrar={salidaPendiente ? () => void window.electronAPI.app.salir() : undefined}
      />
    </>
  )
}
