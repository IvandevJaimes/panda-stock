import { useEffect, useMemo } from 'react'
import { Keyboard } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { MOD_IS_META } from '../../lib/hotkeys'
import { tablaAtajos, type GrupoAtajo } from './posAtajos'

const ORDEN_GRUPOS: GrupoAtajo[] = ['Navegación', 'Ticket', 'Búsqueda', 'General']

type AyudaAtajosProps = {
  isOpen: boolean
  onClose: () => void
}

export function AyudaAtajos({ isOpen, onClose }: AyudaAtajosProps) {
  const entradas = useMemo(() => tablaAtajos(MOD_IS_META), [])

  // `F1` no llega al hook del POS: mientras el modal está abierto el listener
  // ignora todo lo que cae dentro de un diálogo, y sin esto no habría forma de
  // cerrarlo con teclado.
  useEffect(() => {
    if (!isOpen) return
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'F1') onClose()
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [isOpen, onClose])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Atajos de teclado"
      headerIcon={<Keyboard className="h-5 w-5" aria-hidden />}
      maxWidth="xl"
  
    >
      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {ORDEN_GRUPOS.map((grupo) => (
          <section key={grupo} className="flex flex-col gap-2">
            <h3 className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
              {grupo}
            </h3>

            <dl className="flex flex-col gap-1.5">
              {entradas
                .filter((entrada) => entrada.grupo === grupo)
                .map((entrada) => (
                  <div
                    key={entrada.accion}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <dt className="text-sm text-slate-600 dark:text-slate-300">
                      {entrada.rotulo}
                    </dt>
                    <dd className="shrink-0">
                      <kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {entrada.teclas}
                      </kbd>
                    </dd>
                  </div>
                ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  )
}
